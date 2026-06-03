import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitAvailabilityUpdate } from '@/lib/realtime';

export async function POST(req: Request) {
    try {
        const salonData = await req.json();
        console.log('[API] Update Salon Payload:', JSON.stringify({ 
            id: salonData.id, 
            serviceCount: salonData.services?.length,
            services: salonData.services?.map((s: any) => s.name)
        }));
        
        const { id, practitioners, services, ...salonInfo } = salonData;

        if (!id) {
            return NextResponse.json({ error: 'Salon ID is required' }, { status: 400 });
        }

        // 1. Update Salon basic info
        let realSalonId = id;
        try {
            // Try find by ID first
            let existing = await prisma.salon.findUnique({ where: { id } });
            
            // If not found by ID, maybe it's found by SLUG?
            if (!existing && salonInfo.slug) {
                existing = await prisma.salon.findUnique({ where: { slug: salonInfo.slug } });
            }

            // Combine category (primary) and categories (additional) into a single JSON array
            const allCategories = Array.from(new Set([
                ...(salonInfo.category ? [salonInfo.category] : []),
                ...(Array.isArray(salonInfo.categories) ? salonInfo.categories : [])
            ])).filter(Boolean);

            let finalAvailability = salonInfo.availability !== undefined ? salonInfo.availability : (existing ? existing.availability : []);
            if (salonInfo.openingHoursSettings) {
                const currentAvail = Array.isArray(finalAvailability) ? finalAvailability : [];
                const filteredAvail = currentAvail.filter((a: any) => a && a.type !== 'settings');
                finalAvailability = [...filteredAvail, salonInfo.openingHoursSettings];
            }

            const updateData = {
                name: salonInfo.name,
                description: salonInfo.description,
                address: salonInfo.address,
                city: salonInfo.city,
                municipality: salonInfo.municipality,
                country: salonInfo.country,
                slug: salonInfo.slug,
                category: salonInfo.category,
                categories: salonInfo.categories !== undefined ? salonInfo.categories : (existing ? existing.categories : []),
                // 🎯 Race-Condition Protection: Fall back to existing database assets if payload is empty/null
                logo_url: salonInfo.profileImage || salonInfo.logo_url || (existing ? existing.logo_url : null),
                banner_url: salonInfo.backgroundImage || salonInfo.banner_url || (existing ? existing.banner_url : null),
                gallery_images: (salonInfo.galleryImages && salonInfo.galleryImages.length > 0) 
                    ? salonInfo.galleryImages 
                    : (salonInfo.gallery_images && salonInfo.gallery_images.length > 0)
                        ? salonInfo.gallery_images
                        : (existing ? existing.gallery_images : []),
                membership_tier: (salonInfo.tier || salonInfo.membership_tier || (existing ? existing.membership_tier : 'bas')).toLowerCase(),
                availability: finalAvailability,
                duration: salonInfo.duration !== undefined ? parseInt(salonInfo.duration) : undefined,
                cancellation_window_hours: salonInfo.cancellation_window_hours !== undefined ? parseInt(salonInfo.cancellation_window_hours) : 24,
                is_verified: salonInfo.isVerified !== undefined ? salonInfo.isVerified : (existing ? existing.is_verified : false),
                verification_requested: salonInfo.verification_requested !== undefined ? salonInfo.verification_requested : (existing ? existing.verification_requested : false),
                verified_categories: salonInfo.verifiedCategories !== undefined ? salonInfo.verifiedCategories : (existing ? existing.verified_categories : []),
                onboarding_progress: salonInfo.onboardingProgress !== undefined ? salonInfo.onboardingProgress : (existing ? existing.onboarding_progress : null),
                stripe_account_id: salonInfo.stripe_account_id !== undefined ? salonInfo.stripe_account_id : (existing ? existing.stripe_account_id : null)
            };

            if (existing) {
                realSalonId = existing.id; // Use the real DB record ID
                const updatedSalon = await prisma.salon.update({
                    where: { id: existing.id },
                    data: updateData
                });

                // 1.1 Update Owner Profile if info changed
                if (updatedSalon.owner_id && (salonInfo.firstName || salonInfo.lastName || salonInfo.email || salonInfo.phone !== undefined)) {
                    await prisma.profile.update({
                        where: { id: updatedSalon.owner_id },
                        data: {
                            first_name: salonInfo.firstName || undefined,
                            last_name: salonInfo.lastName || undefined,
                            email: salonInfo.email || undefined,
                            phone: salonInfo.phone || undefined
                        }
                    });
                }
            } else {
                const newSalon = await prisma.salon.create({
                    data: { 
                        ...updateData, 
                        id,
                        subscription_status: salonInfo.subscription_status || 'active'
                    }
                });
                realSalonId = newSalon.id;

                // 1.1 Update Owner Profile if info changed
                if (newSalon.owner_id && (salonInfo.firstName || salonInfo.lastName || salonInfo.email || salonInfo.phone !== undefined)) {
                    await prisma.profile.update({
                        where: { id: newSalon.owner_id },
                        data: {
                            first_name: salonInfo.firstName || undefined,
                            last_name: salonInfo.lastName || undefined,
                            email: salonInfo.email || undefined,
                            phone: salonInfo.phone || undefined
                        }
                    });
                }
            }

        } catch (salonError) {
             console.error('Error syncing salon record:', salonError);
             return NextResponse.json({ error: `Failed to update salon info: ${salonError}` }, { status: 500 });
        }

        // 2. Sync Practitioners
        if (practitioners && Array.isArray(practitioners)) {
            const tierStr = (salonInfo.tier || salonInfo.membership_tier || 'bas').toLowerCase();
            let finalPractitioners = practitioners;
            if (tierStr !== 'luxe' && practitioners.length > 1) {
                // If not LUXE, strictly limit to 1 practitioner
                finalPractitioners = [practitioners[0]];
            }
            const processedPractitionerIds: string[] = [];
            for (const p of finalPractitioners) {
                try {
                    const pid = p.id && p.id.length > 20 ? p.id : undefined;
                    const pData = {
                        salon_id: realSalonId,
                        name: p.name || 'Personal',
                        role: p.role || 'Stylist',
                        title: p.title || '',
                        image_url: p.image_url || p.image || null,
                        schedule: p.schedule,
                        status: p.status || 'active',
                        categories: p.categories
                    };

                    let upserted;
                    if (pid) {
                        upserted = await prisma.practitioner.upsert({
                            where: { id: pid },
                            update: pData,
                            create: { ...pData, id: pid }
                        });
                    } else {
                        upserted = await prisma.practitioner.create({
                            data: pData
                        });
                    }
                    if (upserted?.id) processedPractitionerIds.push(upserted.id);
                } catch (pError) {
                    console.error('Error syncing practitioner:', pError);
                }
            }

            await prisma.practitioner.deleteMany({
                where: {
                    salon_id: realSalonId,
                    id: { notIn: processedPractitionerIds }
                }
            });
        }

        // 3. Sync Services
        if (services && Array.isArray(services)) {
            const processedServiceIds: string[] = [];

            for (const s of services) {
                 try {
                     const sid = s.id && s.id.length > 20 ? s.id : undefined;
                     const price = parseFloat(s.price);
                     const salePrice = (s.sale_price !== null && s.sale_price !== undefined) ? parseFloat(s.sale_price) : 
                                      (s.salePrice !== null && s.salePrice !== undefined) ? parseFloat(s.salePrice) : null;
                     
                     const serviceData = {
                        salon_id: realSalonId,
                        name: s.name || 'Namnlös tjänst',
                        description: s.description || '',
                        price: isNaN(price) ? 0 : price,
                        sale_price: (salePrice !== null && isNaN(salePrice)) ? null : salePrice,
                        sale_ends_at: (s.sale_ends_at || s.saleEndsAt) ? new Date(s.sale_ends_at || s.saleEndsAt) : null,
                        duration_minutes: parseInt(s.duration) || 30,
                        category: s.category || ''
                     };

                     let upserted;
                     if (sid) {
                         upserted = await prisma.service.upsert({
                             where: { id: sid },
                             update: serviceData,
                             create: { ...serviceData, id: sid }
                         });
                     } else {
                         upserted = await prisma.service.create({
                             data: serviceData
                         });
                     }
                     if (upserted?.id) processedServiceIds.push(upserted.id);
                 } catch (sError) {
                     console.error('Error syncing service:', sError);
                 }
            }

            await prisma.service.deleteMany({
                where: {
                    salon_id: realSalonId,
                    id: { notIn: processedServiceIds }
                }
            });
        }

        // Trigger real-time availability update for client pages
        emitAvailabilityUpdate(realSalonId, { salonId: realSalonId });

        return NextResponse.json({ success: true, salonId: realSalonId });
    } catch (error: any) {
        console.error('Update Salon API Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

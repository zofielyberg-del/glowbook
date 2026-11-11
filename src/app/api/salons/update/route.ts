import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitAvailabilityUpdate } from '@/lib/realtime';
import { slugifySalonName } from '@/lib/slug';

const METADATA_AVAILABILITY_TYPES = new Set(['reviews', 'hidden_customers', 'settings']);

async function resolveUniqueSlug(baseRaw: string, excludeSalonId?: string): Promise<string> {
    const base = slugifySalonName(baseRaw) || `studio-${Date.now().toString(36)}`;
    const conflict = await prisma.salon.findFirst({
        where: {
            slug: base,
            ...(excludeSalonId ? { id: { not: excludeSalonId } } : {}),
        },
        select: { id: true },
    });
    if (!conflict) return base;

    const suffix = excludeSalonId ? excludeSalonId.replace(/[^a-z0-9]/gi, '').slice(-4).toLowerCase() : Date.now().toString(36).slice(-4);
    const candidate = `${base}-${suffix}`;
    const secondConflict = await prisma.salon.findFirst({
        where: {
            slug: candidate,
            ...(excludeSalonId ? { id: { not: excludeSalonId } } : {}),
        },
        select: { id: true },
    });
    return secondConflict ? `${base}-${Date.now().toString(36).slice(-5)}` : candidate;
}

export async function POST(req: Request) {
    try {
        const salonData = await req.json();
        const { id, practitioners, services, ...salonInfo } = salonData;

        if (!id) {
            return NextResponse.json({ error: 'Salon ID is required' }, { status: 400 });
        }

        let realSalonId = id;
        let resolvedSlug: string | undefined;

        try {
            // Find only by exact ID first; only allow slug lookup if `id` is not a UUID (legacy/draft IDs)
            const isUuid = typeof id === 'string' && id.length > 30;
            let existing = await prisma.salon.findUnique({ where: { id } });
            if (!existing && !isUuid && salonInfo.slug) {
                existing = await prisma.salon.findUnique({ where: { slug: salonInfo.slug } });
            }

            // Preserve server-side metadata blocks (reviews, hidden_customers, settings) when calendar saves frames
            const existingAvail = Array.isArray(existing?.availability) ? (existing.availability as any[]) : [];
            let finalAvailability = existingAvail;

            if (salonInfo.availability !== undefined) {
                const incomingAvail = Array.isArray(salonInfo.availability) ? salonInfo.availability : [];
                const incomingTypes = new Set(incomingAvail.map((a: any) => a?.type).filter(Boolean));
                const preservedMeta = existingAvail.filter((a: any) => {
                    if (!a || !METADATA_AVAILABILITY_TYPES.has(a.type)) return false;
                    // If incoming has a newer block for this metadata type (or openingHoursSettings overrides settings), prefer incoming
                    if (a.type === 'settings' && salonInfo.openingHoursSettings) return false;
                    return !incomingTypes.has(a.type);
                });
                finalAvailability = [...incomingAvail, ...preservedMeta];
            }

            if (salonInfo.openingHoursSettings) {
                const currentAvail = Array.isArray(finalAvailability) ? finalAvailability : [];
                const filteredAvail = currentAvail.filter((a: any) => a && a.type !== 'settings');
                finalAvailability = [...filteredAvail, salonInfo.openingHoursSettings];
            }

            const rawSlugSource = salonInfo.slug || (salonInfo.name ? salonInfo.name : existing?.slug) || '';
            resolvedSlug = rawSlugSource
                ? await resolveUniqueSlug(rawSlugSource, existing?.id || (isUuid ? id : undefined))
                : existing?.slug || undefined;

            const parsedCancelWindow =
                salonInfo.cancellation_window_hours !== undefined && salonInfo.cancellation_window_hours !== null
                    ? parseInt(String(salonInfo.cancellation_window_hours), 10)
                    : (existing?.cancellation_window_hours ?? 24);

            const updateData: any = {
                name: salonInfo.name !== undefined ? salonInfo.name : existing?.name,
                description: salonInfo.description !== undefined ? salonInfo.description : existing?.description,
                address: salonInfo.address !== undefined ? salonInfo.address : existing?.address,
                city: salonInfo.city !== undefined ? salonInfo.city : existing?.city,
                municipality: salonInfo.municipality !== undefined ? salonInfo.municipality : existing?.municipality,
                country: salonInfo.country !== undefined ? salonInfo.country : existing?.country,
                slug: resolvedSlug,
                category: salonInfo.category !== undefined ? salonInfo.category : existing?.category,
                categories: salonInfo.categories !== undefined ? salonInfo.categories : (existing ? existing.categories : []),
                disclaimer: salonInfo.disclaimer !== undefined ? salonInfo.disclaimer : (existing ? (existing as any).disclaimer : null),
                instagram_url: salonInfo.instagramUrl !== undefined ? salonInfo.instagramUrl : (salonInfo.instagram_url !== undefined ? salonInfo.instagram_url : (existing ? (existing as any).instagram_url : null)),
                facebook_url: salonInfo.facebookUrl !== undefined ? salonInfo.facebookUrl : (salonInfo.facebook_url !== undefined ? salonInfo.facebook_url : (existing ? (existing as any).facebook_url : null)),
                tiktok_url: salonInfo.tiktokUrl !== undefined ? salonInfo.tiktokUrl : (salonInfo.tiktok_url !== undefined ? salonInfo.tiktok_url : (existing ? (existing as any).tiktok_url : null)),
                logo_url: salonInfo.profileImage || salonInfo.logo_url || (existing ? existing.logo_url : null),
                banner_url: salonInfo.backgroundImage || salonInfo.banner_url || (existing ? existing.banner_url : null),
                gallery_images: (salonInfo.galleryImages && salonInfo.galleryImages.length > 0)
                    ? salonInfo.galleryImages
                    : (salonInfo.gallery_images && salonInfo.gallery_images.length > 0)
                        ? salonInfo.gallery_images
                        : (existing ? existing.gallery_images : []),
                membership_tier: (salonInfo.tier || salonInfo.membership_tier || (existing ? existing.membership_tier : 'bas')).toLowerCase(),
                availability: finalAvailability,
                duration: salonInfo.duration !== undefined ? parseInt(String(salonInfo.duration), 10) : existing?.duration,
                cancellation_window_hours: Number.isNaN(parsedCancelWindow) ? 24 : parsedCancelWindow,
                is_verified: salonInfo.isVerified !== undefined ? salonInfo.isVerified : (existing ? existing.is_verified : false),
                verification_requested: salonInfo.verification_requested !== undefined ? salonInfo.verification_requested : (existing ? existing.verification_requested : false),
                verified_categories: salonInfo.verifiedCategories !== undefined ? salonInfo.verifiedCategories : (existing ? existing.verified_categories : []),
                onboarding_progress: salonInfo.onboardingProgress !== undefined ? salonInfo.onboardingProgress : (existing ? existing.onboarding_progress : null),
                stripe_account_id: salonInfo.stripe_account_id !== undefined ? salonInfo.stripe_account_id : (existing ? existing.stripe_account_id : null),
                message_templates: salonInfo.messageTemplates || (existing ? existing.message_templates : null),
                is_rewards_enabled: salonInfo.is_rewards_enabled !== undefined
                    ? Boolean(salonInfo.is_rewards_enabled)
                    : (salonInfo.isRewardsEnabled !== undefined
                        ? Boolean(salonInfo.isRewardsEnabled)
                        : (existing ? existing.is_rewards_enabled : false)),
                custom_rewards: salonInfo.custom_rewards !== undefined
                    ? salonInfo.custom_rewards
                    : (salonInfo.customRewards !== undefined
                        ? salonInfo.customRewards
                        : (existing ? (existing as any).custom_rewards : null)),
            };

            const ownerId = existing ? existing.owner_id : null;
            let savedOwnerId = ownerId;

            if (existing) {
                realSalonId = existing.id;
                const updatedSalon = await prisma.salon.update({
                    where: { id: existing.id },
                    data: updateData,
                });
                savedOwnerId = updatedSalon.owner_id;
            } else {
                const newSalon = await prisma.salon.create({
                    data: {
                        ...updateData,
                        id,
                        subscription_status: salonInfo.subscription_status || 'pending_payment',
                    },
                });
                realSalonId = newSalon.id;
                savedOwnerId = newSalon.owner_id;
            }

            if (savedOwnerId && (salonInfo.firstName !== undefined || salonInfo.lastName !== undefined || salonInfo.email !== undefined || salonInfo.phone !== undefined)) {
                const normalizedOwnerEmail = salonInfo.email !== undefined ? String(salonInfo.email).toLowerCase().trim() : undefined;
                if (normalizedOwnerEmail) {
                    const emailOwnerConflict = await prisma.profile.findFirst({
                        where: { email: { equals: normalizedOwnerEmail, mode: 'insensitive' }, id: { not: savedOwnerId } },
                        select: { id: true },
                    });
                    if (emailOwnerConflict) {
                        return NextResponse.json({ error: 'E-postadressen används redan av ett annat konto.' }, { status: 400 });
                    }
                }
                await prisma.profile.update({
                    where: { id: savedOwnerId },
                    data: {
                        first_name: salonInfo.firstName !== undefined ? salonInfo.firstName : undefined,
                        last_name: salonInfo.lastName !== undefined ? salonInfo.lastName : undefined,
                        email: normalizedOwnerEmail,
                        phone: salonInfo.phone !== undefined ? salonInfo.phone : undefined,
                    },
                });
            }

            // 2. Sync Practitioners (preserve existing tier if omitted)
            if (practitioners && Array.isArray(practitioners)) {
                const tierStr = (salonInfo.tier || salonInfo.membership_tier || existing?.membership_tier || 'bas').toLowerCase();
                let finalPractitioners = practitioners;
                if (tierStr !== 'luxe' && practitioners.length > 1) {
                    finalPractitioners = [practitioners[0]];
                }
                const processedPractitionerIds: string[] = [];
                let hadPractitionerError = false;
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
                            categories: p.categories,
                        };

                        const upserted = pid
                            ? await prisma.practitioner.upsert({
                                where: { id: pid },
                                update: pData,
                                create: { ...pData, id: pid },
                            })
                            : await prisma.practitioner.create({ data: pData });
                        if (upserted?.id) processedPractitionerIds.push(upserted.id);
                    } catch (pError) {
                        hadPractitionerError = true;
                        console.error('Error syncing practitioner:', pError);
                    }
                }

                if (!hadPractitionerError) {
                    await prisma.practitioner.deleteMany({
                        where: {
                            salon_id: realSalonId,
                            id: { notIn: processedPractitionerIds },
                        },
                    });
                }
            }

            // 3. Sync Services (avoid deleting existing rows if an upsert failed, and return updated services)
            let updatedServices: any[] | undefined;
            if (services && Array.isArray(services)) {
                const processedServiceIds: string[] = [];
                updatedServices = [];
                let hadServiceError = false;

                for (const s of services) {
                    try {
                        const sid = s.id && s.id.length > 20 ? s.id : undefined;
                        const price = parseFloat(s.price);
                        const salePrice = (s.sale_price !== null && s.sale_price !== undefined)
                            ? parseFloat(s.sale_price)
                            : ((s.salePrice !== null && s.salePrice !== undefined) ? parseFloat(s.salePrice) : null);

                        const serviceData = {
                            salon_id: realSalonId,
                            name: s.name || 'Namnlös tjänst',
                            description: s.description || '',
                            price: isNaN(price) ? 0 : price,
                            sale_price: (salePrice !== null && isNaN(salePrice)) ? null : salePrice,
                            sale_ends_at: (s.sale_ends_at || s.saleEndsAt) ? new Date(s.sale_ends_at || s.saleEndsAt) : null,
                            duration_minutes: parseInt(s.duration, 10) || 30,
                            category: s.category || '',
                        };

                        const upserted = sid
                            ? await prisma.service.upsert({
                                where: { id: sid },
                                update: serviceData,
                                create: { ...serviceData, id: sid },
                            })
                            : await prisma.service.create({ data: serviceData });

                        if (upserted?.id) {
                            processedServiceIds.push(upserted.id);
                            updatedServices.push({ ...upserted, duration: upserted.duration_minutes });
                        }
                    } catch (sError) {
                        hadServiceError = true;
                        console.error('Error syncing service:', sError);
                    }
                }

                if (!hadServiceError) {
                    await prisma.service.deleteMany({
                        where: {
                            salon_id: realSalonId,
                            id: { notIn: processedServiceIds },
                        },
                    });
                }
            }

            emitAvailabilityUpdate(realSalonId, { salonId: realSalonId });

            return NextResponse.json({
                success: true,
                salonId: realSalonId,
                slug: resolvedSlug,
                ...(updatedServices ? { services: updatedServices } : {}),
            });
        } catch (salonError: any) {
            console.error('Error syncing salon record:', salonError);
            return NextResponse.json({ error: `Failed to update salon info: ${salonError?.message || salonError}` }, { status: 500 });
        }
    } catch (error: any) {
        console.error('Update Salon API Error:', error);
        return NextResponse.json({ error: error.message || 'Server error' }, { status: 500 });
    }
}

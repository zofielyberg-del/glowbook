
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';


export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const slug = searchParams.get('slug');

        console.log(`[API] Fetching salon - ID: ${id}, Slug: ${slug}`);

        if (!id && !slug) {
            return NextResponse.json({ error: 'ID or Slug is required' }, { status: 400 });
        }

        // Clean up expired pending payments (older than 15 minutes)
        try {
            const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
            await prisma.appointment.deleteMany({
                where: {
                    status: 'pending_payment',
                    created_at: { lt: fifteenMinutesAgo }
                }
            });
        } catch (cleanupErr) {
            console.error('Failed to clean up expired pending bookings:', cleanupErr);
        }

        const salon = await prisma.salon.findUnique({
            where: id ? { id } : { slug: slug as string },
            include: {
                practitioners: true,
                services: true,
                owner: true,
                appointments: {
                    where: {
                        status: { not: 'cancelled' },
                        start_time: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } // Last 7 days + future
                    }
                }
            }
        });

        if (!salon) {
            return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
        }

        const totalAppointments = await prisma.appointment.count({
            where: { salon_id: salon.id }
        });

        return NextResponse.json({
            success: true,
            salon: {
                ...salon,
                hasAppointments: totalAppointments > 0,
                firstName: salon.owner?.first_name || '',
                lastName: salon.owner?.last_name || '',
                email: salon.owner?.email || '',
                phone: salon.owner?.phone || '',
                profileImage: salon.logo_url,
                backgroundImage: salon.banner_url,
                galleryImages: salon.gallery_images || [],
                isVerified: salon.is_verified || false,
                is_verified: salon.is_verified || false,
                verifiedCategories: salon.verified_categories || [],
                onboardingProgress: salon.onboarding_progress || null,
                practitioners: (salon.practitioners || []).map(p => ({
                    ...p,
                    image: p.image_url // Map database image_url to frontend image
                })),
                services: (salon.services || []).map(s => ({
                    ...s,
                    duration: s.duration_minutes // Map duration_minutes to duration for UI
                }))
            }
        }, {
            headers: {
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error: any) {
        console.error('Error fetching salon:', error);
        return NextResponse.json({ error: `Internal server error: ${error.message || error}` }, { status: 500 });
    }
}

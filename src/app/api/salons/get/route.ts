
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const id = searchParams.get('id');
        const slug = searchParams.get('slug');

        console.log(`[API] Fetching salon - ID: ${id}, Slug: ${slug}`);

        if (!id && !slug) {
            return NextResponse.json({ error: 'ID or Slug is required' }, { status: 400 });
        }

        const salon = await prisma.salon.findUnique({
            where: id ? { id } : { slug: slug as string },
            include: {
                practitioners: true,
                services: true,
                owner: true // Include the owner profile
            }
        });

        if (!salon) {
            return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            salon: {
                ...salon,
                firstName: salon.owner?.first_name || '',
                lastName: salon.owner?.last_name || '',
                email: salon.owner?.email || '',
                profileImage: salon.logo_url,
                backgroundImage: salon.banner_url,
                galleryImages: salon.gallery_images || [],
                practitioners: (salon.practitioners || []).map(p => ({
                    ...p,
                    image: p.image_url // Map database image_url to frontend image
                })),
                services: (salon.services || []).map(s => ({
                    ...s,
                    duration: s.duration_minutes // Map duration_minutes to duration for UI
                }))
            }
        });

    } catch (error) {
        console.error('Error fetching salon:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

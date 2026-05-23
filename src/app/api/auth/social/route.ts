import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { email, firstName, lastName, role, platform } = await req.json();

        if (!email) {
            return NextResponse.json({ error: 'E-post krävs för social inloggning' }, { status: 400 });
        }

        // 1. Find if profile already exists
        let profile = await prisma.profile.findUnique({
            where: { email },
        });

        const isNewUser = !profile;

        if (!profile) {
            // Create a new profile if they don't exist
            profile = await prisma.profile.create({
                data: {
                    email,
                    first_name: firstName || platform === 'google' ? 'Google' : 'Apple',
                    last_name: lastName || 'Användare',
                    role: role === 'provider' ? 'provider' : 'customer',
                    total_points_earned: 0
                }
            });
        }

        // Check role and fetch salon if provider
        const isProvider = profile.role === 'salon_owner' || profile.role === 'provider' || role === 'provider';
        
        // Ensure profile has correct role if registering as provider
        if (role === 'provider' && profile.role !== 'salon_owner' && profile.role !== 'provider') {
            profile = await prisma.profile.update({
                where: { id: profile.id },
                data: { role: 'provider' }
            });
        }

        let salonData = null;
        if (isProvider) {
            const salon = await prisma.salon.findFirst({
                where: { owner_id: profile.id },
                include: {
                    services: true,
                    practitioners: true,
                }
            });

            if (salon) {
                salonData = {
                    id: salon.id,
                    name: salon.name,
                    slug: salon.slug,
                    description: salon.description,
                    address: salon.address,
                    city: salon.city,
                    municipality: salon.municipality,
                    country: salon.country,
                    logo_url: salon.logo_url,
                    banner_url: salon.banner_url,
                    category: salon.category,
                    rating: salon.rating,
                    review_count: salon.review_count,
                    membership_tier: salon.membership_tier,
                    subscription_status: salon.subscription_status,
                    stripe_customer_id: salon.stripe_customer_id,
                    services: salon.services,
                    practitioners: salon.practitioners,
                    firstName: profile.first_name,
                    lastName: profile.last_name,
                    email: profile.email,
                    phone: profile.phone,
                    tier: salon.membership_tier?.toLowerCase() || 'bas',
                    role: 'salon_owner',
                };
            }
        }

        return NextResponse.json({
            success: true,
            isNewUser,
            user: {
                id: profile.id,
                email: profile.email,
                firstName: profile.first_name,
                lastName: profile.last_name,
                phone: profile.phone,
                role: profile.role,
                points: profile.total_points_earned || 0,
            },
            salon: salonData,
        });

    } catch (error: any) {
        console.error('Social login error:', error);
        return NextResponse.json({ error: error.message || 'Ett tekniskt fel uppstod' }, { status: 500 });
    }
}

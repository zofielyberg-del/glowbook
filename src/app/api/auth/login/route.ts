
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/lib/password';

export async function POST(req: Request) {
    try {
        const { email, password, role } = await req.json();

        if (!email || !password) {
            return NextResponse.json({ error: 'E-post och lösenord krävs' }, { status: 400 });
        }

        // Find user by email
        const profile = await prisma.profile.findUnique({
            where: { email },
        });

        if (!profile) {
            return NextResponse.json({ error: 'Inget konto hittades med den e-postadressen' }, { status: 401 });
        }

        // Verify password
        if (!profile.password_hash || !verifyPassword(password, profile.password_hash)) {
            return NextResponse.json({ error: 'Felaktigt lösenord' }, { status: 401 });
        }

        // Check role match
        const isProvider = profile.role === 'salon_owner' || profile.role === 'provider';
        const wantsProvider = role === 'provider';

        if (wantsProvider && !isProvider) {
            return NextResponse.json({ error: 'Detta konto är inte registrerat som utförare' }, { status: 403 });
        }

        // If provider, also fetch their salon data
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
                    // Fields used by the frontend
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

    } catch (error) {
        console.error('Login error:', error);
        return NextResponse.json({ error: 'Ett tekniskt fel uppstod' }, { status: 500 });
    }
}

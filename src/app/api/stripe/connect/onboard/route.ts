
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { salonId } = await req.json();

        if (!salonId) {
            return NextResponse.json({ error: 'Salon ID is required' }, { status: 400 });
        }

        // 1. Get Salon from DB
        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
        });

        if (!salon) {
            return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
        }

        let stripeAccountId = salon.stripe_account_id;

        // 2. Create Stripe Account if it doesn't exist
        if (!stripeAccountId) {
            // Fetch owner email explicitly
            let ownerEmail: string | undefined;
            if (salon.owner_id) {
                const owner = await prisma.profile.findUnique({
                    where: { id: salon.owner_id },
                    select: { email: true }
                });
                ownerEmail = owner?.email ?? undefined;
            }

            if (!ownerEmail) {
                return NextResponse.json({ error: 'Kunde inte hitta ägarens e-postadress' }, { status: 400 });
            }

            console.log(`Creating Stripe account for salon "${salon.name}" with email: ${ownerEmail}`);

            const account = await stripe.accounts.create({
                type: 'express',
                country: 'SE',
                email: ownerEmail,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                business_type: 'individual',
                business_profile: {
                    name: salon.name,
                },
                settings: {
                    payouts: {
                        schedule: {
                            interval: 'manual',
                        }
                    }
                }
            });

            stripeAccountId = account.id;

            // Update salon in DB
            await prisma.salon.update({
                where: { id: salonId },
                data: { stripe_account_id: stripeAccountId },
            });
        }

        // 3. Create Account Link for onboarding
        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/settings?tab=payments&stripe_refresh=true`,
            return_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/settings?tab=payments&stripe_success=true`,
            type: 'account_onboarding',
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error: any) {
        console.error('Stripe Connect Onboard Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

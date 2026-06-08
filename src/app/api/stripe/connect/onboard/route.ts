
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
            // Fetch owner details explicitly
            let ownerEmail: string | undefined;
            let ownerFirstName: string | undefined;
            let ownerLastName: string | undefined;
            let ownerPhone: string | undefined;

            if (salon.owner_id) {
                const owner = await prisma.profile.findUnique({
                    where: { id: salon.owner_id },
                    select: { email: true, first_name: true, last_name: true, phone: true }
                });
                ownerEmail = owner?.email ?? undefined;
                ownerFirstName = owner?.first_name ?? undefined;
                ownerLastName = owner?.last_name ?? undefined;
                ownerPhone = owner?.phone ?? undefined;
            }

            if (!ownerEmail) {
                return NextResponse.json({ error: 'Kunde inte hitta ägarens e-postadress' }, { status: 400 });
            }

            // Format phone to E.164 format (+46...) required by Stripe Connect
            let formattedPhone: string | undefined;
            if (ownerPhone) {
                const cleaned = ownerPhone.replace(/[^\d+]/g, '');
                if (cleaned.startsWith('+')) {
                    formattedPhone = cleaned;
                } else if (cleaned.startsWith('0')) {
                    formattedPhone = '+46' + cleaned.substring(1);
                } else {
                    formattedPhone = '+46' + cleaned;
                }
            }

            // Stripe Connect in live mode requires a valid, secure https production URL.
            // If the local environment is localhost or empty, fallback to the production URL.
            let businessUrl = 'https://glowbook.se';
            const appUrl = process.env.NEXT_PUBLIC_APP_URL;
            if (appUrl && appUrl.startsWith('https://') && !appUrl.includes('localhost')) {
                businessUrl = appUrl;
            }
            const fullBusinessUrl = `${businessUrl}/salon/${salon.id}`;

            console.log(`Creating Stripe account for salon "${salon.name}" with email: ${ownerEmail}, phone: ${formattedPhone}, business URL: ${fullBusinessUrl}`);

            // Pre-fill parameters (website, MCC, name, contact) to make Stripe Express onboarding extremely quick & easy
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'SE',
                email: ownerEmail,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                    klarna_payments: { requested: true },
                },
                business_type: 'individual',
                business_profile: {
                    name: salon.name,
                    url: fullBusinessUrl,
                    mcc: '7298', // Health and Beauty Spas category (eliminates industry selection step)
                },
                individual: {
                    first_name: ownerFirstName || undefined,
                    last_name: ownerLastName || undefined,
                    email: ownerEmail,
                    phone: formattedPhone || undefined,
                },
                settings: {
                    payouts: {
                        schedule: {
                            interval: 'monthly',
                            monthly_anchor: 25,
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
        } else {
            // Update capabilities and payout settings of existing Express account
            try {
                await stripe.accounts.update(stripeAccountId, {
                    capabilities: {
                        card_payments: { requested: true },
                        transfers: { requested: true },
                        klarna_payments: { requested: true },
                    },
                    settings: {
                        payouts: {
                            schedule: {
                                interval: 'monthly',
                                monthly_anchor: 25,
                            }
                        }
                    }
                });
            } catch (updateErr) {
                console.warn(`Failed to update capabilities for existing Stripe account ${stripeAccountId}:`, updateErr);
            }
        }

        // 3. Create Login Link if onboarding is complete, otherwise create Account Link for onboarding
        try {
            const stripeAccount = await stripe.accounts.retrieve(stripeAccountId);
            if (stripeAccount.details_submitted) {
                const loginLink = await stripe.accounts.createLoginLink(stripeAccountId);
                return NextResponse.json({ url: loginLink.url });
            }
        } catch (retrieveErr) {
            console.warn(`Failed to check details_submitted for Stripe account ${stripeAccountId}:`, retrieveErr);
        }

        let secureAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://glowbook.se';
        if (!secureAppUrl.startsWith('https://')) {
            secureAppUrl = secureAppUrl.replace(/^http:\/\//, 'https://');
            if (!secureAppUrl.startsWith('https://')) {
                secureAppUrl = 'https://' + secureAppUrl;
            }
        }
        if (secureAppUrl.includes('localhost')) {
            secureAppUrl = 'https://glowbook.se';
        }

        const accountLink = await stripe.accountLinks.create({
            account: stripeAccountId,
            refresh_url: `${secureAppUrl}/provider/settings?tab=payments&stripe_refresh=true`,
            return_url: `${secureAppUrl}/provider/settings?tab=payments&stripe_success=true`,
            type: 'account_onboarding',
        });

        return NextResponse.json({ url: accountLink.url });
    } catch (error: any) {
        console.error('Stripe Connect Onboard Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

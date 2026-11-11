import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import {
    calculateMembershipPrice,
    getConfiguredStripePriceId,
    normalizeDuration,
    normalizeTierKey,
    TRIAL_PERIOD_DAYS,
} from '@/lib/pricing';

export async function POST(req: Request) {
    try {
        const { tier = 'pro', duration = 1, salonId, salonEmail } = await req.json();
        const tierKey = normalizeTierKey(tier);
        const durationNum = normalizeDuration(duration);
        const priceId = getConfiguredStripePriceId(tierKey, durationNum);

        const getBaseUrl = () => {
            let url = process.env.NEXT_PUBLIC_APP_URL || 'https://www.glowbook.se';
            if (!url.startsWith('https://')) {
                url = url.replace(/^http:\/\//, 'https://');
                if (!url.startsWith('https://')) url = 'https://' + url;
            }
            if (url.includes('localhost')) url = 'https://www.glowbook.se';
            return url;
        };

        const createCheckoutSession = async (useFallbackPrice: boolean) => {
            const pricing = calculateMembershipPrice(tierKey, durationNum);
            const line_items = (!useFallbackPrice && priceId)
                ? [{ price: priceId, quantity: 1 }]
                : [
                    {
                        price_data: {
                            currency: 'sek',
                            product_data: {
                                name: `Glowbook ${tierKey.toUpperCase()}`,
                                description: `Glowbook ${tierKey.toUpperCase()} Medlemskap (${durationNum} mån) - 3 månader gratis provperiod`,
                            },
                            unit_amount: pricing.total * 100,
                            recurring: {
                                interval: 'month' as const,
                                interval_count: durationNum,
                            },
                        },
                        quantity: 1,
                    },
                ];

            return await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                ...(salonEmail ? { customer_email: salonEmail } : {}),
                line_items,
                subscription_data: {
                    trial_period_days: TRIAL_PERIOD_DAYS,
                    metadata: {
                        salonId: salonId || '',
                        tier: tierKey,
                        duration: String(durationNum),
                    },
                },
                success_url: `${getBaseUrl()}/provider?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${getBaseUrl()}/onboarding/provider?canceled=true`,
                metadata: {
                    salonId: salonId || '',
                    tier: tierKey,
                    duration: String(durationNum),
                },
            });
        };

        let session;
        if (priceId) {
            try {
                session = await createCheckoutSession(false);
            } catch (stripeErr: any) {
                if (
                    stripeErr?.message?.includes('No such price') ||
                    stripeErr?.code === 'resource_missing'
                ) {
                    console.warn(`[Stripe Subscription] Price ID "${priceId}" not found in current Stripe account. Falling back to dynamic price_data.`);
                    session = await createCheckoutSession(true);
                } else {
                    throw stripeErr;
                }
            }
        } else {
            session = await createCheckoutSession(true);
        }

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Subscription Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

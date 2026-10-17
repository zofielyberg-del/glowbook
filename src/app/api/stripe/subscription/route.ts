import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

const TIER_PRICES: Record<string, number> = {
    bas: 79,
    pro: 149,
    luxe: 349,
};

const DURATIONS_DISCOUNT: Record<number, number> = {
    1: 0,
    3: 0.05,
    6: 0.10,
    12: 0.15,
};

function calculatePrice(tier: string, duration: number) {
    const tierKey = (tier || 'pro').toLowerCase();
    const base = TIER_PRICES[tierKey] || 149;
    const discount = DURATIONS_DISCOUNT[duration] || 0;
    const monthly = Math.round(base * (1 - discount));
    const total = monthly * duration;
    return { monthly, total };
}

export async function POST(req: Request) {
    try {
        const { tier = 'pro', duration = 1, salonId, salonEmail } = await req.json();
        const durationNum = Number(duration) || 1;

        // Map tiers and durations to Stripe Price IDs
        const getPriceId = (tierName: string, dur: number) => {
            const tierUpper = tierName.toUpperCase();
            
            // Try specific duration first: STRIPE_PRICE_PRO_3
            const durationPrice = process.env[`STRIPE_PRICE_${tierUpper}_${dur}`];
            if (durationPrice) return durationPrice;

            // Try base tier price: STRIPE_PRICE_PRO
            const basePrice = process.env[`STRIPE_PRICE_${tierUpper}`];
            if (basePrice) return basePrice;

            // Try legacy naming: STRIPE_PRICE_ID_PRO
            const legacyPrice = process.env[`STRIPE_PRICE_ID_${tierUpper}`];
            if (legacyPrice) return legacyPrice;
            
            return '';
        };

        const priceId = getPriceId(tier, durationNum);

        const getBaseUrl = () => {
            let url = process.env.NEXT_PUBLIC_APP_URL || 'https://glowbook.se';
            if (!url.startsWith('https://')) {
                url = url.replace(/^http:\/\//, 'https://');
                if (!url.startsWith('https://')) url = 'https://' + url;
            }
            if (url.includes('localhost')) url = 'https://glowbook.se';
            return url;
        };

        const createCheckoutSession = async (useFallbackPrice: boolean) => {
            const line_items = (!useFallbackPrice && priceId)
                ? [{ price: priceId, quantity: 1 }]
                : [
                    {
                        price_data: {
                            currency: 'sek',
                            product_data: {
                                name: `Glowbook ${tier.toUpperCase()}`,
                                description: `Glowbook ${tier.toUpperCase()} Medlemskap (${durationNum} mån) - 3 månader gratis provperiod`,
                            },
                            unit_amount: calculatePrice(tier, durationNum).total * 100,
                            recurring: {
                                interval: 'month' as const,
                                interval_count: Math.min(Math.max(durationNum, 1), 12),
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
                    trial_period_days: 90, // 3 månader gratis provperiod
                    metadata: {
                        salonId: salonId || '',
                        tier: String(tier),
                        duration: String(durationNum),
                    },
                },
                success_url: `${getBaseUrl()}/provider?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${getBaseUrl()}/onboarding/provider?canceled=true`,
                metadata: {
                    salonId: salonId || '',
                    tier: String(tier),
                    duration: String(durationNum),
                },
            });
        };

        let session;
        if (priceId) {
            try {
                session = await createCheckoutSession(false);
            } catch (stripeErr: any) {
                // If price ID does not exist in the active Stripe account/mode (e.g. Test vs Live mismatch)
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

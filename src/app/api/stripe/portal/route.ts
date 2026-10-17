import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

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
        const { salonId, email } = await req.json();

        if (!salonId) {
            return NextResponse.json({ error: 'salonId required' }, { status: 400 });
        }

        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { 
                stripe_customer_id: true,
                membership_tier: true,
                duration: true,
                name: true
            }
        });

        if (!salon) {
            return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://glowbook.se';
        const returnUrl = appUrl.includes('localhost') ? 'https://glowbook.se/provider' : `${appUrl}/provider`;

        // 1. If Stripe Customer exists, redirect to Billing Portal (Manage Subscriptions/Pay invoice)
        if (salon.stripe_customer_id) {
            const session = await stripe.billingPortal.sessions.create({
                customer: salon.stripe_customer_id,
                return_url: returnUrl,
            });
            return NextResponse.json({ url: session.url });
        }

        // 2. If no Stripe Customer exists, redirect to Checkout Session for their tier (Initial payment)
        const tier = (salon.membership_tier || 'bas').toLowerCase();
        const duration = Number(salon.duration) || 1;
        
        const getPriceId = (t: string, d: number) => {
            const tierUpper = t.toUpperCase();
            const durationPrice = process.env[`STRIPE_PRICE_${tierUpper}_${d}`];
            if (durationPrice) return durationPrice;

            const basePrice = process.env[`STRIPE_PRICE_${tierUpper}`];
            if (basePrice) return basePrice;

            const legacyPrice = process.env[`STRIPE_PRICE_ID_${tierUpper}`];
            if (legacyPrice) return legacyPrice;

            return '';
        };

        const priceId = getPriceId(tier, duration);

        const createCheckoutSession = async (useFallbackPrice: boolean) => {
            const line_items = (!useFallbackPrice && priceId)
                ? [{ price: priceId, quantity: 1 }]
                : [
                    {
                        price_data: {
                            currency: 'sek',
                            product_data: {
                                name: `Glowbook ${tier.toUpperCase()}`,
                                description: `Glowbook ${tier.toUpperCase()} Medlemskap (${duration} mån) - 3 månader gratis provperiod`,
                            },
                            unit_amount: calculatePrice(tier, duration).total * 100,
                            recurring: {
                                interval: 'month' as const,
                                interval_count: Math.min(Math.max(duration, 1), 12),
                            },
                        },
                        quantity: 1,
                    },
                ];

            return await stripe.checkout.sessions.create({
                mode: 'subscription',
                payment_method_types: ['card'],
                ...(email ? { customer_email: email } : {}),
                line_items,
                subscription_data: {
                    trial_period_days: 90, // 3 månader gratis provperiod
                    metadata: {
                        salonId,
                        tier,
                        duration: String(duration),
                    },
                },
                success_url: `${returnUrl}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
                cancel_url: `${appUrl}/onboarding/provider?canceled=true`,
                metadata: {
                    salonId,
                    tier,
                    duration: String(duration),
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
                    console.warn(`[Stripe Portal] Price ID "${priceId}" not found in current Stripe account. Falling back to dynamic price_data.`);
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
        console.error('Portal/Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

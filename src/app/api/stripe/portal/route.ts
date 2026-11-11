import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import {
    calculateMembershipPrice,
    getConfiguredStripePriceId,
    normalizeDuration,
    normalizeTierKey,
    TRIAL_PERIOD_DAYS,
} from '@/lib/pricing';

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
                name: true,
            },
        });

        if (!salon) {
            return NextResponse.json({ error: 'Salon not found' }, { status: 404 });
        }

        const rawAppUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://www.glowbook.se';
        const appUrl = rawAppUrl.includes('localhost') ? 'https://www.glowbook.se' : rawAppUrl;
        const returnUrl = `${appUrl}/provider`;

        // 1. If Stripe Customer exists, redirect to Billing Portal (Manage Subscriptions/Pay invoice)
        if (salon.stripe_customer_id) {
            const session = await stripe.billingPortal.sessions.create({
                customer: salon.stripe_customer_id,
                return_url: returnUrl,
            });
            return NextResponse.json({ url: session.url });
        }

        // 1b. Safeguard against duplicate subscriptions: if a customer & active/trialing subscription already exist in Stripe for this email, sync and open Billing Portal
        if (email) {
            try {
                const customers = await stripe.customers.list({
                    email: String(email).toLowerCase().trim(),
                    limit: 5,
                });
                for (const cust of customers.data) {
                    const subs = await stripe.subscriptions.list({
                        customer: cust.id,
                        status: 'all',
                        limit: 10,
                    });
                    const validSub =
                        subs.data.find(
                            (s) =>
                                ['active', 'trialing'].includes(s.status) &&
                                (!s.metadata?.salonId || s.metadata.salonId === salonId)
                        ) || subs.data.find((s) => ['active', 'trialing'].includes(s.status));

                    if (validSub) {
                        await prisma.salon.update({
                            where: { id: salonId },
                            data: {
                                stripe_customer_id: cust.id,
                                stripe_subscription_id: validSub.id,
                                subscription_status: validSub.status,
                            },
                        });
                        const portalSession = await stripe.billingPortal.sessions.create({
                            customer: cust.id,
                            return_url: returnUrl,
                        });
                        return NextResponse.json({ url: portalSession.url });
                    }
                }
            } catch (lookupErr) {
                console.warn('[Stripe Portal] Existing customer lookup failed, falling back to Checkout:', lookupErr);
            }
        }

        // 2. If no Stripe Customer exists, redirect to Checkout Session for their tier
        const tier = normalizeTierKey(salon.membership_tier || 'bas');
        const duration = normalizeDuration(salon.duration);
        const priceId = getConfiguredStripePriceId(tier, duration);

        const createCheckoutSession = async (useFallbackPrice: boolean) => {
            const pricing = calculateMembershipPrice(tier, duration);
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
                            unit_amount: pricing.total * 100,
                            recurring: {
                                interval: 'month' as const,
                                interval_count: duration,
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
                    trial_period_days: TRIAL_PERIOD_DAYS,
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
        console.error('Portal Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

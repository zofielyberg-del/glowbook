import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

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
        const tier = (salon.membership_tier || 'bas').toUpperCase();
        
        const getPriceId = (t: string) => {
            const basePrice = process.env[`STRIPE_PRICE_${t}`];
            if (basePrice) return basePrice;
            const legacyPrice = process.env[`STRIPE_PRICE_ID_${t}`];
            if (legacyPrice) return legacyPrice;
            return '';
        };

        const priceId = getPriceId(tier);

        if (!priceId) {
            return NextResponse.json({ 
                error: `Stripe Price ID saknas för ${tier}. Kontrollera miljövariabler.` 
            }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: email,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            subscription_data: {
                trial_period_days: 30,
                metadata: {
                    salonId,
                    tier: tier.toLowerCase(),
                    duration: '1',
                },
            },
            success_url: `${returnUrl}?subscription=success&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${appUrl}/onboarding/provider?canceled=true`,
            metadata: {
                salonId,
                tier: tier.toLowerCase(),
                duration: '1',
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Portal/Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

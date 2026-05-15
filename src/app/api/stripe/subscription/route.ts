
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const { tier, duration, salonId, salonEmail } = await req.json();

        // Map tiers and durations to Stripe Price IDs
        const getPriceId = (tier: string, duration: number) => {
            const tierUpper = tier.toUpperCase();
            
            // Try specific duration first: STRIPE_PRICE_PRO_3
            const durationPrice = process.env[`STRIPE_PRICE_${tierUpper}_${duration}`];
            if (durationPrice) return durationPrice;

            // Try base tier price: STRIPE_PRICE_PRO
            const basePrice = process.env[`STRIPE_PRICE_${tierUpper}`];
            if (basePrice) return basePrice;

            // Try legacy naming: STRIPE_PRICE_ID_PRO
            const legacyPrice = process.env[`STRIPE_PRICE_ID_${tierUpper}`];
            if (legacyPrice) return legacyPrice;
            
            return '';
        };

        const priceId = getPriceId(tier, duration || 1);

        if (!priceId) {
            return NextResponse.json({ 
                error: `Stripe Price ID saknas för ${tier}. Kontrollera att STRIPE_PRICE_${tier.toUpperCase()} finns i .env` 
            }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            customer_email: salonEmail,
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            subscription_data: {
                trial_period_days: 30, // 30 days trial for ALL tiers as per requirements
                metadata: {
                    salonId,
                    tier,
                },
            },
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/settings?tab=membership&success=true`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/provider/settings?tab=membership&canceled=true`,
            metadata: {
                salonId,
                tier,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Subscription Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

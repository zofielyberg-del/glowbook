
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const { tier, duration, salonId, salonEmail } = await req.json();

        // Map tiers and durations to Stripe Price IDs
        // Fallback to monthly price if specific duration price is not provided
        const getPriceId = (tier: string, duration: number) => {
            const prefix = `STRIPE_PRICE_${tier.toUpperCase()}`;
            
            if (duration === 3) return process.env[`${prefix}_3`] || process.env[prefix] || '';
            if (duration === 6) return process.env[`${prefix}_6`] || process.env[prefix] || '';
            if (duration === 12) return process.env[`${prefix}_12`] || process.env[prefix] || '';
            
            return process.env[prefix] || process.env[`STRIPE_PRICE_ID_${tier.toUpperCase()}`] || '';
        };

        const priceId = getPriceId(tier, duration || 1);

        if (!priceId) {
            return NextResponse.json({ error: `Price ID for ${tier} (duration: ${duration}) missing in .env` }, { status: 400 });
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


import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const { tier, salonId, salonEmail } = await req.json();

        // Map tiers to Stripe Price IDs (User needs to create these in Stripe Dashboard)
        const priceMap: Record<string, string> = {
            'bas': process.env.STRIPE_PRICE_ID_BAS || '',
            'pro': process.env.STRIPE_PRICE_ID_PRO || '',
            'luxe': process.env.STRIPE_PRICE_ID_LUXE || '',
        };

        const priceId = priceMap[tier];

        if (!priceId) {
            return NextResponse.json({ error: 'Invalid tier or Price ID missing in .env' }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            automatic_payment_methods: { enabled: true },
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

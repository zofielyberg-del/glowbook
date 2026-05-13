
import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const { appointmentId, salonId, serviceName, price, customerEmail } = await req.json();

        if (!appointmentId || !salonId || !price) {
            return NextResponse.json({ error: 'Missing required booking data' }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            customer_email: customerEmail,
            line_items: [
                {
                    price_data: {
                        currency: 'sek',
                        product_data: {
                            name: `Bokning: ${serviceName}`,
                            description: `Tid hos salong ${salonId}`,
                        },
                        unit_amount: Math.round(price * 100),
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/profile?tab=bookings&status=success`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/onboarding/checkout?status=cancel`,
            metadata: {
                type: 'booking',
                appointmentId,
                salonId
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error) {
        console.error('Stripe booking checkout error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

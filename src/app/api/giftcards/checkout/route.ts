import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const { amount, recipient, currency = 'SEK' } = await req.json();

        if (!amount || !recipient.email) {
            return NextResponse.json({ error: 'Missing information' }, { status: 400 });
        }

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'], // Add Klarna or Swish if enabled in dashboard
            line_items: [
                {
                    price_data: {
                        currency,
                        product_data: {
                            name: `Glowbook Gift Card - ${amount} ${currency}`,
                            description: `For: ${recipient.to}. Message: ${recipient.message || 'No message'}`,
                        },
                        unit_amount: amount * 100, // Stripe uses cents/öre
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/giftcards?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/giftcards?canceled=true`,
            metadata: {
                type: 'giftcard',
                recipientEmail: recipient.email,
                recipientName: recipient.to,
                senderName: recipient.from || 'Anonymous',
                message: recipient.message || '',
                amount: amount.toString(),
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Session Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

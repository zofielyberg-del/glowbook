import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';

export async function POST(req: Request) {
    try {
        const { amount, recipient, currency = 'SEK' } = await req.json();

        if (!amount || !recipient?.email) {
            return NextResponse.json({ error: 'Missing information' }, { status: 400 });
        }

        const rawCurr = String(currency || 'SEK').trim().toUpperCase();
        const isoCurrency = rawCurr === 'KR' ? 'SEK' : (['SEK', 'NOK', 'DKK', 'EUR', 'ISK'].includes(rawCurr) ? rawCurr : 'SEK');

        const baseUrl = (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes('localhost'))
            ? process.env.NEXT_PUBLIC_APP_URL
            : 'https://www.glowbook.se';

        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price_data: {
                        currency: isoCurrency.toLowerCase(),
                        product_data: {
                            name: `Glowbook Gift Card - ${amount} ${isoCurrency}`,
                            description: `For: ${recipient.to}. Message: ${recipient.message || 'No message'}`,
                        },
                        unit_amount: Math.round(Number(amount) * 100), // Stripe uses cents/öre
                    },
                    quantity: 1,
                },
            ],
            mode: 'payment',
            success_url: `${baseUrl}/giftcards?success=true&session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/giftcards?canceled=true`,
            metadata: {
                type: 'giftcard',
                recipientEmail: recipient.email,
                recipientName: recipient.to,
                senderName: recipient.from || 'Anonymous',
                message: recipient.message || '',
                amount: amount.toString(),
                currency: isoCurrency,
            },
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Stripe Session Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { appointmentId, salonId, serviceName, price, customerEmail } = await req.json();

        if (!appointmentId || !salonId) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        // 1. Get Salon Connect Account
        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { stripe_account_id: true, name: true }
        });

        if (!salon?.stripe_account_id) {
            return NextResponse.json({ error: 'Salon is not connected to Stripe' }, { status: 400 });
        }

        // Check if the salon's connected Stripe account has the klarna_payments capability active
        let paymentMethodTypes: ('card' | 'klarna')[] = ['card'];
        try {
            const stripeAccount = await stripe.accounts.retrieve(salon.stripe_account_id);
            if (stripeAccount.capabilities?.klarna_payments === 'active') {
                paymentMethodTypes = ['card', 'klarna'];
            }
        } catch (err) {
            console.warn(`Failed to retrieve capabilities for Stripe account ${salon.stripe_account_id}, falling back to card only:`, err);
        }

        // 2. Create Checkout Session on behalf of the salon (Direct Charge)
        // Note: Since Glowbook takes 0%, a direct charge is best.
        const session = await stripe.checkout.sessions.create({
            mode: 'payment',
            payment_method_types: paymentMethodTypes,
            line_items: [
                {
                    price_data: {
                        currency: 'sek',
                        product_data: {
                            name: `${serviceName} @ ${salon.name}`,
                        },
                        unit_amount: Math.round(price * 100), // Stripe expects cents/öre
                    },
                    quantity: 1,
                },
            ],
            customer_email: customerEmail,
            success_url: `${process.env.NEXT_PUBLIC_APP_URL}/salon/${salonId}?booking_success=true&appointment_id=${appointmentId}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/salon/${salonId}?booking_canceled=true`,
            metadata: {
                appointmentId,
                salonId,
            },
        }, {
            stripeAccount: salon.stripe_account_id, // This makes it a Direct Charge
        });

        return NextResponse.json({ url: session.url });
    } catch (error: any) {
        console.error('Booking Checkout Error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}


import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    let event;

    try {
        event = stripe.webhooks.constructEvent(
            body,
            signature,
            process.env.STRIPE_WEBHOOK_SECRET || ''
        );
    } catch (err: any) {
        console.error(`Webhook signature verification failed.`, err.message);
        return NextResponse.json({ error: err.message }, { status: 400 });
    }

    // Handle the event
    switch (event.type) {
        case 'checkout.session.completed':
            const session = event.data.object as any;
            
            // 1. Handle Appointment Payment
            if (session.metadata?.appointmentId) {
                await prisma.appointment.update({
                    where: { id: session.metadata.appointmentId },
                    data: { status: 'confirmed', payment_id: session.payment_intent },
                });
                console.log(`Appointment ${session.metadata.appointmentId} confirmed via webhook.`);
            }

            // 2. Handle Subscription Activation
            if (session.mode === 'subscription' && session.metadata?.salonId) {
                await prisma.salon.update({
                    where: { id: session.metadata.salonId },
                    data: { 
                        membership_tier: session.metadata.tier,
                        subscription_status: 'active',
                        stripe_customer_id: session.customer as string,
                        stripe_subscription_id: session.subscription as string
                    },
                });
                console.log(`Salon ${session.metadata.salonId} subscription activated via webhook.`);
            }
            break;

        case 'customer.subscription.deleted':
            const subscription = event.data.object as any;
            await prisma.salon.updateMany({
                where: { stripe_subscription_id: subscription.id },
                data: { subscription_status: 'canceled' },
            });
            break;

        default:
            console.log(`Unhandled event type ${event.type}`);
    }

    return NextResponse.json({ received: true });
}

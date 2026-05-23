import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { salonId } = await req.json();

        if (!salonId) {
            return NextResponse.json({ error: 'salonId krävs' }, { status: 400 });
        }

        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { stripe_subscription_id: true, name: true }
        });

        if (!salon) {
            return NextResponse.json({ error: 'Salong hittades inte' }, { status: 404 });
        }

        if (salon.stripe_subscription_id) {
            // Set cancel_at_period_end to false in Stripe to undo the cancellation and ensure they will be billed
            await stripe.subscriptions.update(salon.stripe_subscription_id, {
                cancel_at_period_end: false,
            });
        } else {
            console.log(`[API] Salon ${salonId} has no Stripe subscription ID. Performing local database reactivation only.`);
        }

        // Set salon status back to active in database
        await prisma.salon.update({
            where: { id: salonId },
            data: { subscription_status: 'active' }
        });

        return NextResponse.json({ success: true, message: 'Prenumerationen har återaktiverats.' });
    } catch (error: any) {
        console.error('Reactivate subscription error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

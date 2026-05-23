import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendCancellationEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { salonId } = await req.json();

        if (!salonId) {
            return NextResponse.json({ error: 'salonId krävs' }, { status: 400 });
        }

        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { stripe_subscription_id: true, name: true, owner: true }
        });

        if (!salon) {
            return NextResponse.json({ error: 'Salong hittades inte' }, { status: 404 });
        }

        if (salon.stripe_subscription_id) {
            // Cancel at period end — immediately signals Stripe not to charge again,
            // and lets trial periods run to their natural end.
            await stripe.subscriptions.update(salon.stripe_subscription_id, {
                cancel_at_period_end: true,
            });
        } else {
            console.log(`[API] Salon ${salonId} has no Stripe subscription ID. Performing local database cancellation only.`);
        }

        // Update DB to reflect pending cancellation
        await prisma.salon.update({
            where: { id: salonId },
            data: { subscription_status: 'canceling' }
        });

        // Send farewell email
        if (salon.owner?.email) {
            try {
                await sendCancellationEmail(
                    salon.owner.email,
                    salon.owner.first_name || salon.name,
                    salon.name
                );
            } catch (emailErr) {
                console.error('Failed to send cancellation email:', emailErr);
            }
        }

        return NextResponse.json({ success: true, message: 'Uppsägning registrerad. Provperiod/betalningsperiod löper ut utan debitering.' });
    } catch (error: any) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

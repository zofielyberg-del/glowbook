import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendCancellationEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { salonId, salonEmail, immediate = false } = await req.json();

        if (!salonId && !salonEmail) {
            return NextResponse.json({ error: 'salonId krävs' }, { status: 400 });
        }

        let salon = salonId
            ? await prisma.salon.findUnique({
                where: { id: salonId },
                select: { id: true, stripe_subscription_id: true, name: true, owner: true }
            })
            : null;

        if (!salon) {
            salon = await prisma.salon.findFirst({
                where: {
                    OR: [
                        ...(salonId ? [{ slug: salonId }, { owner_id: salonId }] : []),
                        ...(salonEmail ? [{ owner: { email: salonEmail } }] : []),
                    ],
                },
                select: { id: true, stripe_subscription_id: true, name: true, owner: true }
            });
        }

        if (!salon) {
            return NextResponse.json({ error: 'Salong hittades inte' }, { status: 404 });
        }

        if (salon.stripe_subscription_id) {
            try {
                if (immediate) {
                    await stripe.subscriptions.cancel(salon.stripe_subscription_id);
                } else {
                    // Cancel at period end — immediately signals Stripe not to charge again,
                    // and ensures 3-month trial periods run to their end without any debiting.
                    await stripe.subscriptions.update(salon.stripe_subscription_id, {
                        cancel_at_period_end: true,
                    });
                }
            } catch (stripeErr: any) {
                console.error('[Stripe Cancel] Error updating subscription in Stripe:', stripeErr);
            }
        } else if (salon.owner?.email || salonEmail) {
            try {
                const emailToLookup = salon.owner?.email || salonEmail;
                const customers = await stripe.customers.list({ email: emailToLookup, limit: 3 });
                for (const cust of customers.data) {
                    const subs = await stripe.subscriptions.list({ customer: cust.id, status: 'all', limit: 5 });
                    for (const sub of subs.data) {
                        if (sub.status === 'active' || sub.status === 'trialing') {
                            if (immediate) {
                                await stripe.subscriptions.cancel(sub.id);
                            } else {
                                await stripe.subscriptions.update(sub.id, { cancel_at_period_end: true });
                            }
                        }
                    }
                }
            } catch (stripeLookupErr: any) {
                console.error('[Stripe Cancel] Fallback customer lookup error:', stripeLookupErr);
            }
        } else {
            console.log(`[API] Salon ${salon.id} has no Stripe subscription ID. Performing local database cancellation only.`);
        }

        const nextStatus = immediate ? 'canceled' : 'canceling';

        // Update DB to reflect cancellation status
        await prisma.salon.update({
            where: { id: salon.id },
            data: { subscription_status: nextStatus }
        });

        // Send farewell / cancellation confirmation email
        const recipientEmail = salon.owner?.email || salonEmail;
        let emailSent = false;
        if (recipientEmail) {
            try {
                await sendCancellationEmail(
                    recipientEmail,
                    salon.owner?.first_name || salon.name,
                    salon.name
                );
                emailSent = true;
            } catch (emailErr) {
                console.error('Failed to send cancellation email:', emailErr);
            }
        }

        return NextResponse.json({
            success: true,
            subscription_status: nextStatus,
            emailSent,
            message: 'Ditt medlemskap är nu uppsagt. Provperiod/betalningsperiod löper ut utan debitering.'
        });
    } catch (error: any) {
        console.error('Cancel subscription error:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

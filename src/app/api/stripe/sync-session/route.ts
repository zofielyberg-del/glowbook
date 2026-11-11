import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';
import { sendProviderWelcomeEmail, sendProviderReceiptEmail } from '@/lib/email';
import { calculateMembershipPrice } from '@/lib/pricing';

export async function POST(req: Request) {
    try {
        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId krävs' }, { status: 400 });
        }

        // 1. Retrieve the checkout session from Stripe (with expanded subscription)
        const session = await stripe.checkout.sessions.retrieve(sessionId, {
            expand: ['subscription'],
        });

        if (!session) {
            return NextResponse.json({ error: 'Hittade inte Stripe-sessionen' }, { status: 404 });
        }

        const subscriptionObj =
            session.subscription && typeof session.subscription !== 'string'
                ? session.subscription
                : null;

        const salonId = session.metadata?.salonId || subscriptionObj?.metadata?.salonId;
        const tier = session.metadata?.tier || subscriptionObj?.metadata?.tier || 'pro';
        const durationRaw = session.metadata?.duration || subscriptionObj?.metadata?.duration;
        const durationNum = durationRaw ? parseInt(String(durationRaw), 10) : undefined;
        const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
        const subscriptionId = subscriptionObj?.id || (typeof session.subscription === 'string' ? session.subscription : undefined);

        // Preserve 'trialing' vs 'active' when available, defaulting to 'active' if checkout completed
        const stripeSubStatus = subscriptionObj?.status;
        const resolvedStatus =
            stripeSubStatus && ['active', 'trialing', 'canceling'].includes(stripeSubStatus)
                ? stripeSubStatus
                : 'active';

        if (!salonId) {
            return NextResponse.json({ error: 'Metadata saknar salonId' }, { status: 400 });
        }

        const existingSalon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { stripe_subscription_id: true },
        });

        const alreadySynced = Boolean(
            subscriptionId && existingSalon?.stripe_subscription_id === subscriptionId
        );

        // 2. Safely update the salon in the database with Stripe details
        const updatedSalon = await prisma.salon.update({
            where: { id: salonId },
            data: {
                subscription_status: resolvedStatus,
                membership_tier: tier ? tier.toLowerCase() : undefined,
                ...(durationNum && !Number.isNaN(durationNum) ? { duration: durationNum } : {}),
                ...(customerId ? { stripe_customer_id: customerId } : {}),
                ...(subscriptionId ? { stripe_subscription_id: subscriptionId } : {}),
            },
            include: { owner: true },
        });

        console.log(`[Sync Session] Successfully synced Salon ${salonId} (${resolvedStatus}) with Stripe Subscription ${subscriptionId}`);

        // 3. Send Welcome and Receipt emails as backup if not already synced
        if (!alreadySynced && updatedSalon.owner?.email) {
            const firstName = updatedSalon.owner.first_name || updatedSalon.name || 'Utförare';

            try {
                await sendProviderWelcomeEmail(updatedSalon.owner.email, firstName);
                console.log(`[Sync Session] Welcome email sent as backup to ${updatedSalon.owner.email}`);
            } catch (err) {
                console.error('[Sync Session] Failed to send welcome email:', err);
            }

            const pricing = calculateMembershipPrice(tier, updatedSalon.duration || durationNum || 1);

            try {
                await sendProviderReceiptEmail(
                    updatedSalon.owner.email,
                    firstName,
                    updatedSalon.name,
                    tier,
                    pricing.total,
                    'SEK'
                );
                console.log(`[Sync Session] Receipt email sent as backup to ${updatedSalon.owner.email}`);
            } catch (err) {
                console.error('[Sync Session] Failed to send receipt email:', err);
            }
        }

        return NextResponse.json({
            success: true,
            salon: {
                id: updatedSalon.id,
                name: updatedSalon.name,
                subscription_status: updatedSalon.subscription_status,
                membership_tier: updatedSalon.membership_tier,
                duration: updatedSalon.duration,
                stripe_customer_id: updatedSalon.stripe_customer_id,
                stripe_subscription_id: updatedSalon.stripe_subscription_id,
            },
        });
    } catch (error: any) {
        console.error('[Sync Session Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

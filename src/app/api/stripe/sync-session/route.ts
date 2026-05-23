import { NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { sessionId } = await req.json();

        if (!sessionId) {
            return NextResponse.json({ error: 'sessionId krävs' }, { status: 400 });
        }

        // 1. Retrieve the checkout session from Stripe
        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (!session) {
            return NextResponse.json({ error: 'Hittade inte Stripe-sessionen' }, { status: 404 });
        }

        const salonId = session.metadata?.salonId;
        const tier = session.metadata?.tier || 'pro';
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (!salonId) {
            return NextResponse.json({ error: 'Metadata saknar salonId' }, { status: 400 });
        }

        // 2. Safely update the salon in the database with Stripe details
        const updatedSalon = await prisma.salon.update({
            where: { id: salonId },
            data: {
                subscription_status: 'active',
                membership_tier: tier ? tier.toLowerCase() : undefined,
                stripe_customer_id: customerId as string,
                stripe_subscription_id: subscriptionId as string
            },
            include: { owner: true }
        });

        console.log(`[Sync Session] Successfully synced Salon ${salonId} with Stripe Subscription ${subscriptionId}`);

        // 🎯 BACKUP: Send Welcome and Receipt emails to the provider
        if (updatedSalon.owner?.email) {
            const { sendProviderWelcomeEmail, sendProviderReceiptEmail } = require('@/lib/email');
            const firstName = updatedSalon.owner.first_name || updatedSalon.name || 'Utförare';
            
            // 1. Send Welcome Email
            try {
                await sendProviderWelcomeEmail(updatedSalon.owner.email, firstName);
                console.log(`[Sync Session] Welcome email sent as backup to ${updatedSalon.owner.email}`);
            } catch (err) {
                console.error('[Sync Session] Failed to send welcome email:', err);
            }

            // 2. Send Receipt Email (Base Pricing: Bas 79, Pro 149, Luxe 249)
            const priceMap: Record<string, number> = { bas: 79, pro: 149, luxe: 249 };
            const basePrice = priceMap[tier.toLowerCase()] || 149;

            try {
                await sendProviderReceiptEmail(
                    updatedSalon.owner.email,
                    firstName,
                    updatedSalon.name,
                    tier,
                    basePrice,
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
                stripe_subscription_id: updatedSalon.stripe_subscription_id
            }
        });
    } catch (error: any) {
        console.error('[Sync Session Error]:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

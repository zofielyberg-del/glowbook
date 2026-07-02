process.env.DATABASE_URL = "postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

import { stripe } from '../src/lib/stripe';
import { prisma } from '../src/lib/prisma';

async function testCheckout() {
    const appointmentId = "4b77b0e4-7e9b-4cb6-9145-b2da96c8035d";
    const salonId = "8d63f8fb-7922-4236-a038-67082058938a";
    const serviceName = "Manikyr";
    const price = 200;
    const customerEmail = "scarlettgoldblanket@hotmail.com";

    try {
        console.log('Testing booking checkout endpoint logic...');
        
        // 1. Get Salon Connect Account
        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { stripe_account_id: true, name: true }
        });

        if (!salon?.stripe_account_id) {
            console.log('ERROR: Salon is not connected to Stripe');
            return;
        }
        console.log('Salon stripe account:', salon.stripe_account_id);

        // Check capabilities
        let paymentMethodTypes: ('card' | 'klarna')[] = ['card'];
        try {
            const stripeAccount = await stripe.accounts.retrieve(salon.stripe_account_id);
            console.log('Stripe capabilities retrieved:', stripeAccount.capabilities);
            if (stripeAccount.capabilities?.klarna_payments === 'active') {
                paymentMethodTypes = ['card', 'klarna'];
            }
        } catch (err: any) {
            console.error('Failed to retrieve capabilities:', err.message);
        }
        console.log('Using payment method types:', paymentMethodTypes);

        // 2. Create Checkout Session
        const sessionParams: any = {
            mode: 'payment',
            payment_method_types: paymentMethodTypes,
            line_items: [
                {
                    price_data: {
                        currency: 'sek',
                        product_data: {
                            name: `${serviceName} @ ${salon.name}`,
                        },
                        unit_amount: Math.round(price * 100),
                    },
                    quantity: 1,
                },
            ],
            customer_email: customerEmail,
            success_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://glowbook.se'}/salon/${salonId}?booking_success=true&appointment_id=${appointmentId}`,
            cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'https://glowbook.se'}/salon/${salonId}?booking_canceled=true`,
            metadata: {
                appointmentId,
                salonId,
            },
        };

        const feePercent = parseFloat(process.env.NEXT_PUBLIC_APPLICATION_FEE_PERCENT || '0');
        const feeAmount = Math.round(price * 100 * (feePercent / 100));
        if (feeAmount > 0) {
            sessionParams.payment_intent_data = {
                application_fee_amount: feeAmount,
            };
        }

        console.log('Creating Stripe checkout session with params:', JSON.stringify(sessionParams, null, 2));
        
        const session = await stripe.checkout.sessions.create(sessionParams, {
            stripeAccount: salon.stripe_account_id,
        });

        console.log('SUCCESS: Session created!', session.url);
    } catch (error: any) {
        console.error('CRITICAL ERROR in checkout:', error);
    }
}

testCheckout().then(() => prisma.$disconnect());

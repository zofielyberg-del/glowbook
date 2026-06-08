
import { NextResponse } from 'next/server';
import { headers } from 'next/headers';
import { stripe } from '@/lib/stripe';
import { resend } from '@/lib/resend';
import { prisma } from '@/lib/prisma';
import { 
    sendProviderWelcomeEmail, 
    sendProviderReceiptEmail,
    sendCustomerBookingConfirmation,
    sendProviderBookingNotification
} from '@/lib/email';

// Rebuild trigger: apply updated Vercel environment variables

// Bullseye: Core Gift Card Generation Logic
function generateCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const seg2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `GLOW-${seg1}-${seg2}`;
}

export async function POST(req: Request) {
    const body = await req.text();
    const signature = (await headers()).get('stripe-signature') as string;

    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
    const connectSecret = process.env.STRIPE_CONNECT_WEBHOOK_SECRET || '';

    let event;

    try {
        event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
        if (connectSecret) {
            try {
                event = stripe.webhooks.constructEvent(body, signature, connectSecret);
            } catch (connectErr: any) {
                console.error(`Connect Webhook signature verification failed: ${connectErr.message}`);
                return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
            }
        } else {
            console.error(`Webhook signature verification failed: ${err.message}`);
            return NextResponse.json({ error: 'Webhook Error' }, { status: 400 });
        }
    }

    const session = event.data.object as any;

    // Handle Checkout Completed
    if (event.type === 'checkout.session.completed') {
        const type = session.metadata?.type;

        // 🎯 BULLSEYE: Handle Gift Card Payment Success
        if (type === 'giftcard') {
            const { recipientEmail, recipientName, senderName, message, amount } = session.metadata;
            const code = generateCode();
            const expiresAt = new Date();
            expiresAt.setFullYear(expiresAt.getFullYear() + 2);

            // 1. Save to Database (Admin bypass)
            try {
                await prisma.giftCard.create({
                    data: {
                        code,
                        value: parseFloat(amount),
                        remaining_balance: parseFloat(amount),
                        recipient_name: recipientName,
                        recipient_email: recipientEmail,
                        sender_name: senderName,
                        message: message,
                        expires_at: expiresAt,
                        status: 'active'
                    }
                });
            } catch (dbError) {
                console.error('DB Error saving gift card:', dbError);
            }

            // 2. Send Email via Resend
            try {
                const emailPayload = {
                    to: recipientEmail,
                    subject: `Ett presentkort från ${senderName}! ✨`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
                            <h2 style="color: #c5a059;">Glowbook</h2>
                            <p>Hej ${recipientName},</p>
                            <p>${senderName} har skickat ett digitalt presentkort till dig!</p>
                            <div style="background: #000; color: #fff; padding: 40px; text-align: center; border-radius: 20px; margin: 20px 0;">
                                <h1 style="font-size: 48px; margin: 0;">${amount} SEK</h1>
                                <p style="color: #c5a059; font-family: monospace; font-size: 24px; letter-spacing: 2px;">${code}</p>
                            </div>
                            <p><em>"${message || ''}"</em></p>
                            <p style="font-size: 12px; color: #999;">Giltigt till ${expiresAt.toLocaleDateString('sv-SE')} hos alla Glowbook-anslutna salonger.</p>
                            <hr />
                            <a href="${process.env.NEXT_PUBLIC_APP_URL}/giftcards" style="display: inline-block; padding: 10px 20px; background: #c5a059; color: #fff; text-decoration: none; border-radius: 10px;">Lös in här</a>
                        </div>
                    `
                };

                try {
                    // Try sending with standard verified domain
                    await resend.emails.send({
                        from: 'Glowbook <noreply@glowbook.se>',
                        ...emailPayload
                    });
                } catch (firstTryErr) {
                    console.warn('Failed to send email with glowbook.se domain, trying onboarding@resend.dev sandbox fallback:', firstTryErr);
                    // Try sending with sandbox fallback
                    await resend.emails.send({
                        from: 'Glowbook <onboarding@resend.dev>',
                        ...emailPayload
                    });
                }
            } catch (mailError) {
                console.error('Mail Error after both attempts:', mailError);
            }
        }

        // 📅 Handle Appointment Booking Payment Success
        if (type === 'booking') {
            const appointmentId = session.metadata?.appointmentId;
            const salonId = session.metadata?.salonId;
            const customerEmail = session.customer_details?.email;
            const amount = session.amount_total / 100; // in SEK
            const points = Math.floor(amount / 10) * 5;

            // 1. Retrieve the actual payment method from Stripe PaymentIntent
            let paymentMethod = 'stripe';
            if (session.payment_intent && salonId) {
                try {
                    const salon = await prisma.salon.findUnique({
                        where: { id: salonId },
                        select: { stripe_account_id: true }
                    });
                    if (salon?.stripe_account_id) {
                        const paymentIntent = await stripe.paymentIntents.retrieve(
                            session.payment_intent as string,
                            { expand: ['payment_method'] },
                            { stripeAccount: salon.stripe_account_id }
                        );
                        if (paymentIntent.payment_method && typeof paymentIntent.payment_method !== 'string') {
                            paymentMethod = paymentIntent.payment_method.type; // e.g. 'card', 'klarna'
                        }
                    }
                } catch (retrieveErr) {
                    console.error('[Webhook] Failed to retrieve PaymentIntent:', retrieveErr);
                }
            }

            // 2. Update Appointment Status
            const appointment = await prisma.appointment.update({
                where: { id: appointmentId },
                data: { 
                    status: 'paid', 
                    payment_id: session.id,
                    payment_method: paymentMethod
                },
                include: {
                    salon: {
                        include: {
                            owner: {
                                select: { email: true }
                            }
                        }
                    }
                }
            });

            // 2. Send Booking Confirmation Emails
            if (appointment) {
                const bookingDateStr = appointment.booking_date
                    ? new Date(appointment.booking_date).toLocaleDateString('sv-SE', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'Europe/Stockholm'
                      })
                    : appointment.start_time.toLocaleDateString('sv-SE', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        timeZone: 'Europe/Stockholm'
                      });
                    
                const startTimeStr = appointment.start_time.toLocaleTimeString('sv-SE', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Europe/Stockholm'
                });

                const salonName = appointment.salon?.name || 'Salongen';
                const providerEmail = appointment.salon?.owner?.email || '';

                // Send Customer Booking Confirmation
                if (appointment.customer_email) {
                    try {
                        await sendCustomerBookingConfirmation(
                            appointment.customer_email,
                            appointment.customer_name || 'Kund',
                            salonName,
                            appointment.service_name || 'Behandling',
                            bookingDateStr,
                            startTimeStr,
                            `${appointment.total_price || amount} SEK`,
                            appointment.id
                        );
                        console.log(`[Webhook] Booking confirmation email sent to customer: ${appointment.customer_email}`);
                    } catch (err) {
                        console.error('[Webhook] Failed to send customer booking confirmation email:', err);
                    }
                }

                // Send Provider Booking Notification
                if (providerEmail) {
                    try {
                        await sendProviderBookingNotification(
                            providerEmail,
                            salonName,
                            appointment.customer_name || 'Kund',
                            appointment.customer_email || '',
                            appointment.service_name || 'Behandling',
                            bookingDateStr,
                            startTimeStr,
                            appointment.payment_method || 'stripe'
                        );
                        console.log(`[Webhook] Booking notification email sent to provider: ${providerEmail}`);
                    } catch (err) {
                        console.error('[Webhook] Failed to send provider booking notification email:', err);
                    }
                }
            }

            // 3. Add Loyalty Points
            if (customerEmail && salonId) {
                // Find profile by email
                const profile = await prisma.profile.findUnique({
                    where: { email: customerEmail },
                    select: { id: true }
                });

                if (profile) {
                    // Update Global Points
                    await prisma.profile.update({
                        where: { id: profile.id },
                        data: { total_points_earned: { increment: points } }
                    });

                    // Update Salon Specific Points
                    await prisma.loyaltyBalance.upsert({
                        where: { profile_id_salon_id: { profile_id: profile.id, salon_id: salonId } },
                        update: {
                            current_points: { increment: points },
                            total_earned: { increment: points }
                        },
                        create: {
                            profile_id: profile.id,
                            salon_id: salonId,
                            current_points: points,
                            total_earned: points
                        }
                    });

                    // Record Transaction
                    await prisma.pointTransaction.create({
                        data: {
                            profile_id: profile.id,
                            salon_id: salonId,
                            type: 'earned',
                            amount: points,
                            description: 'Bokning via Glowbook'
                        }
                    });
                }
            }
        }
    }

    // 💎 Handle Subscription Success / Initial Activation
    if (event.type === 'checkout.session.completed' && session.mode === 'subscription') {
        const salonId = session.metadata?.salonId;
        const tier = session.metadata?.tier || 'pro';
        const customerId = session.customer;
        const subscriptionId = session.subscription;

        if (salonId) {
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

            console.log(`[Webhook] Salon ${salonId} active. Owner: ${updatedSalon.owner?.email}`);

            // Send Welcome and Receipt emails to the provider
            if (updatedSalon.owner?.email) {
                const firstName = updatedSalon.owner.first_name || updatedSalon.name || 'Utförare';
                
                // 1. Send Welcome Email
                try {
                    await sendProviderWelcomeEmail(updatedSalon.owner.email, firstName);
                    console.log(`[Webhook] Welcome email sent to ${updatedSalon.owner.email}`);
                } catch (err) {
                    console.error('[Webhook] Failed to send welcome email:', err);
                }

                // 2. Send Receipt Email (Base Pricing: Bas 79, Pro 149, Luxe 349)
                const priceMap: Record<string, number> = { bas: 79, pro: 149, luxe: 349 };
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
                    console.log(`[Webhook] Receipt email sent to ${updatedSalon.owner.email}`);
                } catch (err) {
                    console.error('[Webhook] Failed to send receipt email:', err);
                }
            }
        }
    }

    if (event.type === 'invoice.paid') {
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        
        // Find salon by customer ID or subscription ID
        const salons = await prisma.salon.findMany({ 
            where: { 
                OR: [
                    { stripe_customer_id: customerId as string },
                    { stripe_subscription_id: subscriptionId as string }
                ]
            } 
        });

        for (const salon of salons) {
            await prisma.salon.update({
                where: { id: salon.id },
                data: { subscription_status: 'active' }
            });
        }
    }

    // 🔴 Handle Subscription Failure / Deactivation
    if (event.type === 'invoice.payment_failed') {
        const customerId = session.customer;
        const salons = await prisma.salon.findMany({ where: { stripe_customer_id: customerId as string } });
        for (const salon of salons) {
            await prisma.salon.update({
                where: { id: salon.id },
                data: { subscription_status: 'past_due' }
            });
        }
    }

    if (event.type === 'customer.subscription.deleted') {
        const subscriptionId = session.id;
        const salons = await prisma.salon.findMany({ where: { stripe_subscription_id: subscriptionId as string } });
        for (const salon of salons) {
            await prisma.salon.update({
                where: { id: salon.id },
                data: { subscription_status: 'canceled', membership_tier: 'bas' }
            });
        }
    }

    if (event.type === 'customer.subscription.updated') {
        const subscription = event.data.object as any;
        const subscriptionId = subscription.id;
        const status = subscription.status;
        
        // Update status for any salon linked to this subscription
        const salons = await prisma.salon.findMany({ where: { stripe_subscription_id: subscriptionId as string } });
        for (const salon of salons) {
            await prisma.salon.update({
                where: { id: salon.id },
                data: { subscription_status: status }
            });
        }
    }

    return NextResponse.json({ received: true });
}

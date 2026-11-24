import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { stripe } from '@/lib/stripe';
import { sendCustomerCancellationEmail, sendProviderCancellationEmail, sendCustomerCancellationByProviderEmail } from '@/lib/email';
import { emitAvailabilityUpdate } from '@/lib/realtime';

/**
 * Refunds an online Stripe/Klarna Direct Charge on the salon's connected account
 * when a paid booking is cancelled within policy (or cancelled by the salon).
 */
async function processStripeRefundIfPaid(appointment: {
    id: string;
    payment_id: string | null;
    payment_method: string | null;
    status: string | null;
    salon: { stripe_account_id: string | null } | null;
}): Promise<{ refunded: boolean; amount?: number; refundId?: string; skippedReason?: string }> {
    const paymentId = appointment.payment_id;
    const stripeAccountId = appointment.salon?.stripe_account_id;

    if (!paymentId || !stripeAccountId) {
        return { refunded: false, skippedReason: 'no_stripe_payment' };
    }

    if (!paymentId.startsWith('cs_') && !paymentId.startsWith('pi_')) {
        return { refunded: false, skippedReason: 'non_stripe_payment_id' };
    }

    let paymentIntentId: string | undefined;

    try {
        if (paymentId.startsWith('cs_')) {
            const session = await stripe.checkout.sessions.retrieve(
                paymentId,
                {},
                { stripeAccount: stripeAccountId }
            );
            if (session.payment_status !== 'paid') {
                return { refunded: false, skippedReason: 'session_unpaid' };
            }
            paymentIntentId = typeof session.payment_intent === 'string'
                ? session.payment_intent
                : session.payment_intent?.id;
        } else {
            paymentIntentId = paymentId;
        }

        if (!paymentIntentId) {
            return { refunded: false, skippedReason: 'missing_payment_intent' };
        }

        const pi = await stripe.paymentIntents.retrieve(
            paymentIntentId,
            {},
            { stripeAccount: stripeAccountId }
        );

        if (pi.status !== 'succeeded' || (pi.amount_received || 0) <= 0) {
            return { refunded: false, skippedReason: 'intent_not_succeeded' };
        }

        const refundParams: {
            payment_intent: string;
            reason: 'requested_by_customer';
            refund_application_fee?: boolean;
        } = {
            payment_intent: paymentIntentId,
            reason: 'requested_by_customer',
        };

        if (pi.application_fee_amount && pi.application_fee_amount > 0) {
            refundParams.refund_application_fee = true;
        }

        const refund = await stripe.refunds.create(refundParams, {
            stripeAccount: stripeAccountId,
            idempotencyKey: `refund_appointment_${appointment.id}`,
        });

        return {
            refunded: true,
            refundId: refund.id,
            amount: Math.round((refund.amount || pi.amount_received || 0) / 100),
        };
    } catch (err: any) {
        if (err?.code === 'charge_already_refunded') {
            return { refunded: true, skippedReason: 'already_refunded' };
        }
        if (err?.code === 'resource_missing' && paymentId.startsWith('cs_test_')) {
            console.warn(`[Cancel] Skipping refund for test session ${paymentId} in live mode`);
            return { refunded: false, skippedReason: 'test_session_in_live_mode' };
        }
        throw err;
    }
}

/**
 * Automatically restores a customer's gift card balance and reverses the Stripe transfer
 * to the salon when a gift card booking is cancelled within policy (or by salon).
 */
async function processGiftCardRefundIfUsed(appointment: {
    id: string;
    payment_id: string | null;
    payment_method: string | null;
    total_price: any;
    customer_email: string | null;
}): Promise<{ refunded: boolean; amount?: number; cardCode?: string; skippedReason?: string }> {
    const paymentId = appointment.payment_id || '';
    const paymentMethod = appointment.payment_method || '';

    let transferId: string | undefined;
    let cardCode: string | undefined;

    if (paymentId.includes('#gc:')) {
        const parts = paymentId.split('#gc:');
        if (parts[0].startsWith('tr_')) {
            transferId = parts[0].trim();
        }
        cardCode = parts[1]?.trim();
    } else if (paymentId.startsWith('tr_')) {
        transferId = paymentId.trim();
    } else if (paymentId.startsWith('giftcard_')) {
        cardCode = paymentId.replace('giftcard_', '').trim();
    } else if (paymentMethod === 'gift_card') {
        if (paymentId && !paymentId.startsWith('cs_') && !paymentId.startsWith('pi_')) {
            cardCode = paymentId.trim();
        }
    }

    if (!transferId && !cardCode && paymentMethod !== 'gift_card') {
        return { refunded: false, skippedReason: 'no_gift_card_used' };
    }

    // 1. Revert Stripe transfer from salon to Glowbook platform if transfer was executed
    if (transferId) {
        try {
            const transfer = await stripe.transfers.retrieve(transferId);
            if (!cardCode && transfer.metadata?.giftCardCode) {
                cardCode = transfer.metadata.giftCardCode;
            }

            if (!transfer.reversed) {
                await stripe.transfers.createReversal(transferId, {
                    description: `Återkallad överföring vid avbokning av bokning ${appointment.id}`
                });
                console.log(`[Cancel] Successfully reversed Stripe transfer ${transferId} for appointment ${appointment.id}`);
            } else {
                console.log(`[Cancel] Stripe transfer ${transferId} was already reversed.`);
            }
        } catch (revErr: any) {
            console.error(`[Cancel] Stripe transfer reversal failed for ${transferId}:`, revErr);
        }
    }

    // 2. Restore gift card balance in database
    if (cardCode) {
        try {
            const giftCard = await prisma.giftCard.findUnique({
                where: { code: cardCode }
            });

            if (giftCard) {
                const refundAmount = Number(appointment.total_price) || 0;
                const totalValue = Number(giftCard.value);
                const currentBalance = Number(giftCard.remaining_balance);
                const newBalance = Math.min(totalValue, currentBalance + refundAmount);

                await prisma.giftCard.update({
                    where: { id: giftCard.id },
                    data: {
                        remaining_balance: newBalance,
                        status: 'active'
                    }
                });

                console.log(`[Cancel] Restored ${refundAmount} SEK to gift card ${cardCode}. New balance: ${newBalance} SEK.`);

                return {
                    refunded: true,
                    amount: refundAmount,
                    cardCode: cardCode
                };
            } else {
                console.warn(`[Cancel] Gift card with code ${cardCode} not found in database.`);
            }
        } catch (gcErr: any) {
            console.error(`[Cancel] Error restoring gift card balance for ${cardCode}:`, gcErr);
            throw gcErr;
        }
    }

    return { refunded: false, skippedReason: 'card_not_found_or_not_restored' };
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const appointmentId = body.appointmentId || body.bookingId;
        const { bypassPolicy, providerId, skipRefund } = body;

        if (!appointmentId) {
            return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
        }

        // 1. Fetch the appointment along with Salon and Owner details
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                salon: {
                    include: {
                        owner: {
                            select: { email: true, id: true }
                        }
                    }
                }
            }
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        if (appointment.status === 'cancelled') {
            return NextResponse.json({ error: 'Bokningen är redan avbokad' }, { status: 400 });
        }

        // Cancellation policy window check (Only verified salon owners or admins can bypass)
        let canBypass = false;
        if (bypassPolicy && providerId) {
            const profile = await prisma.profile.findUnique({
                where: { id: providerId },
                select: { id: true, role: true }
            });
            if (profile?.role === 'admin' || (profile && appointment.salon?.owner_id === profile.id)) {
                canBypass = true;
            }
        }

        if (!canBypass) {
            const windowHours = appointment.salon?.cancellation_window_hours ?? 24;
            const diffMs = new Date(appointment.start_time).getTime() - Date.now();
            const diffHours = diffMs / (1000 * 60 * 60);

            if (diffHours < windowHours) {
                return NextResponse.json({ 
                    error: `Avbokning nekad: Denna salong tillåter inte avbokningar mindre än ${windowHours} timmar innan besöket.` 
                }, { status: 400 });
            }
        }

        // 1b. Issue automatic Stripe/Klarna refund or Gift Card balance restoration before cancelling in DB
        let refundResult: { refunded: boolean; amount?: number; refundId?: string } = { refunded: false };
        let giftCardRefundResult: { refunded: boolean; amount?: number; cardCode?: string } = { refunded: false };

        if (!skipRefund) {
            try {
                // Check if booking was paid or partially backed by a gift card
                giftCardRefundResult = await processGiftCardRefundIfUsed(appointment);
                if (giftCardRefundResult.refunded) {
                    console.log(`[Cancel] Restored ${giftCardRefundResult.amount ?? ''} SEK to gift card ${giftCardRefundResult.cardCode} for appointment ${appointmentId}`);
                }
            } catch (gcRefundErr: any) {
                console.error('[Cancel] Automatic Gift Card restoration failed:', gcRefundErr);
                return NextResponse.json({
                    error: 'Automatisk återställning av presentkort misslyckades just nu. Bokningen är fortfarande aktiv – vänligen försök igen eller kontakta salongen.'
                }, { status: 502 });
            }

            // If not a gift card booking (or only partial), process direct Stripe refund
            if (!giftCardRefundResult.refunded) {
                try {
                    refundResult = await processStripeRefundIfPaid(appointment);
                    if (refundResult.refunded) {
                        console.log(`[Cancel] Refunded ${refundResult.amount ?? ''} SEK for appointment ${appointmentId} (refund: ${refundResult.refundId || 'existing'})`);
                    }
                } catch (refundErr: any) {
                    console.error('[Cancel] Automatic Stripe refund failed:', refundErr);
                    return NextResponse.json({
                        error: 'Automatisk återbetalning via Stripe misslyckades just nu. Bokningen är fortfarande aktiv – vänligen försök igen eller kontakta salongen.'
                    }, { status: 502 });
                }
            }
        }

        // 2. Update status to cancelled in database
        const updatedAppointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'cancelled' }
        });

        // 2b. Revert loyalty points earned for this appointment (Avbokade tider ger inga poäng!)
        if (appointment.salon?.is_rewards_enabled && appointment.total_price) {
            const amount = Number(appointment.total_price) || 0;
            const pointsToRevert = Math.floor(amount / 10) * 5;

            if (pointsToRevert > 0) {
                try {
                    // Find customer profile by email or customer_id
                    const customerProfile = appointment.customer_email
                        ? await prisma.profile.findUnique({ where: { email: appointment.customer_email } })
                        : (appointment.customer_id ? await prisma.profile.findUnique({ where: { id: appointment.customer_id } }) : null);

                    if (customerProfile && appointment.salon_id) {
                        // 1. Revert salon-specific balance
                        const balance = await prisma.loyaltyBalance.findUnique({
                            where: {
                                profile_id_salon_id: {
                                    profile_id: customerProfile.id,
                                    salon_id: appointment.salon_id
                                }
                            }
                        });

                        if (balance) {
                            const newCurrent = Math.max(0, (balance.current_points || 0) - pointsToRevert);
                            const newTotal = Math.max(0, (balance.total_earned || 0) - pointsToRevert);

                            await prisma.loyaltyBalance.update({
                                where: { id: balance.id },
                                data: {
                                    current_points: newCurrent,
                                    total_earned: newTotal,
                                    updated_at: new Date()
                                }
                            });
                        }

                        // 2. Revert global profile total points
                        const currentGlobal = customerProfile.total_points_earned || 0;
                        await prisma.profile.update({
                            where: { id: customerProfile.id },
                            data: {
                                total_points_earned: Math.max(0, currentGlobal - pointsToRevert)
                            }
                        });

                        // 3. Log point transaction record for cancellation
                        await prisma.pointTransaction.create({
                            data: {
                                profile_id: customerProfile.id,
                                salon_id: appointment.salon_id,
                                amount: -pointsToRevert,
                                type: 'cancelled',
                                description: `Avbokad tid: ${appointment.service_name || 'Behandling'} (-${pointsToRevert} poäng)`
                            }
                        });

                        console.log(`[Cancel] Successfully reverted ${pointsToRevert} loyalty points for customer ${customerProfile.id} due to appointment cancellation`);
                    }
                } catch (loyaltyRevokeErr) {
                    console.error('[Cancel] Error reverting loyalty points on cancellation:', loyaltyRevokeErr);
                }
            }
        }

        // 3. Format Date & Time for email notifications (defensively locked to Sweden/Stockholm timezone to prevent UTC offsets)
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

        // 4. Send cancellation email to customer
        const emailRefundInfo = giftCardRefundResult.refunded
            ? { refunded: true, amount: giftCardRefundResult.amount, isGiftCard: true, cardCode: giftCardRefundResult.cardCode }
            : refundResult.refunded
                ? { refunded: true, amount: refundResult.amount, isGiftCard: false }
                : undefined;

        if (appointment.customer_email) {
            try {
                if (bypassPolicy) {
                    await sendCustomerCancellationByProviderEmail(
                        appointment.customer_email,
                        appointment.customer_name || 'Kund',
                        salonName,
                        appointment.service_name || 'Behandling',
                        bookingDateStr,
                        startTimeStr,
                        emailRefundInfo
                    );
                } else {
                    await sendCustomerCancellationEmail(
                        appointment.customer_email,
                        appointment.customer_name || 'Kund',
                        salonName,
                        appointment.service_name || 'Behandling',
                        bookingDateStr,
                        startTimeStr,
                        emailRefundInfo
                    );
                }
            } catch (emailErr) {
                console.error('Error sending customer cancellation email:', emailErr);
            }
        }

        // 5. Send cancellation email to provider
        if (providerEmail) {
            try {
                await sendProviderCancellationEmail(
                    providerEmail,
                    salonName,
                    appointment.customer_name || 'Kund',
                    appointment.service_name || 'Behandling',
                    bookingDateStr,
                    startTimeStr,
                    emailRefundInfo
                );
            } catch (emailErr) {
                console.error('Error sending provider cancellation email:', emailErr);
            }
        }

        // Emit real‑time update so clients refresh availability
        if (appointment.salon_id) {
            emitAvailabilityUpdate(appointment.salon_id, { salonId: appointment.salon_id });
        }

        const wasRefunded = refundResult.refunded || giftCardRefundResult.refunded;
        const totalRefundAmount = giftCardRefundResult.amount || refundResult.amount;

        return NextResponse.json({
            success: true,
            refunded: wasRefunded,
            refundAmount: totalRefundAmount,
            isGiftCard: giftCardRefundResult.refunded,
            message: giftCardRefundResult.refunded
                ? `Bokningen har avbokats och ${giftCardRefundResult.amount} kr har automatiskt återförts till ditt presentkort (${giftCardRefundResult.cardCode}).`
                : refundResult.refunded
                    ? `Bokningen har avbokats och ${refundResult.amount ? `${refundResult.amount} kr` : 'beloppet'} återbetalas automatiskt till ditt ursprungliga betalsätt.`
                    : 'Bokningen har avbokats framgångsrikt.'
        });

    } catch (error) {
        console.error('Booking cancellation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

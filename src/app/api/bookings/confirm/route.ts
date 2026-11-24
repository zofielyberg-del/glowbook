import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCustomerBookingConfirmation, sendProviderBookingNotification, sendGiftCardUsageEmail } from '@/lib/email';
import { emitAvailabilityUpdate } from '@/lib/realtime';
import { getStockholmDate } from '@/lib/date';
import { stripe } from '@/lib/stripe';


export async function POST(req: Request) {
    try {
        const {
            salonId,
            serviceId,
            serviceName,
            practitionerId,
            startTime, // "09:00"
            date,      // "2026-05-14"
            duration = 30,
            price,
            customerInfo,
            paymentMethod,
            status = 'confirmed',
            start_time, // Exact UTC string from frontend
            end_time,   // Exact UTC string from frontend
            rewardInfo,
            giftCardCode,
            giftCardDiscount,
            addedProducts
        } = await req.json();

        if (!salonId || !serviceName || !customerInfo?.email || !date || !startTime) {
            return NextResponse.json({ error: 'Missing required booking data' }, { status: 400 });
        }

        // Parse date and time correctly, locked to Europe/Stockholm timezone to prevent browser/server offsets.
        const startDateTime = getStockholmDate(date, startTime);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

        // Check if startDateTime is in the past
        const now = new Date();
        // Give 5 minutes buffer for network delays or small clock drift
        if (startDateTime.getTime() < now.getTime() - 300000) {
            return NextResponse.json({ error: 'Bokningstiden har redan passerat. Vänligen välj en framtida tid.' }, { status: 400 });
        }

        // 1. Check for Overlaps (Double booking prevention)
        const isUUID = (id: string) => id && id.length > 20;
        const requestedPid = isUUID(practitionerId) ? practitionerId : undefined;
        const sid = isUUID(salonId) ? salonId : undefined;

        if (sid) {
            if (requestedPid && requestedPid !== 'any' && requestedPid !== 'owner') {
                const overlap = await prisma.appointment.findFirst({
                    where: {
                        salon_id: sid,
                        practitioner_id: requestedPid,
                        status: { not: 'cancelled' },
                        AND: [
                            { start_time: { lt: endDateTime } },
                            { end_time: { gt: startDateTime } }
                        ]
                    }
                });

                if (overlap) {
                    return NextResponse.json({ 
                        error: 'Tiden är tyvärr redan bokad för denna utövare. Vänligen välj en annan tid.' 
                    }, { status: 409 });
                }
            } else {
                // If 'any' is requested, check if at least one practitioner is available
                const activePractitioners = await prisma.practitioner.findMany({
                    where: { salon_id: sid, status: 'active' }
                });

                if (activePractitioners.length > 0) {
                    const busyAppointments = await prisma.appointment.findMany({
                        where: {
                            salon_id: sid,
                            status: { not: 'cancelled' },
                            AND: [
                                { start_time: { lt: endDateTime } },
                                { end_time: { gt: startDateTime } }
                            ]
                        },
                        select: { practitioner_id: true }
                    });
                    const busyIds = new Set(busyAppointments.map(a => a.practitioner_id).filter(Boolean));
                    const hasFreePractitioner = activePractitioners.some(p => !busyIds.has(p.id));
                    if (!hasFreePractitioner) {
                        return NextResponse.json({ 
                            error: 'Tiden är tyvärr redan fullbokad hos alla utövare. Vänligen välj en annan tid.' 
                        }, { status: 409 });
                    }
                } else {
                    const overlap = await prisma.appointment.findFirst({
                        where: {
                            salon_id: sid,
                            status: { not: 'cancelled' },
                            AND: [
                                { start_time: { lt: endDateTime } },
                                { end_time: { gt: startDateTime } }
                            ]
                        }
                    });
                    if (overlap) {
                        return NextResponse.json({ 
                            error: 'Tiden är tyvärr redan bokad. Vänligen välj en annan tid.' 
                        }, { status: 409 });
                    }
                }
            }
        }

        const isPlaceholderEmail = String(customerInfo.email || '').toLowerCase().endsWith('@noemail.glowbook.se');

        // 2. Create or update customer profile (skip dummy manual-booking emails)
        let profileId: string | undefined;
        if (!isPlaceholderEmail) try {
            const existingProfile = await prisma.profile.findUnique({
                where: { email: customerInfo.email },
                select: { id: true, role: true, password_hash: true }
            });

            if (existingProfile) {
                // Only update name/phone for guest placeholder profiles or when the logged-in customer is updating their own profile
                const isCustomerProfile = existingProfile.role === 'customer' || !existingProfile.role;
                const canUpdateDetails = isCustomerProfile && (!existingProfile.password_hash || customerInfo.isLoggedIn === true);
                if (canUpdateDetails) {
                    const profile = await prisma.profile.update({
                        where: { id: existingProfile.id },
                        data: {
                            first_name: customerInfo.firstName,
                            last_name: customerInfo.lastName,
                            phone: customerInfo.phone
                        },
                        select: { id: true }
                    });
                    profileId = profile?.id;
                } else {
                    profileId = existingProfile.id;
                }
            } else {
                const profile = await prisma.profile.create({
                    data: {
                        email: customerInfo.email,
                        first_name: customerInfo.firstName,
                        last_name: customerInfo.lastName,
                        phone: customerInfo.phone,
                        role: 'customer'
                    },
                    select: { id: true }
                });
                profileId = profile?.id;
            }
        } catch (profileError) {
            console.error('Error syncing customer profile:', profileError);
        }

        // Fetch Salon details to get owner email and salon name
        let salonName = 'Salongen';
        let providerEmail = '';
        let messageTemplates: any = null;
        let isRewardsEnabled = false;
        let cancellationWindowHours = 24;
        let stripeAccountId: string | null = null;
        let salonTier: string = 'bas';
        if (sid) {
            try {
                const salonDetails = await prisma.salon.findUnique({
                    where: { id: sid },
                    select: {
                        name: true,
                        is_rewards_enabled: true,
                        message_templates: true,
                        cancellation_window_hours: true,
                        stripe_account_id: true,
                        membership_tier: true,
                        owner: {
                            select: { email: true }
                        }
                    }
                });
                if (salonDetails) {
                    salonName = salonDetails.name;
                    providerEmail = salonDetails.owner?.email || '';
                    isRewardsEnabled = !!salonDetails.is_rewards_enabled;
                    cancellationWindowHours = salonDetails.cancellation_window_hours ?? 24;
                    stripeAccountId = salonDetails.stripe_account_id || null;
                    salonTier = (salonDetails.membership_tier || 'bas').toLowerCase();
                    if (salonDetails.message_templates) {
                        messageTemplates = typeof salonDetails.message_templates === 'string'
                            ? JSON.parse(salonDetails.message_templates)
                            : salonDetails.message_templates;
                    }
                }
            } catch (salonFetchError) {
                console.error('Error fetching salon details for email notification:', salonFetchError);
            }
        }

        // Validate Gift Card eligibility for salon (requires Stripe Connect + Pro/Luxe)
        const isUsingGiftCard = paymentMethod === 'giftcard' || (giftCardCode && String(giftCardCode).trim().length > 0);
        if (isUsingGiftCard && sid) {
            if (!stripeAccountId) {
                return NextResponse.json({
                    error: 'Salongen har inte aktiverat Stripe och kan därför inte ta emot presentkort som betalsätt.'
                }, { status: 400 });
            }
            if (!['pro', 'luxe'].includes(salonTier)) {
                return NextResponse.json({
                    error: 'Presentkort kan endast användas hos salonger med medlemskap Pro eller Luxe.'
                }, { status: 400 });
            }
        }

        type RedeemedGiftCardInfo = {
            recipient_email: string | null;
            recipient_name: string | null;
            code: string;
            remaining_balance: number;
            amount: number;
        };
        let redeemedGiftCard = null as RedeemedGiftCardInfo | null;

        // 3. Insert appointment (plus atomic giftcard / loyalty deduction for direct bookings)
        let appointment;
        try {
            appointment = await prisma.$transaction(async (tx) => {
                let assignedPractitionerId = requestedPid !== 'any' && requestedPid !== 'owner' ? requestedPid : undefined;

                if (sid) {
                    if (assignedPractitionerId) {
                        const overlap = await tx.appointment.findFirst({
                            where: {
                                salon_id: sid,
                                practitioner_id: assignedPractitionerId,
                                status: { not: 'cancelled' },
                                AND: [
                                    { start_time: { lt: endDateTime } },
                                    { end_time: { gt: startDateTime } }
                                ]
                            }
                        });

                        if (overlap) {
                            throw new Error('SLOT_TAKEN');
                        }
                    } else {
                        // Find active practitioners in the salon and assign the first free one
                        const activePractitioners = await tx.practitioner.findMany({
                            where: { salon_id: sid, status: 'active' }
                        });

                        if (activePractitioners.length > 0) {
                            const busyAppointments = await tx.appointment.findMany({
                                where: {
                                    salon_id: sid,
                                    status: { not: 'cancelled' },
                                    AND: [
                                        { start_time: { lt: endDateTime } },
                                        { end_time: { gt: startDateTime } }
                                    ]
                                },
                                select: { practitioner_id: true }
                            });
                            const busyIds = new Set(busyAppointments.map(a => a.practitioner_id).filter(Boolean));
                            const availablePractitioners = activePractitioners.filter(p => !busyIds.has(p.id));
                            if (availablePractitioners.length === 0) {
                                throw new Error('SLOT_TAKEN');
                            }
                            assignedPractitionerId = availablePractitioners[0].id;
                        } else {
                            const overlap = await tx.appointment.findFirst({
                                where: {
                                    salon_id: sid,
                                    status: { not: 'cancelled' },
                                    AND: [
                                        { start_time: { lt: endDateTime } },
                                        { end_time: { gt: startDateTime } }
                                    ]
                                }
                            });
                            if (overlap) {
                                throw new Error('SLOT_TAKEN');
                            }
                        }
                    }
                }

                // 3a-extra. For direct (non-Stripe) bookings, atomically redeem gift card & Glowpoints inside the transaction
                if (paymentMethod !== 'stripe') {
                    const numericDiscount = Number(giftCardDiscount || 0);
                    if (giftCardCode && numericDiscount > 0) {
                        const normalizedCode = String(giftCardCode).trim().toUpperCase();
                        const card = await tx.giftCard.findUnique({ where: { code: normalizedCode } });
                        if (!card) throw new Error('GIFTCARD_NOT_FOUND');
                        if (card.status !== 'active') throw new Error('GIFTCARD_NOT_ACTIVE');
                        if (card.expires_at && new Date(card.expires_at) < new Date()) throw new Error('GIFTCARD_EXPIRED');
                        const currentBal = Number(card.remaining_balance);
                        if (currentBal < numericDiscount) throw new Error('GIFTCARD_INSUFFICIENT');
                        const nextBal = Math.max(0, currentBal - numericDiscount);
                        await tx.giftCard.update({
                            where: { id: card.id },
                            data: {
                                remaining_balance: nextBal,
                                status: nextBal <= 0 ? 'used' : 'active'
                            }
                        });
                        redeemedGiftCard = {
                            recipient_email: card.recipient_email,
                            recipient_name: card.recipient_name,
                            code: card.code,
                            remaining_balance: nextBal,
                            amount: numericDiscount
                        };
                    }

                    const pointsCost = Math.floor(Number(rewardInfo?.pointsCost || 0));
                    if (pointsCost > 0 && profileId && sid) {
                        const balance = await tx.loyaltyBalance.findUnique({
                            where: { profile_id_salon_id: { profile_id: profileId, salon_id: sid } },
                            select: { id: true, current_points: true }
                        });
                        if (!balance || (balance.current_points ?? 0) < pointsCost) {
                            throw new Error('INSUFFICIENT_POINTS');
                        }
                        await tx.loyaltyBalance.update({
                            where: { id: balance.id },
                            data: {
                                current_points: (balance.current_points ?? 0) - pointsCost,
                                updated_at: new Date()
                            }
                        });
                        await tx.pointTransaction.create({
                            data: {
                                profile_id: profileId,
                                salon_id: sid,
                                amount: pointsCost,
                                type: 'spent',
                                description: `Inlösen: ${rewardInfo.label || `${rewardInfo.discountAmount || 50} kr rabatt`} för ${serviceName}`
                            }
                        });
                    }
                }

                // 3b. Create appointment
                return await tx.appointment.create({
                    data: {
                        salon_id: sid,
                        service_id: serviceId && isUUID(serviceId) ? serviceId : undefined,
                        service_name: serviceName,
                        practitioner_id: assignedPractitionerId,
                        customer_id: profileId,
                        customer_email: customerInfo.email,
                        customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
                        customer_phone: customerInfo.phone,
                        start_time: startDateTime,
                        end_time: endDateTime,
                        booking_date: new Date(date),
                        total_price: price,
                        status: status,
                        payment_method: paymentMethod
                    }
                });
            });
        } catch (appointmentError: any) {
            console.error('Error creating appointment:', appointmentError);
            if (appointmentError.message === 'SLOT_TAKEN') {
                return NextResponse.json({ error: 'Tiden har tyvärr precis blivit bokad av någon annan. Vänligen välj en ny tid.' }, { status: 409 });
            }
            if (appointmentError.message === 'GIFTCARD_NOT_FOUND') {
                return NextResponse.json({ error: 'Presentkortet hittades inte.' }, { status: 404 });
            }
            if (appointmentError.message === 'GIFTCARD_NOT_ACTIVE') {
                return NextResponse.json({ error: 'Presentkortet är inte längre aktivt.' }, { status: 400 });
            }
            if (appointmentError.message === 'GIFTCARD_EXPIRED') {
                return NextResponse.json({ error: 'Presentkortets giltighetstid har gått ut.' }, { status: 400 });
            }
            if (appointmentError.message === 'GIFTCARD_INSUFFICIENT') {
                return NextResponse.json({ error: 'Saldot på presentkortet räcker inte till.' }, { status: 400 });
            }
            if (appointmentError.message === 'INSUFFICIENT_POINTS') {
                return NextResponse.json({ error: 'Inte tillräckligt med poäng.' }, { status: 400 });
            }
            return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
        }

        // Decrement product inventory stock if products were added to this booking
        if (Array.isArray(addedProducts) && addedProducts.length > 0 && sid) {
            try {
                const s = await prisma.salon.findUnique({
                    where: { id: sid },
                    select: { availability: true }
                });
                const availabilityArr = Array.isArray(s?.availability) ? (s.availability as any[]) : [];
                const prodBlock = availabilityArr.find((a: any) => a && (a.type === 'products' || a.type === 'addons'));
                if (prodBlock && Array.isArray(prodBlock.list)) {
                    let stockUpdated = false;
                    const updatedProducts = prodBlock.list.map((prod: any) => {
                        const bought = addedProducts.find((it: any) => 
                            (it.id && String(it.id) === String(prod.id)) ||
                            (it.name && it.name.trim().toLowerCase() === (prod.name || '').trim().toLowerCase())
                        );
                        if (bought) {
                            const qty = Math.max(1, Number(bought.quantity) || 1);
                            const currentStock = typeof prod.stock === 'number' ? prod.stock : (parseInt(prod.stock, 10) || 0);
                            const newStock = Math.max(0, currentStock - qty);
                            stockUpdated = true;
                            return { ...prod, stock: newStock };
                        }
                        return prod;
                    });
                    if (stockUpdated) {
                        const filteredAvail = availabilityArr.filter((a: any) => a && a.type !== 'products' && a.type !== 'addons');
                        await prisma.salon.update({
                            where: { id: sid },
                            data: {
                                availability: [...filteredAvail, { type: 'products', list: updatedProducts }]
                            }
                        });
                    }
                }
            } catch (pErr) {
                console.error('[Confirm] Error updating product stock:', pErr);
            }
        }

        // 4. Send Email Notifications (Only for non-Stripe direct payments like onsite/giftcard)
        // Stripe payments will receive confirmations via webhook after successful payment.
        if (paymentMethod !== 'stripe') {
            const amount = Number(price) || 0;
            const pointsEarned = Math.floor(amount / 10) * 5;

            // Check if customer actually has a registered account and was logged in
            let isCustomerRegistered = false;
            if (customerInfo.isLoggedIn === false) {
                // Booked as guest without active customer login session
                isCustomerRegistered = false;
            } else if (customerInfo.email) {
                try {
                    const existingProfile = await prisma.profile.findUnique({
                        where: { email: customerInfo.email },
                        select: { id: true, password_hash: true }
                    });
                    isCustomerRegistered = Boolean(existingProfile?.password_hash);
                } catch { }
            }

            // Send Gift Card usage notice email if gift card was redeemed
            if (redeemedGiftCard?.recipient_email) {
                try {
                    await sendGiftCardUsageEmail(
                        redeemedGiftCard.recipient_email,
                        redeemedGiftCard.recipient_name || 'mottagare',
                        salonName,
                        redeemedGiftCard.amount,
                        redeemedGiftCard.code,
                        redeemedGiftCard.remaining_balance
                    );
                } catch (gcMailErr) {
                    console.error('[Confirm] Failed sending gift card usage email:', gcMailErr);
                }
            }

            // Transfer redeemed gift card funds directly from Glowbook platform balance to salon connected Stripe account
            if (redeemedGiftCard && redeemedGiftCard.amount > 0 && stripeAccountId) {
                try {
                    const transferAmountOre = Math.round(Number(redeemedGiftCard.amount) * 100);
                    const transfer = await stripe.transfers.create({
                        amount: transferAmountOre,
                        currency: 'sek',
                        destination: stripeAccountId,
                        description: `Glowbook Presentkort: ${serviceName} (${appointment.id})`,
                        metadata: {
                            appointmentId: appointment.id,
                            giftCardCode: redeemedGiftCard.code,
                            serviceName: serviceName,
                            salonId: sid || '',
                            customerEmail: customerInfo.email || ''
                        }
                    });
                    console.log(`[Stripe Transfer] Successfully transferred ${redeemedGiftCard.amount} SEK to salon account ${stripeAccountId}. Transfer ID: ${transfer.id}`);
                    await prisma.appointment.update({
                        where: { id: appointment.id },
                        data: { payment_id: transfer.id }
                    });
                } catch (transferErr: any) {
                    const errMsg = transferErr?.message || String(transferErr);
                    console.error('[Stripe Transfer Failed]:', errMsg);
                    await prisma.appointment.update({
                        where: { id: appointment.id },
                        data: { payment_id: `transfer_error: ${errMsg.slice(0, 150)}` }
                    });
                }
            }

            // Award loyalty points if salon has rewards enabled and customer has account
            if (isRewardsEnabled && pointsEarned > 0 && profileId && sid) {
                try {
                    // 1. Update or create Salon-specific loyalty balance
                    await prisma.loyaltyBalance.upsert({
                        where: {
                            profile_id_salon_id: {
                                profile_id: profileId,
                                salon_id: sid
                            }
                        },
                        update: {
                            current_points: { increment: pointsEarned },
                            total_earned: { increment: pointsEarned },
                            updated_at: new Date()
                        },
                        create: {
                            profile_id: profileId,
                            salon_id: sid,
                            current_points: pointsEarned,
                            total_earned: pointsEarned
                        }
                    });

                    // 2. Add transaction record
                    await prisma.pointTransaction.create({
                        data: {
                            profile_id: profileId,
                            salon_id: sid,
                            amount: pointsEarned,
                            type: 'earned',
                            description: `Bokning: ${serviceName} (${amount} SEK)`
                        }
                    });

                    // 3. Update global points across Glowbook
                    await prisma.profile.update({
                        where: { id: profileId },
                        data: {
                            total_points_earned: { increment: pointsEarned }
                        }
                    });
                    console.log(`[Confirm] Granted ${pointsEarned} loyalty points to customer ${profileId} for salon ${sid}`);
                } catch (loyaltyErr) {
                    console.error('[Confirm] Error granting loyalty points:', loyaltyErr);
                }
            }

            try {
                if (customerInfo.email && !isPlaceholderEmail) {
                    await sendCustomerBookingConfirmation(
                        customerInfo.email,
                        `${customerInfo.firstName} ${customerInfo.lastName}`,
                        salonName,
                        serviceName,
                        date,
                        startTime,
                        `${price} SEK`,
                        appointment.id,
                        messageTemplates,
                        {
                            pointsEarned,
                            isRegistered: isCustomerRegistered,
                            salonHasRewards: isRewardsEnabled
                        },
                        cancellationWindowHours
                    );
                }
            } catch (customerEmailErr) {
                console.error('Error sending customer booking email:', customerEmailErr);
            }

            try {
                if (providerEmail && !isPlaceholderEmail) {
                    await sendProviderBookingNotification(
                        providerEmail,
                        salonName,
                        `${customerInfo.firstName} ${customerInfo.lastName}`,
                        customerInfo.email,
                        serviceName,
                        date,
                        startTime,
                        paymentMethod
                    );
                }
            } catch (providerEmailErr) {
                console.error('Error sending provider booking email:', providerEmailErr);
            }
        }

        // Emit real‑time update so clients refresh availability
        if (salonId) {
            emitAvailabilityUpdate(salonId, { salonId });
        }

        return NextResponse.json({
            success: true,
            appointmentId: appointment.id,
            appointment
        });

    } catch (error) {
        console.error('Booking confirmation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

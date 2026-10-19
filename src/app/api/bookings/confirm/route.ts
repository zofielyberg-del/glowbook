import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCustomerBookingConfirmation, sendProviderBookingNotification } from '@/lib/email';
import { emitAvailabilityUpdate } from '@/lib/realtime';
import { getStockholmDate } from '@/lib/date';


export async function POST(req: Request) {
    try {
        const {
            salonId,
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
            rewardInfo
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

        // 2. Create or update customer profile
        let profileId: string | undefined;
        try {
            const existingProfile = await prisma.profile.findUnique({
                where: { email: customerInfo.email },
                select: { id: true, role: true }
            });

            if (existingProfile) {
                // If they are a provider, owner, admin, etc. do NOT update their profile name/phone with booking inputs
                if (existingProfile.role === 'customer' || !existingProfile.role) {
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
        if (sid) {
            try {
                const salonDetails = await prisma.salon.findUnique({
                    where: { id: sid },
                    select: {
                        name: true,
                        is_rewards_enabled: true,
                        message_templates: true,
                        owner: {
                            select: { email: true }
                        }
                    }
                });
                if (salonDetails) {
                    salonName = salonDetails.name;
                    providerEmail = salonDetails.owner?.email || '';
                    isRewardsEnabled = !!salonDetails.is_rewards_enabled;
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

        // 3. Insert appointment using atomic transaction to prevent double bookings
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

                // 3b. Create appointment
                return await tx.appointment.create({
                    data: {
                        salon_id: sid,
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
            return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
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

            // Deduct redeemed points if used (and not already spent via /api/loyalty/spend)
            if (rewardInfo && rewardInfo.pointsCost && profileId && sid) {
                try {
                    const fifteenSecondsAgo = new Date(Date.now() - 15000);
                    const alreadySpent = await prisma.pointTransaction.findFirst({
                        where: {
                            profile_id: profileId,
                            salon_id: sid,
                            type: 'spent',
                            amount: rewardInfo.pointsCost,
                            created_at: { gte: fifteenSecondsAgo }
                        }
                    });

                    if (!alreadySpent) {
                        await prisma.loyaltyBalance.updateMany({
                            where: { profile_id: profileId, salon_id: sid },
                            data: { current_points: { decrement: rewardInfo.pointsCost } }
                        });
                        await prisma.pointTransaction.create({
                            data: {
                                profile_id: profileId,
                                salon_id: sid,
                                amount: rewardInfo.pointsCost,
                                type: 'spent',
                                description: `Inlösen: ${rewardInfo.label || `${rewardInfo.discountAmount || 50} kr rabatt`}`
                            }
                        });
                    }
                } catch (redeemErr) {
                    console.error('[Confirm] Error deducting redeemed loyalty points:', redeemErr);
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
                if (customerInfo.email) {
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
                        }
                    );
                }
            } catch (customerEmailErr) {
                console.error('Error sending customer booking email:', customerEmailErr);
            }

            try {
                if (providerEmail) {
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

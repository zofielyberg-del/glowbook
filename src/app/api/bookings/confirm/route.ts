import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCustomerBookingConfirmation, sendProviderBookingNotification } from '@/lib/email';
import { emitAvailabilityUpdate } from '@/lib/realtime';

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
            end_time    // Exact UTC string from frontend
        } = await req.json();

        if (!salonId || !serviceName || !customerInfo?.email || !date || !startTime) {
            return NextResponse.json({ error: 'Missing required booking data' }, { status: 400 });
        }

        // Parse date and time correctly. Prefer exact UTC timestamps if provided to avoid server timezone drift.
        const startDateTime = start_time ? new Date(start_time) : new Date(`${date}T${startTime}`);
        const endDateTime = end_time ? new Date(end_time) : new Date(startDateTime.getTime() + duration * 60000);

        // Check if startDateTime is in the past
        const now = new Date();
        // Give 5 minutes buffer for network delays or small clock drift
        if (startDateTime.getTime() < now.getTime() - 300000) {
            return NextResponse.json({ error: 'Bokningstiden har redan passerat. Vänligen välj en framtida tid.' }, { status: 400 });
        }

        // 1. Check for Overlaps (Double booking prevention)
        const isUUID = (id: string) => id && id.length > 20;
        const pid = isUUID(practitionerId) ? practitionerId : undefined;
        const sid = isUUID(salonId) ? salonId : undefined;

        if (sid) {
            const overlap = await prisma.appointment.findFirst({
                where: {
                    salon_id: sid,
                    practitioner_id: pid,
                    status: { not: 'cancelled' },
                    OR: [
                        {
                            // New starts during existing
                            start_time: { lte: startDateTime },
                            end_time: { gt: startDateTime }
                        },
                        {
                            // New ends during existing
                            start_time: { lt: endDateTime },
                            end_time: { gte: endDateTime }
                        },
                        {
                            // New fully wraps existing
                            start_time: { gte: startDateTime },
                            end_time: { lte: endDateTime }
                        }
                    ]
                }
            });

            if (overlap) {
                return NextResponse.json({ 
                    error: 'Tiden är tyvärr redan bokad. Vänligen välj en annan tid.' 
                }, { status: 409 });
            }
        }

        // 2. Create or update customer profile
        let profileId: string | undefined;
        try {
            const profile = await prisma.profile.upsert({
                where: { email: customerInfo.email },
                update: {
                    first_name: customerInfo.firstName,
                    last_name: customerInfo.lastName,
                    phone: customerInfo.phone
                },
                create: {
                    email: customerInfo.email,
                    first_name: customerInfo.firstName,
                    last_name: customerInfo.lastName,
                    phone: customerInfo.phone,
                    role: 'customer'
                },
                select: { id: true }
            });
            profileId = profile?.id;
        } catch (profileError) {
            console.error('Error syncing customer profile:', profileError);
        }

        // Fetch Salon details to get owner email and salon name
        let salonName = 'Salongen';
        let providerEmail = '';
        if (sid) {
            try {
                const salonDetails = await prisma.salon.findUnique({
                    where: { id: sid },
                    include: {
                        owner: {
                            select: { email: true }
                        }
                    }
                });
                if (salonDetails) {
                    salonName = salonDetails.name;
                    providerEmail = salonDetails.owner?.email || '';
                }
            } catch (salonFetchError) {
                console.error('Error fetching salon details for email notification:', salonFetchError);
            }
        }

        // 3. Insert appointment using atomic transaction to prevent double bookings
        let appointment;
        try {
            appointment = await prisma.$transaction(async (tx) => {
                // 3a. Check for overlap
                const overlap = await tx.appointment.findFirst({
                    where: {
                        salon_id: sid,
                        practitioner_id: pid !== 'any' && pid !== 'owner' ? pid : undefined,
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

                // 3b. Create appointment
                return await tx.appointment.create({
                    data: {
                        salon_id: sid,
                        service_name: serviceName,
                        practitioner_id: pid,
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
                        appointment.id
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
            appointmentId: appointment.id
        });

    } catch (error) {
        console.error('Booking confirmation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

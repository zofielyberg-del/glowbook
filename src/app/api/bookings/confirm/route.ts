
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

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
            status = 'confirmed'
        } = await req.json();

        if (!salonId || !serviceName || !customerInfo?.email || !date || !startTime) {
            return NextResponse.json({ error: 'Missing required booking data' }, { status: 400 });
        }

        // Parse date and time correctly
        const startDateTime = new Date(`${date}T${startTime}`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

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
                    phone: customerInfo.phone,
                    role: 'customer'
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

        // 3. Insert appointment
        let appointment;
        try {
            appointment = await prisma.appointment.create({
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
        } catch (appointmentError) {
            console.error('Error creating appointment:', appointmentError);
            return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 });
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


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const {
            salonId,
            serviceName,
            practitionerId,
            startTime,
            date,
            price,
            customerInfo,
            paymentMethod,
            status = 'confirmed'
        } = await req.json();

        if (!salonId || !serviceName || !customerInfo?.email) {
            return NextResponse.json({ error: 'Missing required booking data' }, { status: 400 });
        }

        // 1. Create or update customer profile (Sync with database)
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
            // We can continue booking even if profile sync fails, but better to log it
        }

        // 2. Insert appointment
        const isUUID = (id: string) => id && id.length > 20;

        let appointment;
        try {
            appointment = await prisma.appointment.create({
                data: {
                    salon_id: isUUID(salonId) ? salonId : undefined,
                    service_name: serviceName,
                    practitioner_id: isUUID(practitionerId) ? practitionerId : undefined,
                    customer_id: profileId,
                    customer_email: customerInfo.email,
                    customer_name: `${customerInfo.firstName} ${customerInfo.lastName}`,
                    customer_phone: customerInfo.phone,
                    start_time: new Date(startTime),
                    booking_date: date ? new Date(date) : undefined,
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

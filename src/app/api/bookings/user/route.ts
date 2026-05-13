
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { userId, email } = await req.json();

        if (!userId && !email) {
            return NextResponse.json({ error: 'Missing user identification' }, { status: 400 });
        }

        let whereClause: any = {};
        if (userId) {
            whereClause = { customer_id: userId };
        } else if (email) {
            whereClause = { customer_email: email };
        }

        let appointments;
        try {
            appointments = await prisma.appointment.findMany({
                where: whereClause,
                select: {
                    id: true,
                    service_name: true,
                    customer_name: true,
                    customer_email: true,
                    start_time: true,
                    booking_date: true,
                    total_price: true,
                    status: true,
                    practitioner_id: true,
                    salon_id: true,
                    salon: { select: { name: true } }
                },
                orderBy: { booking_date: 'desc' }
            });
        } catch (error) {
            console.error('Error fetching user bookings:', error);
            return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
        }

        // Map database fields to frontend fields if necessary
        const mapped = (appointments as any[]).map(apt => ({
            id: apt.id,
            service: apt.service_name,
            provider: apt.salon?.name || 'Okänd salong',
            date: apt.booking_date,
            time: apt.start_time,
            price: apt.total_price,
            status: apt.status === 'confirmed' ? 'upcoming' : apt.status
        }));

        return NextResponse.json({
            success: true,
            bookings: mapped
        });

    } catch (error) {
        console.error('User bookings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

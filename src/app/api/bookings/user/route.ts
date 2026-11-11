
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { userId, email } = await req.json();

        if (!userId && !email) {
            return NextResponse.json({ error: 'Missing user identification' }, { status: 400 });
        }

        const orConditions: any[] = [];
        if (userId) orConditions.push({ customer_id: userId });
        if (email) orConditions.push({ customer_email: { equals: email.trim(), mode: 'insensitive' } });

        const whereClause: any = {
            OR: orConditions,
            status: { not: 'pending_payment' }
        };

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
                    salon: { select: { name: true, country: true, slug: true } }
                },
                orderBy: { start_time: 'desc' }
            });
        } catch (error) {
            console.error('Error fetching user bookings:', error);
            return NextResponse.json({ error: 'Failed to fetch bookings' }, { status: 500 });
        }

        const dateFmt = new Intl.DateTimeFormat('sv-SE', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            timeZone: 'Europe/Stockholm'
        });
        const timeFmt = new Intl.DateTimeFormat('sv-SE', {
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
            timeZone: 'Europe/Stockholm'
        });

        // Map database fields to frontend fields if necessary
        const mapped = (appointments as any[]).map(apt => {
            const refDate = apt.start_time ? new Date(apt.start_time) : (apt.booking_date ? new Date(apt.booking_date) : null);
            const dateStr = refDate ? dateFmt.format(refDate) : '';
            const timeStr = apt.start_time ? timeFmt.format(new Date(apt.start_time)) : '';
            const mappedStatus = ['confirmed', 'paid'].includes(apt.status) ? 'upcoming' : apt.status;
            return {
                id: apt.id,
                service: apt.service_name,
                provider: apt.salon?.name || 'Okänd salong',
                salonId: apt.salon_id,
                salonSlug: apt.salon?.slug,
                date: dateStr || apt.booking_date,
                time: timeStr || apt.start_time,
                startTimeRaw: apt.start_time,
                price: Number(apt.total_price || 0),
                currency: apt.salon?.country === 'NO' ? 'NOK' : apt.salon?.country === 'DK' ? 'DKK' : apt.salon?.country === 'FI' ? 'EUR' : 'kr',
                status: mappedStatus,
                rawStatus: apt.status
            };
        });

        return NextResponse.json({
            success: true,
            bookings: mapped
        });

    } catch (error) {
        console.error('User bookings error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

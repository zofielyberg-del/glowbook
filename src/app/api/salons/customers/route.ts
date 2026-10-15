import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const salonId = searchParams.get('salonId');

        if (!salonId) {
            return NextResponse.json({ error: 'Salongs-ID saknas' }, { status: 400 });
        }

        // Fetch all appointments for this salon to build the customer directory
        const appointments = await prisma.appointment.findMany({
            where: { salon_id: salonId },
            orderBy: { start_time: 'desc' },
            select: {
                id: true,
                customer_id: true,
                customer_name: true,
                customer_email: true,
                customer_phone: true,
                start_time: true,
                status: true
            }
        });

        // Group by email (or phone/id) to aggregate customer visit statistics
        const customerMap: Record<string, any> = {};

        for (const apt of appointments) {
            const rawEmail = apt.customer_email || '';
            const emailKey = rawEmail.toLowerCase().trim();
            const key = emailKey || apt.customer_phone || apt.id;
            if (!key) continue;

            if (!customerMap[key]) {
                const fullName = apt.customer_name || 'Gäst';
                const parts = fullName.trim().split(' ');
                const firstName = parts[0] || 'Gäst';
                const lastName = parts.slice(1).join(' ') || '';

                customerMap[key] = {
                    id: apt.customer_id || key,
                    firstName,
                    lastName,
                    email: rawEmail,
                    phone: apt.customer_phone || '-',
                    lastVisit: apt.start_time ? new Date(apt.start_time).toISOString().split('T')[0] : '-',
                    totalBookings: 0,
                    totalCancellations: 0,
                    status: 'Aktiv'
                };
            }

            if (apt.status === 'cancelled') {
                customerMap[key].totalCancellations += 1;
            } else {
                customerMap[key].totalBookings += 1;
            }
        }

        return NextResponse.json({
            success: true,
            customers: Object.values(customerMap)
        });

    } catch (error: any) {
        console.error('Error fetching salon customers:', error);
        return NextResponse.json({ error: 'Kunde inte hämta kunder.' }, { status: 500 });
    }
}

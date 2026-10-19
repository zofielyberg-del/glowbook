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

        // Fetch salon settings to check for hidden/removed customers (e.g. spam/test)
        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { availability: true }
        });

        const currentAvail: any[] = Array.isArray(salon?.availability) ? salon.availability : [];
        const hiddenBlock: any = currentAvail.find((a: any) => a && a.type === 'hidden_customers');
        const hiddenEmails = new Set(((hiddenBlock?.emails || []) as string[]).map((e: string) => (e || '').toLowerCase().trim()));
        const hiddenIds = new Set(((hiddenBlock?.ids || []) as (string | number)[]).map((id: any) => String(id)));

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
            const customerIdStr = apt.customer_id ? String(apt.customer_id) : '';

            // Skip customer if salon provider has removed them from this salon's directory
            if (hiddenEmails.has(emailKey) || (customerIdStr && hiddenIds.has(customerIdStr))) {
                continue;
            }

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

export async function DELETE(req: Request) {
    try {
        const { salonId, email, customerId } = await req.json();

        if (!salonId || (!email && !customerId)) {
            return NextResponse.json({ error: 'salonId och email eller customerId krävs' }, { status: 400 });
        }

        const salon = await prisma.salon.findUnique({
            where: { id: salonId },
            select: { availability: true }
        });

        if (!salon) {
            return NextResponse.json({ error: 'Salong hittades inte' }, { status: 404 });
        }

        const currentAvail: any[] = Array.isArray(salon.availability) ? salon.availability : [];
        const existingBlock: any = currentAvail.find((a: any) => a && a.type === 'hidden_customers');
        const existingEmails: string[] = Array.isArray(existingBlock?.emails) ? existingBlock.emails : [];
        const existingIds: string[] = Array.isArray(existingBlock?.ids) ? existingBlock.ids : [];

        const normalizedEmail = (email || '').toLowerCase().trim();
        const updatedEmails = Array.from(new Set([...existingEmails, normalizedEmail])).filter(Boolean);
        const updatedIds = customerId ? Array.from(new Set([...existingIds, String(customerId)])) : existingIds;

        const otherBlocks = currentAvail.filter((a: any) => !a || a.type !== 'hidden_customers');
        const newAvailability = [
            ...otherBlocks,
            {
                type: 'hidden_customers',
                emails: updatedEmails,
                ids: updatedIds,
                updated_at: new Date().toISOString()
            }
        ];

        await prisma.salon.update({
            where: { id: salonId },
            data: {
                availability: newAvailability
            }
        });

        return NextResponse.json({
            success: true,
            message: 'Kunden har tagits bort från salongens register.'
        });
    } catch (error: any) {
        console.error('Error removing customer from salon:', error);
        return NextResponse.json({ error: error.message || 'Kunde inte ta bort kunden.' }, { status: 500 });
    }
}

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { emitAvailabilityUpdate } from '@/lib/realtime';

export async function POST(req: Request) {
    try {
        const { appointmentId } = await req.json();

        if (!appointmentId) {
            return NextResponse.json({ error: 'Missing appointmentId' }, { status: 400 });
        }

        // 1. Fetch appointment to get salonId for realtime updates
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            select: { salon_id: true, status: true }
        });

        if (!appointment) {
            return NextResponse.json({ success: true, message: 'Appointment already deleted or does not exist.' });
        }

        // 2. Delete the appointment only if it is in pending_payment status
        if (appointment.status === 'pending_payment') {
            await prisma.appointment.delete({
                where: { id: appointmentId }
            });
            console.log(`[API] Deleted pending booking ${appointmentId} because payment was cancelled.`);

            // 3. Emit real-time availability update
            if (appointment.salon_id) {
                emitAvailabilityUpdate(appointment.salon_id, { salonId: appointment.salon_id });
            }
            return NextResponse.json({ success: true, deleted: true });
        }

        return NextResponse.json({ success: true, deleted: false, message: 'Appointment was not in pending_payment status.' });
    } catch (error: any) {
        console.error('Error cancelling pending booking:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

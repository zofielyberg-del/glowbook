import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCustomerRescheduleEmail, sendProviderBookingNotification } from '@/lib/email';
import { emitAvailabilityUpdate } from '@/lib/realtime';
export async function POST(req: Request) {
    try {
        const { appointmentId, newDate, newStartTime, newStartTimeUtc } = await req.json();

        if (!appointmentId || !newDate || !newStartTime) {
            return NextResponse.json({ error: 'Missing required rescheduling data' }, { status: 400 });
        }

        // 1. Fetch current appointment
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                salon: {
                    include: {
                        owner: {
                            select: { email: true }
                        }
                    }
                }
            }
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Appointment not found' }, { status: 404 });
        }

        // Cancellation policy window check
        const windowHours = appointment.salon?.cancellation_window_hours ?? 24;
        const diffMs = new Date(appointment.start_time).getTime() - Date.now();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffHours < windowHours) {
            return NextResponse.json({ 
                error: `Ombokning nekad: Denna salong tillåter inte ombokningar mindre än ${windowHours} timmar innan besöket.` 
            }, { status: 400 });
        }

        // Calculate duration (minutes)
        const endTime = appointment.end_time || new Date(appointment.start_time.getTime() + 30 * 60000);
        const duration = Math.round((endTime.getTime() - appointment.start_time.getTime()) / 60000);

        // Parse new date and time correctly using UTC ISO string from client if available
        const startDateTime = newStartTimeUtc ? new Date(newStartTimeUtc) : new Date(`${newDate}T${newStartTime}`);
        const endDateTime = new Date(startDateTime.getTime() + duration * 60000);

        // 2 & 3. Atomic check and update
        let updated;
        try {
            updated = await prisma.$transaction(async (tx) => {
                if (appointment.salon_id) {
                    const overlap = await tx.appointment.findFirst({
                        where: {
                            salon_id: appointment.salon_id,
                            practitioner_id: appointment.practitioner_id !== 'any' && appointment.practitioner_id !== 'owner' ? appointment.practitioner_id : undefined,
                            status: { not: 'cancelled' },
                            id: { not: appointmentId }, // Crucial: ignore current appointment!
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

                return await tx.appointment.update({
                    where: { id: appointmentId },
                    data: {
                        booking_date: new Date(newDate),
                        start_time: startDateTime,
                        end_time: endDateTime
                    }
                });
            });
        } catch (error: any) {
            if (error.message === 'SLOT_TAKEN') {
                return NextResponse.json({ 
                    error: 'Tiden är tyvärr redan bokad. Vänligen välj en annan tid.' 
                }, { status: 409 });
            }
            throw error;
        }

        const salonName = appointment.salon?.name || 'Salongen';
        const providerEmail = appointment.salon?.owner?.email || '';

        // 4. Send updated confirmation to customer
        if (appointment.customer_email) {
            try {
                await sendCustomerRescheduleEmail(
                    appointment.customer_email,
                    appointment.customer_name || 'Kund',
                    salonName,
                    appointment.service_name || 'Behandling',
                    newDate,
                    newStartTime
                );
            } catch (emailErr) {
                console.error('Error sending customer reschedule confirmation:', emailErr);
            }
        }

        // 5. Send notification to provider
        if (providerEmail) {
            try {
                await sendProviderBookingNotification(
                    providerEmail,
                    salonName,
                    `${appointment.customer_name} (OMBOKAD)`,
                    appointment.customer_email || '',
                    appointment.service_name || 'Behandling',
                    newDate,
                    newStartTime,
                    appointment.payment_method || undefined
                );
            } catch (emailErr) {
                console.error('Error sending provider reschedule notification:', emailErr);
            }
        }

        // Emit real‑time update so clients refresh availability
        if (appointment.salon_id) {
            emitAvailabilityUpdate(appointment.salon_id, { salonId: appointment.salon_id });
        }

        return NextResponse.json({
            success: true,
            message: 'Bokningen har ombokats framgångsrikt.'
        });

    } catch (error) {
        console.error('Booking rescheduling error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

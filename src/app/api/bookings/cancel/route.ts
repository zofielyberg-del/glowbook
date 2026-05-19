import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCustomerCancellationEmail, sendProviderCancellationEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { appointmentId } = await req.json();

        if (!appointmentId) {
            return NextResponse.json({ error: 'Appointment ID is required' }, { status: 400 });
        }

        // 1. Fetch the appointment along with Salon and Owner details
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

        if (appointment.status === 'cancelled') {
            return NextResponse.json({ error: 'Bokningen är redan avbokad' }, { status: 400 });
        }

        // 2. Update status to cancelled in database
        const updatedAppointment = await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'cancelled' }
        });

        // 3. Format Date & Time for email notifications
        const bookingDateStr = appointment.booking_date
            ? new Date(appointment.booking_date).toLocaleDateString('sv-SE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })
            : appointment.start_time.toLocaleDateString('sv-SE');
            
        const startTimeStr = appointment.start_time.toLocaleTimeString('sv-SE', {
            hour: '2-digit',
            minute: '2-digit'
        });

        const salonName = appointment.salon?.name || 'Salongen';
        const providerEmail = appointment.salon?.owner?.email || '';

        // 4. Send cancellation email to customer
        if (appointment.customer_email) {
            try {
                await sendCustomerCancellationEmail(
                    appointment.customer_email,
                    appointment.customer_name || 'Kund',
                    salonName,
                    appointment.service_name,
                    bookingDateStr,
                    startTimeStr
                );
            } catch (emailErr) {
                console.error('Error sending customer cancellation email:', emailErr);
            }
        }

        // 5. Send cancellation email to provider
        if (providerEmail) {
            try {
                await sendProviderCancellationEmail(
                    providerEmail,
                    salonName,
                    appointment.customer_name || 'Kund',
                    appointment.service_name,
                    bookingDateStr,
                    startTimeStr
                );
            } catch (emailErr) {
                console.error('Error sending provider cancellation email:', emailErr);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Bokningen har avbokats framgångsrikt.'
        });

    } catch (error) {
        console.error('Booking cancellation error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

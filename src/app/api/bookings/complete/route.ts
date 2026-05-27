import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCustomerFeedbackRequestEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { appointmentId } = await req.json();

        if (!appointmentId) {
            return NextResponse.json({ error: 'Boknings-ID saknas.' }, { status: 400 });
        }

        // 1. Fetch the appointment along with its salon information
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: {
                salon: true
            }
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });
        }

        // 2. Update status in database to 'completed'
        await prisma.appointment.update({
            where: { id: appointmentId },
            data: { status: 'completed' }
        });

        // 3. Send feedback/rating request email if the customer has an email address
        const email = appointment.customer_email;
        if (email) {
            const customerName = appointment.customer_name || 'Gäst';
            const firstName = customerName.split(' ')[0] || 'Gäst';
            const salonName = appointment.salon?.name || 'Salongen';
            const salonSlug = appointment.salon?.slug;

            // Determine origin dynamically or fallback to glowbook.se
            let origin = '';
            try {
                const reqUrl = new URL(req.url);
                origin = reqUrl.origin;
            } catch (e) {
                origin = process.env.NEXT_PUBLIC_APP_URL || 'https://glowbook.se';
            }
            if (origin.endsWith('/')) {
                origin = origin.slice(0, -1);
            }

            // Build rating URL (using short link slug structure for beautiful URLs)
            const reviewUrl = salonSlug 
                ? `${origin}/${salonSlug}` 
                : `${origin}/salon/${appointment.salon_id}`;

            try {
                await sendCustomerFeedbackRequestEmail(email, firstName, salonName, reviewUrl);
                console.log(`[API] Feedback request email sent to ${email} for completed booking ${appointmentId}`);
            } catch (emailErr) {
                console.error(`[API] Failed to send feedback request email for completed booking ${appointmentId}:`, emailErr);
            }
        }

        return NextResponse.json({ 
            success: true, 
            status: 'completed'
        });

    } catch (error: any) {
        console.error('Error completing booking:', error);
        return NextResponse.json(
            { error: error.message || 'Internt serverfel vid markering av bokning som klar.' }, 
            { status: 500 }
        );
    }
}

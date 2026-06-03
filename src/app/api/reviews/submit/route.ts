import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { appointmentId, rating, text } = await req.json();

        if (!appointmentId) {
            return NextResponse.json({ error: 'Boknings-ID saknas.' }, { status: 400 });
        }

        const numericRating = parseInt(rating);
        if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
            return NextResponse.json({ error: 'Betyget måste vara mellan 1 och 5.' }, { status: 400 });
        }

        // 1. Fetch the appointment to verify authenticity
        const appointment = await prisma.appointment.findUnique({
            where: { id: appointmentId },
            include: { salon: true }
        });

        if (!appointment) {
            return NextResponse.json({ error: 'Bokningen hittades inte.' }, { status: 404 });
        }

        if (appointment.status !== 'completed') {
            return NextResponse.json({ error: 'Du kan endast lämna recensioner för genomförda bokningar.' }, { status: 400 });
        }

        const salon = appointment.salon;
        if (!salon) {
            return NextResponse.json({ error: 'Salongen hittades inte.' }, { status: 404 });
        }

        const availability = Array.isArray(salon.availability) ? salon.availability : [];
        let reviewsBlock = availability.find((a: any) => a && a.type === 'reviews') as any;
        
        if (!reviewsBlock) {
            reviewsBlock = { type: 'reviews', list: [] };
        }

        // Check if review already exists for this appointment
        const existingReview = reviewsBlock.list.find((r: any) => r.appointmentId === appointmentId);
        if (existingReview) {
            return NextResponse.json({ error: 'Du har redan lämnat en recension för denna bokning.' }, { status: 400 });
        }

        const customerName = appointment.customer_name || 'Gäst';
        const firstName = customerName.split(' ')[0] || 'Gäst';

        const newReview = {
            id: `rev-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            appointmentId,
            customerName: firstName,
            serviceName: appointment.service_name || 'Behandling',
            rating: numericRating,
            text: text || '',
            date: new Date().toISOString()
        };

        // Append to the list
        const updatedList = [newReview, ...reviewsBlock.list];
        reviewsBlock.list = updatedList;

        // Clean out old reviews blocks and append updated one
        const filteredAvailability = availability.filter((a: any) => a && a.type !== 'reviews');
        const finalAvailability = [...filteredAvailability, reviewsBlock];

        // Recalculate average rating
        const totalRating = updatedList.reduce((sum: number, r: any) => sum + r.rating, 0);
        const averageRating = totalRating / updatedList.length;
        const roundedRating = Math.round(averageRating * 10) / 10;

        // Update database in a single transaction
        await prisma.salon.update({
            where: { id: salon.id },
            data: {
                availability: finalAvailability,
                rating: roundedRating,
                review_count: updatedList.length
            }
        });

        console.log(`[API] Review submitted successfully for appointment ${appointmentId} under salon ${salon.id}`);

        return NextResponse.json({ success: true, review: newReview });

    } catch (error: any) {
        console.error('Error submitting review:', error);
        return NextResponse.json(
            { error: error.message || 'Internt serverfel vid inskickning av recension.' }, 
            { status: 500 }
        );
    }
}


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { bookingId, userId } = await req.json();

        if (!bookingId) {
            return NextResponse.json({ error: 'Booking ID is required' }, { status: 400 });
        }

        try {
            await prisma.appointment.update({
                where: { id: bookingId },
                data: { status: 'cancelled' }
            });
        } catch (error) {
            console.error('Error cancelling booking:', error);
            return NextResponse.json({ error: 'Failed to cancel booking' }, { status: 500 });
        }

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Cancel booking error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

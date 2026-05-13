
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { calculatePoints } from '@/lib/loyalty';

export async function POST(req: Request) {
    try {
        let { userId, salonId, amount, bookingId, description, email } = await req.json();

        if ((!userId && !email) || !salonId || !amount) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        // If userId is missing but email is provided, find the user
        if (!userId && email) {
            const profile = await prisma.profile.findUnique({
                where: { email },
                select: { id: true }
            });

            if (profile) {
                userId = profile.id;
            } else {
                return NextResponse.json({ error: 'User not found' }, { status: 404 });
            }
        }

        const points = calculatePoints(amount);
        if (points <= 0) {
            return NextResponse.json({ success: true, pointsEarned: 0, message: 'Amount too low for points' });
        }

        // 1 & 2. Get/create balance
        let balance;
        try {
            balance = await prisma.loyaltyBalance.upsert({
                where: {
                    profile_id_salon_id: { profile_id: userId, salon_id: salonId }
                },
                update: {
                    current_points: { increment: points },
                    total_earned: { increment: points },
                    updated_at: new Date()
                },
                create: {
                    profile_id: userId,
                    salon_id: salonId,
                    current_points: points,
                    total_earned: points,
                    updated_at: new Date()
                }
            });
        } catch (error) {
            console.error('Error updating loyalty balance:', error);
            return NextResponse.json({ error: 'Failed to update points' }, { status: 500 });
        }

        const currentPointsWithEarned = balance.current_points;

        // 2b. Update global profile points (for member levels)
        try {
            await prisma.profile.update({
                where: { id: userId },
                data: { total_points_earned: { increment: points } }
            });
        } catch (profileUpdateError) {
             console.error('Error updating profile points:', profileUpdateError);
             // Non-critical, but should be logged
        }

        // 3. Record transaction
        try {
            await prisma.pointTransaction.create({
                data: {
                    profile_id: userId,
                    salon_id: salonId,
                    type: 'earned',
                    amount: points,
                    description: description || 'Poäng för behandling',
                    // booking_id: bookingId - Note: booking_id does not exist in point_transactions schema
                }
            });
        } catch (transError) {
             console.error('Error recording transaction:', transError);
             // Non-critical if transaction log fails but balance updated
        }

        return NextResponse.json({
            success: true,
            pointsEarned: points,
            newBalance: currentPointsWithEarned
        });

    } catch (error) {
        console.error('Loyalty earn error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

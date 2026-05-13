
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { userId, salonId, pointsCost, rewardId, description } = await req.json();

        if (!userId || !salonId || !pointsCost) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // 1. Get current balance
        const balance = await prisma.loyaltyBalance.findUnique({
            where: {
                profile_id_salon_id: { profile_id: userId, salon_id: salonId }
            }
        });

        if (!balance) {
            return NextResponse.json({ error: 'No loyalty balance found for this salon' }, { status: 404 });
        }

        // Allow null check if required, safely use 0
        const currentPoints = balance.current_points ?? 0;

        if (currentPoints < pointsCost) {
            return NextResponse.json({ error: 'Insufficient points' }, { status: 400 });
        }

        // 2. Deduct points
        try {
            await prisma.loyaltyBalance.update({
                where: { id: balance.id },
                data: { current_points: currentPoints - pointsCost }
            });
        } catch (updateError) {
            console.error('Error updating loyalty balance:', updateError);
            throw updateError;
        }

        // 3. Record transaction
        try {
            await prisma.pointTransaction.create({
                data: {
                    profile_id: userId,
                    salon_id: salonId,
                    type: 'spent',
                    amount: -pointsCost,
                    description: description || `Inlösen av reward`
                }
            });
        } catch (error) {
            console.error('Logging transacation failed: ', error);
        }

        return NextResponse.json({
            success: true,
            newBalance: currentPoints - pointsCost
        });

    } catch (error) {
        console.error('Error redeeming loyalty points:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

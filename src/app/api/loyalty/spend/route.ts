
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { userId, salonId, amount, description } = await req.json();

        if (!userId || !salonId || !amount) {
            return NextResponse.json({ error: 'Missing required data' }, { status: 400 });
        }

        // 1. Check current balance
        const balance = await prisma.loyaltyBalance.findUnique({
            where: {
                profile_id_salon_id: { profile_id: userId, salon_id: salonId }
            },
            select: { id: true, current_points: true }
        });

        if (!balance || (balance.current_points ?? 0) < amount) {
            return NextResponse.json({ error: 'Insufficient points' }, { status: 400 });
        }

        const currentPoints = balance.current_points ?? 0;

        // 2. Start Transaction (Atomic via RPC or separate calls)
        // Deduct points
        try {
            await prisma.loyaltyBalance.update({
                where: { id: balance.id },
                data: {
                    current_points: currentPoints - amount,
                    updated_at: new Date()
                }
            });
        } catch (updateError) {
            console.error('Error updating points:', updateError);
            return NextResponse.json({ error: 'Failed to spend points' }, { status: 500 });
        }

        // 3. Record transaction
        try {
            await prisma.pointTransaction.create({
                data: {
                    profile_id: userId,
                    salon_id: salonId,
                    type: 'spent',
                    amount: amount,
                    description: description || 'Inlösen av poäng vid bokning'
                }
            });
        } catch (transError) {
            console.error('Error recording transaction:', transError);
        }

        return NextResponse.json({ success: true, newBalance: currentPoints - amount });

    } catch (error) {
        console.error('Loyalty spend error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}


import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
    try {
        const { userId, salonId, amount, description } = await req.json();

        const numericAmount = Math.floor(Number(amount));
        if (!userId || !salonId || isNaN(numericAmount) || numericAmount <= 0) {
            return NextResponse.json({ error: 'Användar-ID, salongs-ID och ett giltigt positivt poängbelopp krävs.' }, { status: 400 });
        }

        // Atomic transaction: verify balance, deduct points, and record transaction
        const { newBalance } = await prisma.$transaction(async (tx) => {
            const balance = await tx.loyaltyBalance.findUnique({
                where: {
                    profile_id_salon_id: { profile_id: userId, salon_id: salonId }
                },
                select: { id: true, current_points: true }
            });

            if (!balance || (balance.current_points ?? 0) < numericAmount) {
                throw new Error('INSUFFICIENT_POINTS');
            }

            const currentPoints = balance.current_points ?? 0;
            const updatedPoints = currentPoints - numericAmount;

            await tx.loyaltyBalance.update({
                where: { id: balance.id },
                data: {
                    current_points: updatedPoints,
                    updated_at: new Date()
                }
            });

            await tx.pointTransaction.create({
                data: {
                    profile_id: userId,
                    salon_id: salonId,
                    type: 'spent',
                    amount: numericAmount,
                    description: description || 'Inlösen av poäng vid bokning'
                }
            });

            return { newBalance: updatedPoints };
        });

        return NextResponse.json({ success: true, newBalance });

    } catch (error: any) {
        if (error.message === 'INSUFFICIENT_POINTS') {
            return NextResponse.json({ error: 'Inte tillräckligt med poäng.' }, { status: 400 });
        }
        console.error('Loyalty spend error:', error);
        return NextResponse.json({ error: 'Ett tekniskt fel uppstod vid inlösen av poäng.' }, { status: 500 });
    }
}

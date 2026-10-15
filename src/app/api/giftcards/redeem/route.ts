
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendGiftCardUsageEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { code, amount, salonName } = await req.json();

        const numericAmount = Number(amount);
        if (!code || isNaN(numericAmount) || numericAmount <= 0) {
            return NextResponse.json({ error: 'Giltig kod och ett positivt belopp krävs.' }, { status: 400 });
        }

        const normalizedCode = String(code).trim().toUpperCase();

        // 1 & 2. Atomic check and deduction using transaction
        const { updatedCard, newBalance, status } = await prisma.$transaction(async (tx) => {
            const card = await tx.giftCard.findUnique({
                where: { code: normalizedCode }
            });

            if (!card) {
                throw new Error('NOT_FOUND');
            }

            if (card.status !== 'active') {
                throw new Error('NOT_ACTIVE');
            }

            if (card.expires_at && new Date(card.expires_at) < new Date()) {
                throw new Error('EXPIRED');
            }

            const currentBal = Number(card.remaining_balance);
            if (currentBal < numericAmount) {
                throw new Error('INSUFFICIENT_BALANCE');
            }

            const nextBal = Math.max(0, currentBal - numericAmount);
            const nextStatus = nextBal <= 0 ? 'used' : 'active';

            const updated = await tx.giftCard.update({
                where: { id: card.id },
                data: {
                    remaining_balance: nextBal,
                    status: nextStatus
                }
            });

            return { updatedCard: updated, newBalance: nextBal, status: nextStatus };
        });

        // 3. Send email to the giftcard owner notifying them where it was used and the remaining balance
        if (updatedCard.recipient_email) {
            const salonDisplay = salonName || 'en av våra anslutna salonger';
            try {
                await sendGiftCardUsageEmail(
                    updatedCard.recipient_email,
                    updatedCard.recipient_name || 'mottagare',
                    salonDisplay,
                    numericAmount,
                    updatedCard.code,
                    newBalance
                );
            } catch (mailError) {
                console.error('Mail Error sending presentkort usage notice:', mailError);
            }
        }

        return NextResponse.json({
            success: true,
            remainingBalance: newBalance,
            status: status
        });

    } catch (error: any) {
        if (error.message === 'NOT_FOUND') {
            return NextResponse.json({ error: 'Presentkortet hittades inte.' }, { status: 404 });
        }
        if (error.message === 'NOT_ACTIVE') {
            return NextResponse.json({ error: 'Presentkortet är inte längre aktivt.' }, { status: 400 });
        }
        if (error.message === 'EXPIRED') {
            return NextResponse.json({ error: 'Presentkortets giltighetstid har gått ut.' }, { status: 400 });
        }
        if (error.message === 'INSUFFICIENT_BALANCE') {
            return NextResponse.json({ error: 'Saldot på presentkortet räcker inte till.' }, { status: 400 });
        }
        console.error('Error redeeming gift card:', error);
        return NextResponse.json({ error: 'Ett tekniskt fel uppstod vid inlösen.' }, { status: 500 });
    }
}

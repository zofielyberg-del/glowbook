
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendGiftCardUsageEmail } from '@/lib/email';

export async function POST(req: Request) {
    try {
        const { code, amount, salonName } = await req.json();

        if (!code || !amount) {
            return NextResponse.json({ error: 'Code and amount are required' }, { status: 400 });
        }

        // 1. Get gift card
        const giftCard = await prisma.giftCard.findUnique({
            where: { code }
        });

        if (!giftCard) {
            return NextResponse.json({ error: 'Gift card not found' }, { status: 404 });
        }

        if (giftCard.status !== 'active') {
            return NextResponse.json({ error: 'Gift card is not active' }, { status: 400 });
        }

        if (giftCard.expires_at && new Date(giftCard.expires_at) < new Date()) {
            return NextResponse.json({ error: 'Gift card has expired' }, { status: 400 });
        }

        if (Number(giftCard.remaining_balance) < amount) {
            return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
        }

        // 2. Deduct balance
        const newBalance = Number(giftCard.remaining_balance) - amount;
        const status = newBalance <= 0 ? 'used' : 'active';

        try {
            await prisma.giftCard.update({
                where: { id: giftCard.id },
                data: {
                    remaining_balance: newBalance,
                    status: status
                }
            });
        } catch (updateError) {
            throw updateError;
        }

        // 3. Send email to the giftcard owner notifying them where it was used and the remaining balance
        if (giftCard.recipient_email) {
            const salonDisplay = salonName || 'en av våra anslutna salonger';
            try {
                await sendGiftCardUsageEmail(
                    giftCard.recipient_email,
                    giftCard.recipient_name || 'mottagare',
                    salonDisplay,
                    amount,
                    giftCard.code,
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

    } catch (error) {
        console.error('Error redeeming gift card:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

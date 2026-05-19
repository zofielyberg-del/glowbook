
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resend } from '@/lib/resend';

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
            const emailHtml = `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
                    <h2 style="color: #c5a059;">Glowbook</h2>
                    <p>Hej ${giftCard.recipient_name || 'mottagare'},</p>
                    <p>Ditt presentkort har använts hos <strong>${salonDisplay}</strong>.</p>
                    <div style="background: #fcfcfc; padding: 20px; border-radius: 15px; margin: 20px 0; border: 1px solid #eee;">
                        <p style="margin: 5px 0;"><strong>Använt belopp:</strong> ${amount} SEK</p>
                        <p style="margin: 5px 0; color: #c5a059; font-weight: bold;"><strong>Kvarvarande saldo:</strong> ${newBalance} SEK</p>
                        <p style="margin: 5px 0;"><strong>Presentkortskod:</strong> <code style="background: #eee; padding: 2px 6px; border-radius: 4px;">${giftCard.code}</code></p>
                    </div>
                    <p>Hoppas du blir nöjd med din behandling! Om du har några frågor kan du alltid svara på detta mejl.</p>
                    <p style="font-size: 12px; color: #999;">Tack för att du använder Glowbook.</p>
                </div>
            `;

            try {
                try {
                    await resend.emails.send({
                        from: 'Glowbook <noreply@glowbook.se>',
                        to: giftCard.recipient_email,
                        subject: `Ditt presentkort har använts hos ${salonDisplay}! ✨`,
                        html: emailHtml
                    });
                } catch (firstTryErr) {
                    console.warn('Failed to send usage notice with glowbook.se domain, trying onboarding@resend.dev fallback:', firstTryErr);
                    await resend.emails.send({
                        from: 'Glowbook <onboarding@resend.dev>',
                        to: giftCard.recipient_email,
                        subject: `Ditt presentkort har använts hos ${salonDisplay}! ✨`,
                        html: emailHtml
                    });
                }
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

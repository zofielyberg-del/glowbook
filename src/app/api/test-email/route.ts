import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { resend } from '@/lib/resend';

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const seg2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `GLOW-${seg1}-${seg2}`;
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
        return NextResponse.json({ error: 'Lägg till ?email=din@mail.com i URLen' }, { status: 400 });
    }

    try {
        const amount = 500;
        const code = generateCode();
        const expiresAt = new Date();
        expiresAt.setFullYear(expiresAt.getFullYear() + 2);

        // 1. Save to database
        await prisma.giftCard.create({
            data: {
                code,
                value: amount,
                remaining_balance: amount,
                recipient_name: 'Zofie Lyberg (Test)',
                recipient_email: email,
                sender_name: 'Glowbook System',
                message: 'Detta är ett testsystem-presentkort!',
                expires_at: expiresAt,
                status: 'active'
            }
        });

        const emailPayload = {
            to: email,
            subject: `Ett presentkort från Glowbook System! ✨`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
                    <h2 style="color: #c5a059;">Glowbook</h2>
                    <p>Hej Zofie Lyberg,</p>
                    <p>Glowbook System har skickat ett digitalt presentkort till dig!</p>
                    <div style="background: #000; color: #fff; padding: 40px; text-align: center; border-radius: 20px; margin: 20px 0;">
                        <h1 style="font-size: 48px; margin: 0;">${amount} SEK</h1>
                        <p style="color: #c5a059; font-family: monospace; font-size: 24px; letter-spacing: 2px;">${code}</p>
                    </div>
                    <p><em>"Detta är ett testsystem-presentkort!"</em></p>
                    <p style="font-size: 12px; color: #999;">Giltigt till ${expiresAt.toLocaleDateString('sv-SE')} hos alla Glowbook-anslutna salonger.</p>
                    <hr />
                    <a href="https://www.glowbook.se/giftcards" style="display: inline-block; padding: 10px 20px; background: #c5a059; color: #fff; text-decoration: none; border-radius: 10px;">Lös in här</a>
                </div>
            `
        };

        let sendResult;
        try {
            sendResult = await resend.emails.send({
                from: 'Glowbook <support@glowbook.se>',
                ...emailPayload
            });
        } catch (firstTryErr) {
            console.warn('Failed to send welcome with support@glowbook.se domain, trying onboarding@resend.dev fallback:', firstTryErr);
            sendResult = await resend.emails.send({
                from: 'Glowbook <onboarding@resend.dev>',
                ...emailPayload
            });
        }

        return NextResponse.json({
            success: true,
            message: `Ett test-presentkort har skickats till ${email}!`,
            code,
            sendResult
        });
    } catch (error: any) {
        console.error('Error generating test gift card:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

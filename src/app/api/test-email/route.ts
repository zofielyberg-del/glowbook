import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendGiftCardEmail } from '@/lib/email';

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

        const sendResult = await sendGiftCardEmail(
            email,
            'Zofie Lyberg (Test)',
            'Glowbook System',
            amount,
            code,
            'Detta är ett testsystem-presentkort!',
            expiresAt
        );

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

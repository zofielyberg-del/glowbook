import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyPassword, hashPassword } from '@/lib/password';

export async function POST(req: Request) {
    try {
        const { email, userId, currentPassword, newPassword } = await req.json();

        if ((!email && !userId) || !newPassword) {
            return NextResponse.json({ error: 'E-post/användar-ID och nytt lösenord krävs' }, { status: 400 });
        }

        if (typeof newPassword !== 'string' || newPassword.length < 6) {
            return NextResponse.json({ error: 'Det nya lösenordet måste vara minst 6 tecken långt' }, { status: 400 });
        }

        const isUuid = typeof userId === 'string' && userId.length > 20;
        let profile = isUuid
            ? await prisma.profile.findUnique({ where: { id: userId } })
            : null;

        if (!profile && email) {
            const normalizedEmail = String(email).toLowerCase().trim();
            profile = await prisma.profile.findFirst({
                where: { email: { equals: normalizedEmail, mode: 'insensitive' } }
            });
        }

        if (!profile) {
            return NextResponse.json({ error: 'Användarkontot hittades inte' }, { status: 404 });
        }

        if (profile.password_hash) {
            if (!currentPassword || !verifyPassword(String(currentPassword), profile.password_hash)) {
                return NextResponse.json({ error: 'Nuvarande lösenord är felaktigt' }, { status: 401 });
            }
        }

        await prisma.profile.update({
            where: { id: profile.id },
            data: { password_hash: hashPassword(newPassword) }
        });

        return NextResponse.json({ success: true, message: 'Lösenordet har uppdaterats.' });
    } catch (error: any) {
        console.error('Change password error:', error);
        return NextResponse.json({ error: 'Kunde inte uppdatera lösenordet' }, { status: 500 });
    }
}

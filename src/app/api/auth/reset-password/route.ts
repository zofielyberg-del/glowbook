import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/password';

export async function POST(request: Request) {
    try {
        const { token, password } = await request.json();

        if (!token || !password) {
            return NextResponse.json({ error: 'Token och lösenord krävs.' }, { status: 400 });
        }

        if (password.length < 8) {
            return NextResponse.json({ error: 'Lösenordet måste vara minst 8 tecken.' }, { status: 400 });
        }

        // Find user with this token where expiration is in the future
        const user = await prisma.profile.findFirst({
            where: {
                reset_token: token,
                reset_token_expires: {
                    gt: new Date()
                }
            }
        });

        if (!user) {
            return NextResponse.json({ error: 'Ogiltig eller utgången återställningslänk.' }, { status: 400 });
        }

        // Hash the new password
        const passwordHash = hashPassword(password);

        // Update password and clear reset token
        await prisma.profile.update({
            where: { id: user.id },
            data: {
                password_hash: passwordHash,
                reset_token: null,
                reset_token_expires: null
            }
        });

        return NextResponse.json({ success: true, message: 'Lösenordet har uppdaterats.' });
        
    } catch (error) {
        console.error('Reset password error:', error);
        return NextResponse.json(
            { error: 'Ett internt fel uppstod.' },
            { status: 500 }
        );
    }
}

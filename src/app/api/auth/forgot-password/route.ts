import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { Resend } from 'resend';
import crypto from 'crypto';

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'E-postadress krävs.' }, { status: 400 });
        }

        const user = await prisma.profile.findUnique({
            where: { email: email.toLowerCase() }
        });

        // To prevent email enumeration, we always return success even if user not found.
        if (!user) {
            return NextResponse.json({ success: true, message: 'Om e-postadressen finns så har ett mail skickats.' });
        }

        // Generate a random token
        const resetToken = crypto.randomBytes(32).toString('hex');
        
        // Expiration date: 1 hour from now
        const tokenExpires = new Date();
        tokenExpires.setHours(tokenExpires.getHours() + 1);

        // Update user in database
        await prisma.profile.update({
            where: { id: user.id },
            data: {
                reset_token: resetToken,
                reset_token_expires: tokenExpires
            }
        });

        // Get the origin dynamically from the request, falling back to env var
        let origin = '';
        try {
            const reqUrl = new URL(request.url);
            origin = reqUrl.origin;
        } catch (e) {
            origin = process.env.NEXT_PUBLIC_APP_URL || 'https://glowbook.se';
        }
        if (origin.endsWith('/')) {
            origin = origin.slice(0, -1);
        }

        const resetUrl = `${origin}/auth/reset-password?token=${resetToken}`;

        // Send email using Resend
        if (resend) {
        await resend.emails.send({
          from: 'GlowBook <no-reply@glowbook.se>', // Adjust if your verified domain differs
          to: user.email,
          subject: 'Återställ ditt lösenord på GlowBook',
          html: `
            <div style="font-family: Arial, sans-serif; max-w-md mx-auto p-4 bg-zinc-950 text-white">
              <h2 style="color: #ffffff; text-align: center; text-transform: uppercase; letter-spacing: 2px;">Glow<b style="font-weight:bold;">Book</b></h2>
              <p style="color: #cccccc;">Hej,</p>
              <p style="color: #cccccc;">Du har begärt att få återställa ditt lösenord. Klicka på knappen nedan för att välja ett nytt lösenord:</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${resetUrl}" style="background-color: #ffffff; color: #000000; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Återställ lösenord</a>
              </div>
              <p style="color: #cccccc; font-size: 12px;">Länken är giltig i 1 timme. Om du inte har begärt detta kan du ignorera detta mail.</p>
            </div>
          `
        });
      }


        return NextResponse.json({ success: true, message: 'Om e-postadressen finns så har ett mail skickats.' });
        
    } catch (error) {
        console.error('Forgot password error:', error);
        return NextResponse.json(
            { error: 'Ett internt fel uppstod.' },
            { status: 500 }
        );
    }
}

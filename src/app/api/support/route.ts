import { NextResponse } from 'next/server';
import { resend } from '@/lib/resend';

async function sendSupportEmail(options: {
    to: string | string[];
    replyTo?: string;
    subject: string;
    html: string;
}) {
    if (!resend) {
        throw new Error('E-posttjänsten är inte konfigurerad.');
    }

    const firstTry = await resend.emails.send({
        from: 'Glowbook Support <noreply@glowbook.se>',
        to: options.to,
        replyTo: options.replyTo,
        subject: options.subject,
        html: options.html,
    });

    if (firstTry.error) {
        const fallbackTry = await resend.emails.send({
            from: 'Glowbook Support <onboarding@resend.dev>',
            to: options.to,
            replyTo: options.replyTo,
            subject: options.subject,
            html: options.html,
        });
        if (fallbackTry.error) {
            throw new Error(fallbackTry.error.message || 'Kunde inte skicka e-post');
        }
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, email, subject, message, ticketId, action } = body;

        if (!email || !String(email).includes('@')) {
            return NextResponse.json({ error: 'Giltig e-postadress krävs.' }, { status: 400 });
        }

        if (action === 'reply') {
            if (!message?.trim()) {
                return NextResponse.json({ error: 'Meddelandet kan inte vara tomt.' }, { status: 400 });
            }
            const ref = ticketId ? `#${String(ticketId).slice(-6)}` : '';
            await sendSupportEmail({
                to: 'support@glowbook.se',
                replyTo: email,
                subject: `[Support-svar ${ref}] ${subject || 'Uppföljning'}`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
                        <h2 style="margin-bottom: 12px;">Nytt svar på supportärende ${ref}</h2>
                        <p><strong>Från:</strong> ${name || email} (${email})</p>
                        <hr style="margin: 16px 0;" />
                        <p style="white-space: pre-wrap;">${String(message).replace(/</g, '&lt;')}</p>
                    </div>
                `,
            });
            return NextResponse.json({ success: true });
        }

        if (!name?.trim() || !subject?.trim() || !message?.trim()) {
            return NextResponse.json({ error: 'Alla fält måste fyllas i.' }, { status: 400 });
        }

        const ref = (ticketId || Date.now().toString()).slice(-6);

        // 1. Send ticket to Glowbook support inbox
        await sendSupportEmail({
            to: 'support@glowbook.se',
            replyTo: email,
            subject: `[Glowbook Support #${ref}] ${subject}`,
            html: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px;">
                    <h2 style="margin-bottom: 12px;">Nytt supportärende #${ref}</h2>
                    <p><strong>Namn:</strong> ${String(name).replace(/</g, '&lt;')}</p>
                    <p><strong>E-post:</strong> ${String(email).replace(/</g, '&lt;')}</p>
                    <p><strong>Ämne:</strong> ${String(subject).replace(/</g, '&lt;')}</p>
                    <hr style="margin: 16px 0;" />
                    <p style="white-space: pre-wrap;">${String(message).replace(/</g, '&lt;')}</p>
                </div>
            `,
        });

        // 2. Send auto-confirmation to user (best-effort)
        try {
            await sendSupportEmail({
                to: email,
                subject: `Vi har tagit emot ditt ärende (#${ref}) – Glowbook Support`,
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 16px;">
                        <h2 style="color: #c5a059;">Glowbook Support</h2>
                        <p>Hej ${String(name).replace(/</g, '&lt;')},</p>
                        <p>Tack för att du kontaktade oss! Vi har tagit emot ditt ärende (referens <strong>#${ref}</strong>) gällande <em>"${String(subject).replace(/</g, '&lt;')}"</em> och återkommer till dig via e-post så snart som möjligt.</p>
                        <p style="font-size: 12px; color: #888; margin-top: 24px;">Vänliga hälsningar,<br/>Teamet på Glowbook</p>
                    </div>
                `,
            });
        } catch (confirmErr) {
            console.warn('Could not send user support confirmation email:', confirmErr);
        }

        return NextResponse.json({ success: true, reference: ref });
    } catch (error: any) {
        console.error('Support API error:', error);
        return NextResponse.json({ error: error.message || 'Kunde inte skicka supportärendet.' }, { status: 500 });
    }
}

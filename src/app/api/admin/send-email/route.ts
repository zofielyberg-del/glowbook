import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getHtmlWrapper } from '@/lib/email';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mockKey1234567890');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json({ success: false, error: 'Saknar obligatoriska fält (to, subject, message)' }, { status: 400 });
    }

    const htmlContent = `
      <div style="margin-bottom:40px;">
        <p style="font-size:15px;color:#d4d4d4;line-height:1.7;white-space:pre-wrap;margin:0;font-family:Arial,Helvetica,sans-serif;">${message}</p>
      </div>

      <p style="font-size:13px;color:#888888;margin-top:40px;line-height:1.6;font-family:Arial,Helvetica,sans-serif;">
        Med vänliga hälsningar,<br>
        <strong style="color:#ffffff;">Glowbook-teamet</strong>
      </p>
    `;

    const html = getHtmlWrapper(htmlContent);

    const res = await resend.emails.send({
      from: 'Glowbook <support@glowbook.se>',
      to,
      subject,
      html
    });

    return NextResponse.json({ success: true, res });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getHtmlWrapper } from '@/lib/email';
import { prisma } from '@/lib/prisma';

const resend = new Resend(process.env.RESEND_API_KEY || 're_mockKey1234567890');

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { to, subject, message } = body;

    if (!to || !subject || !message) {
      return NextResponse.json({ success: false, error: 'Saknar obligatoriska fält (to, subject, message)' }, { status: 400 });
    }

    const formattedMessage = message.replace(/\r\n/g, '\n').replace(/\n/g, '<br />');
    const htmlContent = `
      <div style="font-family:Arial,Helvetica,sans-serif; font-size:15px; line-height:1.7;">${formattedMessage}</div>
    `;

    const html = getHtmlWrapper(htmlContent);

    if (to === 'ALL_PROVIDERS') {
      const providers = await prisma.profile.findMany({
        where: { role: { in: ['provider', 'salon_owner', 'admin'] } },
        select: { email: true }
      });

      const emails = Array.from(new Set(
        providers.map(p => p.email?.trim().toLowerCase()).filter(Boolean)
      )) as string[];

      console.log(`[Admin Bulk Email] Sending newsletter to ${emails.length} provider/salon addresses...`);

      for (const email of emails) {
        try {
          await resend.emails.send({
            from: 'Glowbook <support@glowbook.se>',
            to: email,
            subject,
            html
          });
        } catch (err) {
          console.error(`[Admin Bulk Email] Failed to send to ${email}:`, err);
        }
      }

      // Send a copy to the support email for archiving
      try {
        await resend.emails.send({
          from: 'Glowbook <support@glowbook.se>',
          to: 'support@glowbook.se',
          subject: `[Kopia av utskick] ${subject}`,
          html
        });
      } catch (err) {
        console.error('[Admin Bulk Email] Failed to send archive copy:', err);
      }

      return NextResponse.json({ success: true, sentCount: emails.length });
    }

    if (to === 'ALL_CUSTOMERS') {
      const customers = await prisma.profile.findMany({
        where: {
          OR: [
            { role: 'customer' },
            { role: null },
            { role: '' }
          ]
        },
        select: { email: true }
      });

      const emails = Array.from(new Set(
        customers.map(c => c.email?.trim().toLowerCase()).filter(Boolean)
      )) as string[];

      console.log(`[Admin Bulk Email] Sending newsletter to ${emails.length} customer addresses...`);

      for (const email of emails) {
        try {
          await resend.emails.send({
            from: 'Glowbook <support@glowbook.se>',
            to: email,
            subject,
            html
          });
        } catch (err) {
          console.error(`[Admin Bulk Email] Failed to send to ${email}:`, err);
        }
      }

      // Send a copy to the support email for archiving
      try {
        await resend.emails.send({
          from: 'Glowbook <support@glowbook.se>',
          to: 'support@glowbook.se',
          subject: `[Kopia av utskick] ${subject}`,
          html
        });
      } catch (err) {
        console.error('[Admin Bulk Email] Failed to send archive copy:', err);
      }

      return NextResponse.json({ success: true, sentCount: emails.length });
    }

    // Single email send
    const res = await resend.emails.send({
      from: 'Glowbook <support@glowbook.se>',
      to,
      subject,
      html
    });

    return NextResponse.json({ success: true, res });
  } catch (err: any) {
    console.error('[Admin Email Error]', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

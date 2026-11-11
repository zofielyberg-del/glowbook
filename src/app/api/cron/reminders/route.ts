import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendCustomerReminderEmail } from '@/lib/email';

export const dynamic = 'force-dynamic';

/**
 * Daily/periodic cron endpoint to send ~24h pre-visit email reminders to customers.
 * Secured optionally via CRON_SECRET if configured in Vercel.
 */
export async function GET(req: Request) {
    try {
        const cronSecret = process.env.CRON_SECRET;
        if (cronSecret) {
            const authHeader = req.headers.get('authorization');
            if (authHeader !== `Bearer ${cronSecret}`) {
                return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
            }
        }

        const now = new Date();
        // Remind bookings starting between 1h and 36h from now (so daily 08:00 UTC cron catches all of tomorrow's treatments)
        const minStart = new Date(now.getTime() + 60 * 60 * 1000);
        const maxStart = new Date(now.getTime() + 36 * 60 * 60 * 1000);
        // Do not send a reminder for bookings created within the last 2 hours (customer just received confirmation)
        const minCreatedBefore = new Date(now.getTime() - 2 * 60 * 60 * 1000);

        const appointments = await prisma.appointment.findMany({
            where: {
                status: { in: ['confirmed', 'paid'] },
                reminder_sent_at: null,
                customer_email: { not: null },
                start_time: {
                    gte: minStart,
                    lte: maxStart,
                },
                created_at: {
                    lte: minCreatedBefore,
                },
            },
            include: {
                salon: {
                    select: {
                        name: true,
                        address: true,
                        city: true,
                        message_templates: true,
                    },
                },
                practitioner: {
                    select: {
                        name: true,
                    },
                },
            },
        });

        let sentCount = 0;
        let failedCount = 0;

        for (const apt of appointments) {
            if (!apt.customer_email) continue;

            const bookingDateStr = new Date(apt.start_time).toLocaleDateString('sv-SE', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                timeZone: 'Europe/Stockholm',
            });

            const startTimeStr = new Date(apt.start_time).toLocaleTimeString('sv-SE', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'Europe/Stockholm',
            });

            let templates: any = null;
            if (apt.salon?.message_templates) {
                try {
                    templates = typeof apt.salon.message_templates === 'string'
                        ? JSON.parse(apt.salon.message_templates)
                        : apt.salon.message_templates;
                } catch {}
            }

            const addressParts = [apt.salon?.address, apt.salon?.city].filter(Boolean);
            const addressStr = addressParts.length > 0 ? addressParts.join(', ') : undefined;

            const result = await sendCustomerReminderEmail(
                apt.customer_email,
                apt.customer_name || 'Kund',
                apt.salon?.name || 'Salongen',
                apt.service_name || 'Behandling',
                bookingDateStr,
                startTimeStr,
                apt.id,
                addressStr,
                apt.practitioner?.name || undefined,
                templates
            );

            if (result.success) {
                await prisma.appointment.update({
                    where: { id: apt.id },
                    data: { reminder_sent_at: new Date() },
                });
                sentCount++;
            } else {
                failedCount++;
            }
        }

        return NextResponse.json({
            success: true,
            checked: appointments.length,
            sent: sentCount,
            failed: failedCount,
        });
    } catch (error: any) {
        console.error('[Cron Reminders] Error:', error);
        return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
    }
}

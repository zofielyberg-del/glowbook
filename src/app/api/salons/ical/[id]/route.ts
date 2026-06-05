import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function formatICalDate(dateStr: Date | string | null): string {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        if (!id) {
            return new Response('Salon ID is required', { status: 400 });
        }

        // Fetch salon along with all non-cancelled appointments
        const salon = await prisma.salon.findUnique({
            where: { id },
            include: {
                appointments: {
                    where: {
                        status: { not: 'cancelled' }
                    }
                }
            }
        });

        if (!salon) {
            return new Response('Salon not found', { status: 404 });
        }

        const salonName = salon.name || 'Glowbook Kalender';
        const formattedSalonName = salonName.replace(/[,;]/g, '\\$&');

        let icsContent = [
            'BEGIN:VCALENDAR',
            'VERSION:2.0',
            'PRODID:-//Glowbook//NONSGML Calendar Feed//EN',
            'CALSCALE:GREGORIAN',
            'METHOD:PUBLISH',
            `X-WR-CALNAME:Glowbook - ${formattedSalonName}`,
            'X-WR-TIMEZONE:Europe/Stockholm',
            'REFRESH-INTERVAL;VALUE=DURATION:PT15M', // Ask calendar apps to refresh every 15 minutes
            'X-PUBLISHED-TTL:PT15M'
        ];

        const appointments = salon.appointments || [];

        for (const apt of appointments) {
            const uid = `apt-${apt.id}@glowbook.se`;
            const dtstamp = formatICalDate(apt.created_at || new Date());
            const dtstart = formatICalDate(apt.start_time);
            
            // Calculate end time if not present
            const end = apt.end_time || new Date(new Date(apt.start_time).getTime() + 30 * 60 * 1000);
            const dtend = formatICalDate(end);

            const summary = `${apt.service_name || 'Behandling'} - ${apt.customer_name || 'Kund'}`;
            const cleanSummary = summary.replace(/[\\,;]/g, '\\$&');

            const description = [
                `Kund: ${apt.customer_name || 'Ej angivet'}`,
                `Tjänst: ${apt.service_name || 'Ej angivet'}`,
                `E-post: ${apt.customer_email || 'Ej angivet'}`,
                `Telefon: ${apt.customer_phone || 'Ej angivet'}`,
                `Betalsätt: ${apt.payment_method === 'stripe' ? 'Betala med Stripe' : apt.payment_method === 'giftcard' ? 'Presentkort' : 'Betalas på plats'}`,
                `Boknings-ID: ${apt.id}`,
                `Bokat via Glowbook.se`
            ].join('\\n');

            const event = [
                'BEGIN:VEVENT',
                `UID:${uid}`,
                `DTSTAMP:${dtstamp}`,
                `DTSTART:${dtstart}`,
                `DTEND:${dtend}`,
                `SUMMARY:${cleanSummary}`,
                `DESCRIPTION:${description}`,
                `LOCATION:${formattedSalonName}`,
                'STATUS:CONFIRMED',
                'TRANSP:OPAQUE',
                'END:VEVENT'
            ];

            icsContent = icsContent.concat(event);
        }

        icsContent.push('END:VCALENDAR');

        const fileContent = icsContent.join('\r\n');

        return new Response(fileContent, {
            headers: {
                'Content-Type': 'text/calendar; charset=utf-8',
                'Content-Disposition': `attachment; filename="glowbook-${salon.slug || 'calendar'}.ics"`,
                'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
                'Pragma': 'no-cache',
                'Expires': '0'
            }
        });

    } catch (error: any) {
        console.error('Error generating iCal feed:', error);
        return new Response('Internal Server Error', { status: 500 });
    }
}

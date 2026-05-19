import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendProviderWelcomeEmail, sendCustomerBookingConfirmation } from '@/lib/email';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email') || 'zofielyberg@gmail.com';

    try {
        // 1. Fetch all salons with their practitioners, services, and appointments
        const salons = await prisma.salon.findMany({
            include: {
                practitioners: true,
                services: true,
                appointments: {
                    where: {
                        customer_email: email
                    }
                }
            }
        });

        if (salons.length === 0) {
            return NextResponse.json({ 
                success: false, 
                message: 'Inga salonger hittades i databasen. Kör simuleringen först.' 
            }, { status: 404 });
        }

        const log: string[] = [];

        // 2. Loop through each salon and trigger emails from the live environment
        for (const salon of salons) {
            log.push(`[${salon.name}] Behandlar live-mail...`);

            // A. Welcome Email
            try {
                const welcomeResult = await sendProviderWelcomeEmail(email, salon.name);
                if (welcomeResult.success) {
                    log.push(`   - Välkomstmail skickat!`);
                } else {
                    log.push(`   - Välkomstmail misslyckades: ${JSON.stringify(welcomeResult.error)}`);
                }
            } catch (err: any) {
                log.push(`   - Välkomstmail kraschade: ${err.message}`);
            }

            // B. Booking Confirmation
            const appointment = salon.appointments[0];
            const service = salon.services[0];
            
            if (appointment && service) {
                try {
                    const confirmResult = await sendCustomerBookingConfirmation(
                        email,
                        'Zofie Lyberg',
                        salon.name,
                        service.name,
                        '2026-05-20',
                        '10:00',
                        `${service.price} SEK`,
                        appointment.id
                    );
                    if (confirmResult.success) {
                        log.push(`   - Bokningsbekräftelse skickad! (Bokning-ID: ${appointment.id})`);
                    } else {
                        log.push(`   - Bokningsbekräftelse misslyckades: ${JSON.stringify(confirmResult.error)}`);
                    }
                } catch (err: any) {
                    log.push(`   - Bokningsbekräftelse kraschade: ${err.message}`);
                }
            } else {
                log.push(`   - Ingen bokning hittades för denna salong i databasen.`);
            }
        }

        return NextResponse.json({
            success: true,
            message: 'Live e-post-avfyrning slutförd!',
            log
        });

    } catch (error: any) {
        console.error('Test email suite error:', error);
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }
}

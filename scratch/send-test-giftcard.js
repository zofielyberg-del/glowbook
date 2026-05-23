import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });
const resend = new Resend(process.env.RESEND_API_KEY || 're_mockKey1234567890');

function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const seg1 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    const seg2 = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
    return `GLOW-${seg1}-${seg2}`;
}

async function run() {
    const recipientEmail = 'zofielyberg@gmail.com';
    const recipientName = 'Zofie Lyberg';
    const senderName = 'Glowbook System';
    const message = 'Detta är ditt test-presentkort! Använd koden för att testa inlösen.';
    const amount = 500;
    
    const code = generateCode();
    const expiresAt = new Date();
    expiresAt.setFullYear(expiresAt.getFullYear() + 2);

    console.log(`Genererar presentkort: ${code} på ${amount} SEK för ${recipientEmail}...`);

    // 1. Spara i databasen
    try {
        await prisma.giftCard.create({
            data: {
                code,
                value: amount,
                remaining_balance: amount,
                recipient_name: recipientName,
                recipient_email: recipientEmail,
                sender_name: senderName,
                message: message,
                expires_at: expiresAt,
                status: 'active'
            }
        });
        console.log('✓ Presentkort sparat i databasen!');
    } catch (dbError) {
        console.error('Fel när presentkortet skulle sparas i DB:', dbError);
        process.exit(1);
    }

    // 2. Skicka e-post via Resend
    const emailPayload = {
        to: recipientEmail,
        subject: `Ett presentkort från ${senderName}! ✨`,
        html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 20px;">
                <h2 style="color: #c5a059;">Glowbook</h2>
                <p>Hej ${recipientName},</p>
                <p>${senderName} har skickat ett digitalt presentkort till dig!</p>
                <div style="background: #000; color: #fff; padding: 40px; text-align: center; border-radius: 20px; margin: 20px 0;">
                    <h1 style="font-size: 48px; margin: 0;">${amount} SEK</h1>
                    <p style="color: #c5a059; font-family: monospace; font-size: 24px; letter-spacing: 2px;">${code}</p>
                </div>
                <p><em>"${message}"</em></p>
                <p style="font-size: 12px; color: #999;">Giltigt till ${expiresAt.toLocaleDateString('sv-SE')} hos alla Glowbook-anslutna salonger.</p>
                <hr />
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://www.glowbook.se'}/giftcards" style="display: inline-block; padding: 10px 20px; background: #c5a059; color: #fff; text-decoration: none; border-radius: 10px;">Lös in här</a>
            </div>
        `
    };

    try {
        console.log('Försöker skicka mejl från noreply@glowbook.se...');
        try {
            await resend.emails.send({
                from: 'Glowbook <noreply@glowbook.se>',
                ...emailPayload
            });
            console.log('✓ E-post skickat framgångsrikt från noreply@glowbook.se!');
        } catch (firstTryErr) {
            console.warn('Kunde inte skicka med @glowbook.se domän, provar sandbox fallback (onboarding@resend.dev)...');
            await resend.emails.send({
                from: 'Glowbook <onboarding@resend.dev>',
                ...emailPayload
            });
            console.log('✓ E-post skickat framgångsrikt via sandbox (onboarding@resend.dev)!');
        }
    } catch (mailError) {
        console.error('Det gick inte att skicka mejlet:', mailError);
    } finally {
        await prisma.$disconnect();
    }
}

run();

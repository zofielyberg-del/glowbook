import { Resend } from 'resend';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const resend = new Resend(process.env.RESEND_API_KEY || 're_mockKey1234567890');

async function test() {
    console.log('Testar Resend API-nyckel:', process.env.RESEND_API_KEY ? 'Laddad' : 'Ej laddad');

    // Test 1: Med custom domän
    const res1 = await resend.emails.send({
        from: 'Glowbook <noreply@glowbook.se>',
        to: 'zofielyberg@gmail.com',
        subject: 'Test med glowbook.se',
        html: '<p>Detta är ett testmeddelande från glowbook.se</p>'
    });
    console.log('Resultat med glowbook.se:', JSON.stringify(res1, null, 2));

    // Test 2: Med onboarding@resend.dev
    const res2 = await resend.emails.send({
        from: 'Glowbook <onboarding@resend.dev>',
        to: 'zofielyberg@gmail.com',
        subject: 'Test med onboarding@resend.dev',
        html: '<p>Detta är ett testmeddelande från onboarding@resend.dev</p>'
    });
    console.log('Resultat med onboarding@resend.dev:', JSON.stringify(res2, null, 2));
}

test();

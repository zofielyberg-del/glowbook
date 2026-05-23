import { config } from 'dotenv';
import path from 'path';
config({ path: path.resolve(process.cwd(), '.env') });
config({ path: path.resolve(process.cwd(), '.env.local') });

import { 
    sendProviderWelcomeEmail, 
    sendCustomerWelcomeEmail, 
    sendCustomerBookingConfirmation 
} from '../src/lib/email';

async function main() {
    const email = 'zofielyberg@gmail.com';
    console.log(`Sending test emails to ${email}...`);
    
    const r1 = await sendProviderWelcomeEmail(email, 'Zofie Beauty Clinic');
    console.log('Provider welcome email sent!', r1.success);
    
    const r2 = await sendCustomerWelcomeEmail(email, 'Zofie');
    console.log('Customer welcome email sent!', r2.success);
    
    const r3 = await sendCustomerBookingConfirmation(
        email, 
        'Zofie', 
        'Stockholm Spa', 
        'Golden Facial Treatment', 
        '24 Maj', 
        '14:00',
        '1 200 kr'
    );
    console.log('Booking confirmation sent!', r3.success);
    
    console.log('All test emails sent successfully!');
}

main().catch(console.error);

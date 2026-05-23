import path from 'path';
import { config } from 'dotenv';
config({ path: path.resolve(process.cwd(), '.env.local') });

import { prisma } from '../src/lib/prisma';

async function main() {
    console.log('Checking database for zofielyberg@gmail.com...');
    
    const user = await prisma.profile.findUnique({
        where: { email: 'zofielyberg@gmail.com' }
    });
    
    console.log('User record:');
    console.log(user);
    
    if (user) {
        console.log('\nChecking provider/salon record...');
        const salon = await prisma.salon.findFirst({
            where: { owner_id: user.id }
        });
        console.log('Salon record:');
        console.log(salon);
    }
}

main().catch(console.error).finally(() => prisma.$disconnect());

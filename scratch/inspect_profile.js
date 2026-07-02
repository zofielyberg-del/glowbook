import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

async function main() {
    console.log('Fetching profile for zofielyberg@gmail.com...');
    const profile = await prisma.profile.findUnique({
        where: { email: 'zofielyberg@gmail.com' },
        include: { salons: true }
    });
    console.log('Profile:', JSON.stringify(profile, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

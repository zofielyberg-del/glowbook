import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

async function main() {
    console.log('Restoring profile name for zofielyberg@gmail.com...');
    const updated = await prisma.profile.update({
        where: { email: 'zofielyberg@gmail.com' },
        data: {
            first_name: 'Zofie',
            last_name: 'Lyberg'
        }
    });
    console.log('Successfully restored name:', JSON.stringify(updated, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

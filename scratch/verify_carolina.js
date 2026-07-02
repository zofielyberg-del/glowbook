import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

async function main() {
    console.log("Verifying Carolina Beauty in the database...");
    const updated = await prisma.salon.update({
        where: { id: '1dda4894-1fbc-4d12-ac63-96ce971074df' },
        data: {
            is_verified: true,
            verified_categories: ['Naglar', 'Fransar & Bryn']
        }
    });

    console.log('Successfully updated:', JSON.stringify(updated, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

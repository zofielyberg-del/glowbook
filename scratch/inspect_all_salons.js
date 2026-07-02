import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

async function main() {
    console.log("Listing all salons and their verification statuses...");
    const salons = await prisma.salon.findMany({
        select: {
            id: true,
            name: true,
            slug: true,
            is_verified: true,
            verified_categories: true,
            owner: {
                select: {
                    email: true
                }
            }
        }
    });

    console.log('Salons:', JSON.stringify(salons, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

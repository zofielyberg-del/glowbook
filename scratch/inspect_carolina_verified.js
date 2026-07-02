import 'dotenv/config';
import { prisma } from '../src/lib/prisma.ts';

async function main() {
    console.log("Searching for Carolina's salon...");
    const salons = await prisma.salon.findMany({
        where: {
            OR: [
                { name: { contains: 'Carolina', mode: 'insensitive' } },
                { slug: { contains: 'carolina', mode: 'insensitive' } }
            ]
        },
        select: {
            id: true,
            name: true,
            slug: true,
            is_verified: true,
            verification_requested: true,
            verified_categories: true,
            owner: {
                select: {
                    id: true,
                    email: true,
                    first_name: true,
                    last_name: true
                }
            }
        }
    });

    console.log('Salons found:', JSON.stringify(salons, null, 2));
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());

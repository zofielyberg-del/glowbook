import { config } from 'dotenv';
config();

import { prisma } from './src/lib/prisma';

async function deleteAccounts() {
    try {
        const emails = ['carolinadakholm@gmail.com', 'zofielyberg@gmail.com'];
        
        for (const email of emails) {
            const user = await prisma.profile.findUnique({
                where: { email }
            });
            
            if (user) {
                const salons = await prisma.salon.findMany({
                    where: { owner_id: user.id }
                });
                
                for (const salon of salons) {
                    await prisma.appointment.deleteMany({ where: { salon_id: salon.id } });
                    await prisma.service.deleteMany({ where: { salon_id: salon.id } });
                    await prisma.practitioner.deleteMany({ where: { salon_id: salon.id } });
                    await prisma.salon.delete({ where: { id: salon.id } });
                }
                
                await prisma.profile.delete({ where: { id: user.id } });
                console.log(`Deleted account for ${email}`);
            } else {
                console.log(`Account not found for ${email}`);
            }
        }
    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

deleteAccounts();

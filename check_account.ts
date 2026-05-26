import { config } from 'dotenv';
config();
import { prisma } from './src/lib/prisma';
import { createHash } from 'crypto';

const SALT = 'glowbook_salt_2026';
function hashPassword(password: string): string {
    return createHash('sha256').update(SALT + password).digest('hex');
}

async function checkAccount() {
    const email = 'carolinadakholm@gmail.com';
    const user = await prisma.profile.findUnique({
        where: { email }
    });
    
    if (user) {
        console.log(`Account found: ${user.email} (ID: ${user.id})`);
        
        const newPassword = 'Claudia2026';
        const passwordHash = hashPassword(newPassword);
        
        await prisma.profile.update({
            where: { id: user.id },
            data: { password_hash: passwordHash }
        });
        
        console.log(`Password for ${email} has been forcefully set to: ${newPassword}`);
    } else {
        console.log(`Account not found in the DB for ${email}`);
    }
}
checkAccount();

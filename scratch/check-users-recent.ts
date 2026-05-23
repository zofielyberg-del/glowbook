import { prisma } from '../src/lib/prisma'; async function main() { const users = await prisma.profile.findMany({ orderBy: { created_at: 'desc' }, take: 5 }); console.log(users); } main();  

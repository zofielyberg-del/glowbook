// Set the env var before importing prisma to avoid hoisting issues
process.env.DATABASE_URL = "postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

async function main() {
    const { prisma } = await import('../src/lib/prisma');
    
    const salon = await prisma.salon.findUnique({
        where: { id: '8d63f8fb-7922-4236-a038-67082058938a' },
        select: { id: true, name: true, stripe_account_id: true, membership_tier: true }
    });
    console.log('SALON DETAILS:', salon);

    const appointments = await prisma.appointment.findMany({
        where: { salon_id: '8d63f8fb-7922-4236-a038-67082058938a' },
        orderBy: { created_at: 'desc' },
        take: 5
    });
    console.log('LATEST APPOINTMENTS:', appointments);
    
    await prisma.$disconnect();
}

main().catch(console.error);

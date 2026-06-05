const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');
require('dotenv').config();

async function main() {
  const pool = new pg.Pool({
    connectionString: process.env.DATABASE_URL,
    max: 1
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  console.log("Simulating empty query /api/salons/list...");
  const where = { AND: [] };
  const salons = await prisma.salon.findMany({
    where,
    take: 100,
    include: {
      services: {
        select: {
          name: true,
          price: true,
          sale_price: true,
          sale_ends_at: true,
          category: true
        }
      }
    }
  });

  console.log(`Query returned ${salons.length} salons.`);
  salons.forEach(s => {
    console.log(`- ${s.name} (${s.slug}), tier: ${s.membership_tier}`);
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => console.error(e));

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

  const luxe = await prisma.salon.findUnique({
    where: { id: "8d63f8fb-7922-4236-a038-67082058938a" },
    include: {
      owner: true,
      practitioners: true
    }
  });

  console.log(JSON.stringify(luxe, null, 2));

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error(e);
});

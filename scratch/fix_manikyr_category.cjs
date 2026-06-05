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

  console.log("Updating Manikyr service category to 'Naglar' for Luxe By Essi...");
  try {
    const result = await prisma.service.updateMany({
      where: {
        salon_id: "8d63f8fb-7922-4236-a038-67082058938a",
        name: {
          contains: "Manikyr",
          mode: "insensitive"
        }
      },
      data: {
        category: "Naglar"
      }
    });
    console.log(`✅ Success! Updated ${result.count} service(s).`);
  } catch (err) {
    console.error("❌ Prisma Update Error:", err);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error:", e);
});

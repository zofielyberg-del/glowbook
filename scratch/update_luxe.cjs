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

  console.log("Fetching Luxe By Essi...");
  let existing = await prisma.salon.findUnique({
    where: { id: "8d63f8fb-7922-4236-a038-67082058938a" }
  });

  if (!existing) {
    console.log("❌ Salon not found!");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  console.log("Current Category:", existing.category);

  console.log("Updating category to 'Naglar'...");
  try {
    const updated = await prisma.salon.update({
      where: { id: existing.id },
      data: {
        category: "Naglar"
      }
    });
    console.log("✅ Success! New Category in DB:", updated.category);
  } catch (err) {
    console.error("❌ Prisma Update Error:", err);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error:", e);
});

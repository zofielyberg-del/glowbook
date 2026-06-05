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

  const targetId = "8d63f8fb-7922-4236-a038-67082058938a";
  const newDescription = "Välkommen till Luxe By Essi. Mitt namn är Essi och jag är 21 år gammal och har hemmastudio i Växjö. Om du har någon fråga till mig, tveka inte på att skicka ett meddelande till mig. Jag nås snabbast på Instagram @luxebyes .";

  console.log(`Updating description for salon ${targetId}...`);
  try {
    const updated = await prisma.salon.update({
      where: { id: targetId },
      data: {
        description: newDescription
      }
    });
    console.log("✅ Success! New description in DB:", updated.description);
  } catch (err) {
    console.error("❌ Prisma Update Error:", err);
  }

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error:", e);
});

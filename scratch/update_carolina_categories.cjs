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

  console.log("Updating Carolina Beauty category list...");
  const salonId = "1dda4894-1fbc-4d12-ac63-96ce971074df";

  // 1. Update Salon Categories: remove "frisör", add "Fransar & Bryn"
  const updatedSalon = await prisma.salon.update({
    where: { id: salonId },
    data: {
      categories: ["Fransar & Bryn"]
    }
  });
  console.log(`✅ Updated salon categories: ${JSON.stringify(updatedSalon.categories)}`);

  // 2. Update Practitioner Categories
  const practitioners = await prisma.practitioner.findMany({
    where: { salon_id: salonId }
  });
  for (const p of practitioners) {
    const updatedP = await prisma.practitioner.update({
      where: { id: p.id },
      data: {
        categories: ["Naglar", "Fransar & Bryn"]
      }
    });
    console.log(`✅ Updated practitioner ${updatedP.name} categories: ${JSON.stringify(updatedP.categories)}`);
  }

  // 3. Update Services containing "frans" to "Fransar & Bryn"
  const result = await prisma.service.updateMany({
    where: {
      salon_id: salonId,
      name: {
        contains: "frans",
        mode: "insensitive"
      }
    },
    data: {
      category: "Fransar & Bryn"
    }
  });
  console.log(`✅ Updated ${result.count} lash services to 'Fransar & Bryn' category.`);

  // 4. Verify all services
  const freshServices = await prisma.service.findMany({
    where: { salon_id: salonId }
  });
  console.log("\nFresh Carolina Beauty Services List:");
  freshServices.forEach(s => {
    console.log(`- "${s.name}" (category: "${s.category}")`);
  });

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error updating Carolina categories:", e);
});

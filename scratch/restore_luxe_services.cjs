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

  console.log("Restoring services for Luxe By Essi...");
  
  const servicesData = [
    {
      name: "Manikyr",
      description: "Klassisk manikyr med filning, formning av naglar, nagelbandsvård samt vårdande nagelolja och handkräm.",
      price: 200,
      duration_minutes: 90,
      category: "Naglar",
      salon_id: "8d63f8fb-7922-4236-a038-67082058938a"
    },
    {
      name: "Nagelförlängning enkel design",
      description: "Förlängning av naglar med mallar/tippar och enfärgat material eller mycket enkel design.",
      price: 300,
      duration_minutes: 150,
      category: "Naglar",
      salon_id: "8d63f8fb-7922-4236-a038-67082058938a"
    },
    {
      name: "Nagelförlängning avancerad design",
      description: "Förlängning av naglar med mallar/tippar inklusive mer avancerad handmålad design, glitter eller stenar.",
      price: 400,
      duration_minutes: 170,
      category: "Naglar",
      salon_id: "8d63f8fb-7922-4236-a038-67082058938a"
    }
  ];

  for (const s of servicesData) {
    const created = await prisma.service.create({
      data: s
    });
    console.log(`✅ Created service: "${created.name}" with ID ${created.id}`);
  }

  console.log("Restoration complete!");

  await prisma.$disconnect();
  await pool.end();
}

main().catch(e => {
  console.error("Error restoring services:", e);
});

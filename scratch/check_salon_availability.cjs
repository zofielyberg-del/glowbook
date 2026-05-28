const fs = require('fs');
const path = require('path');

// Manually parse .env to avoid requiring dotenv
function loadEnv() {
  const p = path.join(__dirname, '../.env');
  if (fs.existsSync(p)) {
    const content = fs.readFileSync(p, 'utf8');
    content.split('\n').forEach(line => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const key = match[1];
        let value = match[2] || '';
        if (value.startsWith('"') && value.endsWith('"')) {
          value = value.substring(1, value.length - 1);
        } else if (value.startsWith("'") && value.endsWith("'")) {
          value = value.substring(1, value.length - 1);
        }
        process.env[key] = value;
      }
    });
    console.log("Loaded environment from:", p);
  } else {
    console.log("No .env file found at:", p);
  }
}

loadEnv();

const { PrismaClient } = require('@prisma/client');
const { PrismaPg } = require('@prisma/adapter-pg');
const pg = require('pg');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  const profile = await prisma.profile.findUnique({
    where: { email: 'zofielyberg@gmail.com' }
  });
  
  if (!profile) {
    console.log("No profile found for zofielyberg@gmail.com");
    return;
  }
  
  const salon = await prisma.salon.findFirst({
    where: { owner_id: profile.id }
  });
  
  if (!salon) {
    console.log("No salon found for profile ID:", profile.id);
    return;
  }
  
  console.log("Salon ID:", salon.id);
  console.log("Salon Name:", salon.name);
  console.log("Salon Availability:", JSON.stringify(salon.availability, null, 2));
}

main().catch(e => console.error(e)).finally(async () => {
  await prisma.$disconnect();
  await pool.end();
});

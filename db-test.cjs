const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: "postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres",
  });
  
  await client.connect();
  
  const res = await client.query(`
    SELECT id, membership_tier, availability 
    FROM salons 
    LIMIT 1;
  `);
  
  const salon = res.rows[0];
  console.log("Salon:", salon);
  
  const pracRes = await client.query(`
    SELECT id, name, schedule, status 
    FROM practitioners 
    WHERE salon_id = $1;
  `, [salon.id]);
  
  console.log("Practitioners:", JSON.stringify(pracRes.rows, null, 2));
  
  await client.end();
}

main().catch(console.error);

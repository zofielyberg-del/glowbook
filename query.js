import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  const res = await client.query("SELECT duration_minutes, name FROM services WHERE salon_id = '0260785d-2df2-4f3b-ad85-579c58b50d3e'");
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}

main().catch(console.error);

import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  const res = await client.query(`SELECT id, service_id, service_name, practitioner_id FROM appointments ORDER BY created_at DESC LIMIT 5`);
  console.log(JSON.stringify(res.rows, null, 2));
  await client.end();
}
main();

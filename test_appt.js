import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres'
});

async function main() {
  await client.connect();
  // Fetch appointment
  const res = await client.query(`SELECT a.*, s.id as salon_id, s.name as salon_name FROM appointments a JOIN salons s ON a.salon_id = s.id WHERE a.id = 'd9986014-fc3b-4311-9750-f7b4891f1f94'`);
  const appt = res.rows[0];
  console.log('Appointment:', appt);

  // Fetch services for salon
  const res2 = await client.query(`SELECT id, name FROM services WHERE salon_id = $1`, [appt.salon_id]);
  console.log('Services:', res2.rows);

  await client.end();
}
main();

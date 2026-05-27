const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
});

async function main() {
  const email = 'zofielyberg@gmail.com';
  const res = await pool.query('SELECT * FROM "profiles" WHERE email = $1', [email]);
  
  if (res.rows.length === 0) {
    console.log('No user found with email:', email);
  } else {
    console.log('User found:', JSON.stringify(res.rows[0], null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => pool.end());

const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
});

async function main() {
  const email = 'zofielyberg@gmail.com';
  
  const res = await pool.query(
    'UPDATE "profiles" SET first_name = $1, last_name = $2 WHERE email = $3 RETURNING *',
    ['Sofie', 'Lyberg', email]
  );
  
  if (res.rows.length === 0) {
    console.log('No user found with email:', email);
  } else {
    console.log('Successfully updated name:', JSON.stringify(res.rows[0], null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => pool.end());

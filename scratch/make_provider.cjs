const { Pool } = require('pg');

const pool = new Pool({
  connectionString: "postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres"
});

async function main() {
  const email = 'zofielyberg@gmail.com';
  
  const res = await pool.query(
    'UPDATE "profiles" SET role = $1 WHERE email = $2 RETURNING *',
    ['salon_owner', email]
  );
  
  if (res.rows.length === 0) {
    console.log('No user found with email:', email);
  } else {
    console.log('Successfully updated user to salon_owner:', JSON.stringify(res.rows[0], null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => pool.end());

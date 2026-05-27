const { Pool } = require('pg');
require('dotenv').config({ path: '.env.production' }); // read connection string from .env.production

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  const email = 'zofielyberg@gmail.com';
  const res = await pool.query('SELECT * FROM "Profile" WHERE email = $1', [email]);
  
  if (res.rows.length === 0) {
    console.log('No user found with email:', email);
  } else {
    console.log('User found:', JSON.stringify(res.rows[0], null, 2));
  }
}

main()
  .catch(e => console.error(e))
  .finally(() => pool.end());

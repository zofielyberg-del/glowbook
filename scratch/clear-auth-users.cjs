const pg = require('pg');

const DATABASE_URL = "postgresql://postgres.pjfiunxlesujfyriomax:Glowbook2026@aws-0-eu-west-1.pooler.supabase.com:5432/postgres";

(async () => {
  const pool = new pg.Pool({ connectionString: DATABASE_URL });
  try {
    console.log('Starting full database and auth purge...');
    
    // Clear public tables first
    await pool.query('DELETE FROM point_transactions');
    console.log('✓ point_transactions cleared');
    
    await pool.query('DELETE FROM loyalty_balances');
    console.log('✓ loyalty_balances cleared');
    
    await pool.query('DELETE FROM appointments');
    console.log('✓ appointments cleared');
    
    await pool.query('DELETE FROM services');
    console.log('✓ services cleared');
    
    await pool.query('DELETE FROM practitioners');
    console.log('✓ practitioners cleared');
    
    await pool.query('DELETE FROM salons');
    console.log('✓ salons cleared');

    await pool.query('DELETE FROM profiles');
    console.log('✓ profiles cleared');
    
    // Clear Supabase Auth tables so you can sign up with same email
    await pool.query('DELETE FROM auth.users CASCADE');
    console.log('✓ Supabase auth.users cascade cleared');
    
    console.log('\n✅ ALLT ÄR NU HELT RENSAT – Även Supabases inloggningssystem! Du kan registrera dig på nytt nu.');
  } catch (e) {
    console.error('Error during purge:', e.message);
  } finally {
    await pool.end();
  }
})();

import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgres://postgres:J6%23-MLJQE.yMrA7@db.ehpxangzzxenuytyryeq.supabase.co:5432/postgres';

async function checkSecrets() {
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    
    // Check if jwt_secret is available in settings or vault
    const res = await client.query(`
      SELECT name, setting 
      FROM pg_settings 
      WHERE name LIKE '%jwt%' OR name LIKE '%auth%' OR name LIKE '%secret%';
    `);
    console.log('PG Settings:', res.rows);

    const vault = await client.query(`
      SELECT * FROM information_schema.tables WHERE table_schema = 'vault';
    `).catch(() => ({ rows: [] }));
    console.log('Vault tables:', vault.rows);

  } catch (err) {
    console.error('Error:', err);
  } finally {
    await client.end();
  }
}

checkSecrets();

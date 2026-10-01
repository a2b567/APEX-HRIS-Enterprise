import pg from 'pg';
import fs from 'fs';
const { Client } = pg;

const connectionString = 'postgresql://postgres.ehpxangzzxenuytyryeq:J6%23-MLJQE.yMrA7@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres';

async function migrate() {
  console.log('Connecting to Supabase PostgreSQL...');
  const client = new Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected!');

    const sql = fs.readFileSync('supabase_schema.sql', 'utf8');
    console.log('Applying schema migrations...');
    await client.query(sql);
    console.log('✅ Schema migration & seeding completed successfully!');

    // Verify tables
    const res = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log('Created tables:', res.rows.map(r => r.table_name));

    const users = await client.query('SELECT id, username, name, role FROM public.users');
    console.log('Seeded users in DB:', users.rows);

  } catch (err) {
    console.error('Migration error:', err);
  } finally {
    await client.end();
  }
}

migrate();

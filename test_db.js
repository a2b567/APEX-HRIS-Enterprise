import pg from 'pg';
const { Client } = pg;

// Supabase PostgreSQL direct connection
const connectionStrings = [
  'postgresql://postgres.ehpxangzzxenuytyryeq:J6%23-MLJQE.yMrA7@aws-0-ap-northeast-1.pooler.supabase.com:6543/postgres',
  'postgresql://postgres.ehpxangzzxenuytyryeq:J6%23-MLJQE.yMrA7@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres',
  'postgres://postgres:J6%23-MLJQE.yMrA7@db.ehpxangzzxenuytyryeq.supabase.co:5432/postgres'
];

async function testConnection() {
  for (const cs of connectionStrings) {
    console.log(`Testing connection: ${cs.replace(/J6.*?@/, '***@')}...`);
    const client = new Client({
      connectionString: cs,
      ssl: { rejectUnauthorized: false }
    });

    try {
      await client.connect();
      console.log('✅ Successfully connected to Supabase PostgreSQL database!');
      const res = await client.query('SELECT NOW()');
      console.log('Database time:', res.rows[0]);
      await client.end();
      return cs;
    } catch (err) {
      console.error('Connection failed:', err.message);
      try { await client.end(); } catch (e) {}
    }
  }
  return null;
}

testConnection();

// One-shot migration runner — applies a SINGLE .sql file to the DB.
// Usage: DB_URL="postgresql://..." node scripts/run-migration.mjs supabase/migrations/066_orders_and_teacher_applications.sql
// The connection string is read from the DB_URL env var (never hard-coded / committed).
import { readFileSync } from 'node:fs';
import pg from 'pg';

const dbUrl = process.env.DB_URL;
const file = process.argv[2];

if (!dbUrl) {
  console.error('❌ Set the DB_URL env var to your Supabase connection string.');
  process.exit(1);
}
if (!file) {
  console.error('❌ Pass the path to the .sql migration file as the first argument.');
  process.exit(1);
}

const sql = readFileSync(file, 'utf8');
const client = new pg.Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  console.log(`▶ Connected. Applying ${file} …`);
  await client.query('BEGIN');
  await client.query(sql);
  await client.query('COMMIT');
  console.log('✅ Migration applied successfully (committed).');
} catch (err) {
  try { await client.query('ROLLBACK'); } catch { /* ignore */ }
  console.error('❌ Migration failed — rolled back. No changes were made.');
  console.error(err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}

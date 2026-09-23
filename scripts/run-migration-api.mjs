// One-shot migration runner via the Supabase Management API.
// Applies a SINGLE .sql file using a Personal Access Token — no DB password needed.
//
// Usage:
//   SUPABASE_PAT="sbp_..." node scripts/run-migration-api.mjs <project-ref> <path-to-sql>
//
// The token is read from the SUPABASE_PAT env var (never hard-coded / committed).
import { readFileSync } from 'node:fs';

const pat = process.env.SUPABASE_PAT;
const ref = process.argv[2];
const file = process.argv[3];

if (!pat) { console.error('❌ Set SUPABASE_PAT to your Supabase personal access token.'); process.exit(1); }
if (!ref) { console.error('❌ Pass the project ref as the first argument.'); process.exit(1); }
if (!file) { console.error('❌ Pass the path to the .sql file as the second argument.'); process.exit(1); }

const query = readFileSync(file, 'utf8');

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${pat}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ query }),
});

const text = await res.text();
if (!res.ok) {
  console.error(`❌ Failed (HTTP ${res.status}).`);
  console.error(text);
  process.exit(1);
}
console.log('✅ Migration applied successfully via Management API.');
console.log(text || '(no rows returned)');

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const envPath = join(root, '.env.development.local');

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

const schemaPath = join(root, 'db', 'schema.sql');
const url = process.env.DATABASE_URL;

if (!url?.trim()) {
  console.error('DATABASE_URL is not set. Run: vercel env pull .env.development.local');
  process.exit(1);
}

neonConfig.webSocketConstructor = ws;

const pool = new Pool({ connectionString: url });
const schema = readFileSync(schemaPath, 'utf8');

try {
  await pool.query(schema);
  console.log('Schema applied from db/schema.sql');
} catch (err) {
  console.error('Schema apply failed:', err.message);
  process.exit(1);
} finally {
  await pool.end();
}

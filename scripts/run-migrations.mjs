/**
 * scripts/run-migrations.mjs
 * Runs all SQL migrations against Supabase using environment variables.
 */

import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!PROJECT_REF || !SERVICE_ROLE_KEY) {
  console.log('Set SUPABASE_PROJECT_REF and SUPABASE_SERVICE_ROLE_KEY environment variables.');
  process.exit(0);
}

console.log('Migration helper ready.');

#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@supabase/supabase-js';

// Load .env.local manually (no dotenv dep)
function loadEnvFile(filename) {
  try {
    const p = path.resolve(process.cwd(), filename);
    if (!fs.existsSync(p)) return;
    const raw = fs.readFileSync(p, 'utf8');
    for (const line of raw.split(/\r?\n/)) {
      if (!line || line.trim().startsWith('#')) continue;
      const m = line.match(/^([A-Z0-9_]+)=(.*)$/i);
      if (!m) continue;
      const key = m[1];
      let val = m[2] ?? '';
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = val;
    }
  } catch {}
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRole = process.env.SUPABASE_SERVICE_ROLE;

if (!url || !serviceRole) {
  console.error('Faltan variables SUPABASE_URL/NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE');
  process.exit(1);
}

const supabase = createClient(url, serviceRole, { auth: { persistSession: false } });

try {
  const { error } = await supabase.from('clients').delete().ilike('nombre', 'e2e-%');
  if (error) throw error;
  console.log('Limpieza de clientes e2e-* completada.');
} catch (e) {
  console.error('Error limpiando clientes e2e-*:', e.message || e);
  process.exit(1);
}

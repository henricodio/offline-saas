import { createClient } from '@supabase/supabase-js';

// Server-side Supabase instance for Server Components / Route Handlers
// Prefer service role on the server if provided (local dev only), otherwise fall back to anon.
// IMPORTANT: never commit service role to the repo; keep it only in .env.local (ignored) or host secrets.
// Nota: Para permitir el arranque en entornos locales sin .env, usamos valores de respaldo
// no válidos para red (no apuntan a un proyecto real). Las llamadas fallarán con error
// de red, pero el servidor de desarrollo podrá iniciar para previsualización de UI.
const supabaseUrl = (process.env.NEXT_PUBLIC_SUPABASE_URL as string) || 'https://invalid.local';
const serviceKey = (process.env.SUPABASE_SERVICE_ROLE as string) || '';
const anonKey = (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string) || 'anon-key';

export const supabaseServer = createClient(supabaseUrl, serviceKey || anonKey);

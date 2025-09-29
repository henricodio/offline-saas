import { createClient } from '@supabase/supabase-js';

// Client-side Supabase instance
// Requires NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  // This will surface during local dev builds if env vars are missing
  // Avoid throwing at import time in production to not break prerender unexpectedly
  // eslint-disable-next-line no-console
  console.warn('[web] Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local');
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '');

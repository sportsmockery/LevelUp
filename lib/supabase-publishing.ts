// Music Publishing — browser-safe Supabase client.
// Uses @supabase/ssr's createBrowserClient so sessions sync to cookies, which
// is what the Next.js middleware reads to authorize /publishing/app/* routes.
// Server-only helpers live in lib/supabase-publishing-server.ts.

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function getBrowserClient(): SupabaseClient | null {
  try {
    if (URL && ANON && URL.startsWith('http')) {
      return createBrowserClient(URL, ANON);
    }
  } catch {
    // env not present (build time)
  }
  return null;
}

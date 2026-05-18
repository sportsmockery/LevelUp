// Music Publishing — browser-safe Supabase client.
// Server-only helpers live in lib/supabase-publishing-server.ts so this
// module never pulls in next/headers and can be imported from client components.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

export function getBrowserClient(): SupabaseClient | null {
  try {
    if (URL && ANON && URL.startsWith('http')) {
      return createClient(URL, ANON);
    }
  } catch {
    // env not present (build time)
  }
  return null;
}

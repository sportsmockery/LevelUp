// Browser Supabase client.
// Uses @supabase/ssr's createBrowserClient so the session is stored in cookies,
// which is what the middleware (createServerClient) reads. Plain createClient
// from @supabase/supabase-js only writes localStorage, so the middleware would
// always see no user and bounce protected routes back to /login.

import { createBrowserClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSafeClient(): SupabaseClient | null {
  try {
    if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
      return createBrowserClient(supabaseUrl, supabaseAnonKey);
    }
  } catch {
    // Build-time or missing env vars
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const supabase = (getSafeClient() as any);

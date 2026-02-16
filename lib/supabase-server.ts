import { createClient } from '@supabase/supabase-js';

/**
 * Server-side Supabase client using the service role key.
 * Bypasses RLS — only use in API routes, never expose to the client.
 */
function getServerClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  try {
    if (url && serviceKey && url.startsWith('http')) {
      return createClient(url, serviceKey);
    }
  } catch {
    // Build-time or missing env vars
  }
  return null;
}

export const supabaseServer = getServerClient();

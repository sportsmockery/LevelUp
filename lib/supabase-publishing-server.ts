// Music Publishing — server-only Supabase helpers (service role + cookie session).
// Do not import from client components.

import 'server-only';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export function getServiceClient(): SupabaseClient | null {
  try {
    if (URL && SERVICE && URL.startsWith('http')) {
      return createClient(URL, SERVICE, {
        auth: { persistSession: false, autoRefreshToken: false },
      });
    }
  } catch {
    // env not present (build time)
  }
  return null;
}

export async function getRouteClient(): Promise<SupabaseClient | null> {
  if (!URL || !ANON) return null;
  const cookieStore = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(toSet) {
        try {
          toSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setting cookies from a server component is not allowed; ignore.
        }
      },
    },
  });
}

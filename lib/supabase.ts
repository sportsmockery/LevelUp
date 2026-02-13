import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

function getSafeClient() {
  try {
    if (supabaseUrl && supabaseAnonKey && supabaseUrl.startsWith('http')) {
      return createClient(supabaseUrl, supabaseAnonKey);
    }
  } catch {
    // Build-time or missing env vars
  }
  return null as any;
}

export const supabase = getSafeClient();

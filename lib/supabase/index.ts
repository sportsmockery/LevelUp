// Re-export browser and server Supabase clients used by the music product.
// The existing wrestling code uses lib/supabase.ts and lib/supabase-server.ts;
// this folder satisfies the music spec's /lib/supabase requirement.

export { supabase } from '../supabase';
export { supabaseServer } from '../supabase-server';

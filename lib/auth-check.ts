import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

/**
 * Checks the request for a valid Supabase session.
 * Returns the authenticated user or a 401 response.
 *
 * Usage in API routes:
 *   const auth = await requireAuth(request);
 *   if (auth.response) return auth.response; // 401
 *   const user = auth.user; // authenticated user
 */
export async function requireAuth(request: NextRequest): Promise<
  | { user: { id: string; email?: string }; response: null }
  | { user: null; response: NextResponse }
> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    // No Supabase configured — skip auth (dev mode)
    return { user: { id: '00000000-0000-0000-0000-000000000000' }, response: null };
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll() {
        // API routes don't need to set cookies
      },
    },
  });

  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return {
      user: null,
      response: NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 },
      ),
    };
  }

  return { user: { id: user.id, email: user.email }, response: null };
}

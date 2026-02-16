import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';
import { supabaseServer } from '../../../../../lib/supabase-server';
import { requireAuth } from '../../../../../lib/auth-check';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { count, error } = await db
      .from('family_connections')
      .select('id', { count: 'exact', head: true })
      .eq('athlete_user_id', auth.user.id)
      .eq('status', 'pending');

    if (error) {
      console.error('[LevelUp] Family requests count error:', error.message);
      return NextResponse.json({ error: 'Failed to count requests' }, { status: 500 });
    }

    return NextResponse.json({ count: count || 0 });
  } catch (err: any) {
    console.error('[LevelUp] Family requests count error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

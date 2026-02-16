import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { supabaseServer } from '../../../../lib/supabase-server';
import { requireAuth } from '../../../../lib/auth-check';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { data: connections, error } = await db
      .from('family_connections')
      .select('id, parent_user_id, relationship, requested_at, status')
      .eq('athlete_user_id', auth.user.id)
      .eq('status', 'pending')
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('[LevelUp] Family requests error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch requests' }, { status: 500 });
    }

    // Fetch parent display names from profiles table
    const parentIds = (connections || []).map((c: any) => c.parent_user_id);
    let parentNames: Record<string, string> = {};

    if (parentIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, display_name, email')
        .in('id', parentIds);

      if (profiles) {
        for (const p of profiles as any[]) {
          parentNames[p.id] = p.display_name || p.email || 'Unknown';
        }
      }
    }

    const requests = (connections || []).map((c: any) => ({
      id: c.id,
      parentUserId: c.parent_user_id,
      parentName: parentNames[c.parent_user_id] || 'Unknown',
      relationship: c.relationship || 'Parent',
      requestedAt: c.requested_at,
    }));

    return NextResponse.json({ requests });
  } catch (err: any) {
    console.error('[LevelUp] Family requests error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

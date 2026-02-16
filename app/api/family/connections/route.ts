import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-check';

export async function GET(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // Get all family connections for this parent
    const { data: connections, error } = await db
      .from('family_connections')
      .select('id, athlete_user_id, club_id, relationship, status, requested_at, approved_at')
      .eq('parent_user_id', auth.user.id)
      .order('requested_at', { ascending: false });

    if (error) {
      console.error('[LevelUp] family connections error:', error.message);
      return NextResponse.json({ error: 'Failed to fetch connections' }, { status: 500 });
    }

    if (!connections || connections.length === 0) {
      return NextResponse.json({ connections: [] });
    }

    // Fetch athlete profiles for all connected athletes
    const athleteIds = [...new Set(connections.map((c: any) => c.athlete_user_id).filter(Boolean))];

    let athleteMap: Record<string, { full_name: string | null; club_id: string | null; role: string }> = {};
    if (athleteIds.length > 0) {
      const { data: profiles } = await db
        .from('profiles')
        .select('id, full_name, club_id, role')
        .in('id', athleteIds);

      if (profiles) {
        for (const p of profiles as any[]) {
          athleteMap[p.id] = { full_name: p.full_name, club_id: p.club_id, role: p.role };
        }
      }
    }

    // Fetch club names
    const clubIds = [...new Set(connections.map((c: any) => c.club_id).filter(Boolean))];
    let clubMap: Record<string, string> = {};
    if (clubIds.length > 0) {
      const { data: clubs } = await db
        .from('clubs')
        .select('id, name')
        .in('id', clubIds);

      if (clubs) {
        for (const c of clubs as any[]) {
          clubMap[c.id] = c.name;
        }
      }
    }

    const result = connections.map((conn: any) => {
      const athlete = conn.athlete_user_id ? athleteMap[conn.athlete_user_id] : null;
      return {
        connectionId: conn.id,
        status: conn.status,
        relationship: conn.relationship,
        requestedAt: conn.requested_at,
        approvedAt: conn.approved_at,
        athlete: conn.athlete_user_id
          ? {
              id: conn.athlete_user_id,
              name: athlete?.full_name || 'Unknown',
              club: conn.club_id ? clubMap[conn.club_id] || null : null,
            }
          : null,
        clubName: conn.club_id ? clubMap[conn.club_id] || null : null,
      };
    });

    return NextResponse.json({ connections: result });
  } catch (err: any) {
    console.error('[LevelUp] family connections error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

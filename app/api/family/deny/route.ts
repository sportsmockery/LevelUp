import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { supabaseServer } from '../../../../lib/supabase-server';
import { requireAuth } from '../../../../lib/auth-check';

export async function PUT(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 500 });
  }

  try {
    const { connectionId } = await request.json();

    if (!connectionId) {
      return NextResponse.json({ error: 'connectionId is required' }, { status: 400 });
    }

    // Verify this connection belongs to the authenticated athlete
    const { data: conn, error: fetchErr } = await db
      .from('family_connections')
      .select('id, athlete_user_id, status')
      .eq('id', connectionId)
      .single();

    if (fetchErr || !conn) {
      return NextResponse.json({ error: 'Connection not found' }, { status: 404 });
    }

    if (conn.athlete_user_id !== auth.user.id) {
      return NextResponse.json({ error: 'Not authorized' }, { status: 403 });
    }

    if (conn.status !== 'pending') {
      return NextResponse.json({ error: 'Connection is not pending' }, { status: 400 });
    }

    const { error: updateErr } = await db
      .from('family_connections')
      .update({ status: 'rejected' })
      .eq('id', connectionId);

    if (updateErr) {
      console.error('[LevelUp] Family deny error:', updateErr.message);
      return NextResponse.json({ error: 'Failed to deny' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[LevelUp] Family deny error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

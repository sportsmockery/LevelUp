import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const token = request.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.json({ valid: false, error: 'Token is required' }, { status: 400 });
  }

  try {
    // Look up token
    const { data: invite, error } = await db
      .from('club_invite_tokens')
      .select('id, club_id, expires_at, max_uses, use_count')
      .eq('token', token)
      .single();

    if (error || !invite) {
      return NextResponse.json({ valid: false, error: 'Invalid invite link' });
    }

    // Check expiration
    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ valid: false, error: 'This invite link has expired' });
    }

    // Check max uses
    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      return NextResponse.json({ valid: false, error: 'This invite link has reached its usage limit' });
    }

    // Fetch club name
    const { data: club } = await db
      .from('clubs')
      .select('id, name')
      .eq('id', invite.club_id)
      .single();

    return NextResponse.json({
      valid: true,
      clubId: invite.club_id,
      clubName: club?.name || 'Unknown Club',
    });
  } catch (err: any) {
    console.error('[LevelUp] invite validate error:', err);
    return NextResponse.json({ valid: false, error: 'Internal server error' }, { status: 500 });
  }
}

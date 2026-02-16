import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { supabase } from '@/lib/supabase';
import { requireAuth } from '@/lib/auth-check';

export async function POST(request: NextRequest) {
  const auth = await requireAuth(request);
  if (auth.response) return auth.response;

  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { token, relationship } = await request.json();

    if (!token) {
      return NextResponse.json({ error: 'Token is required' }, { status: 400 });
    }

    // Validate token
    const { data: invite, error: inviteError } = await db
      .from('club_invite_tokens')
      .select('id, club_id, expires_at, max_uses, use_count')
      .eq('token', token)
      .single();

    if (inviteError || !invite) {
      return NextResponse.json({ error: 'Invalid invite link' }, { status: 400 });
    }

    if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
      return NextResponse.json({ error: 'This invite link has expired' }, { status: 400 });
    }

    if (invite.max_uses !== null && invite.use_count >= invite.max_uses) {
      return NextResponse.json({ error: 'This invite link has reached its usage limit' }, { status: 400 });
    }

    // Get user's profile to determine role
    const { data: profile } = await db
      .from('profiles')
      .select('role')
      .eq('id', auth.user.id)
      .single();

    const userRole = profile?.role || 'parent';
    const isAthlete = userRole === 'athlete';

    if (isAthlete) {
      // Athlete joining a club → create club_member
      const { error: memberError } = await db
        .from('club_members')
        .upsert({
          club_id: invite.club_id,
          athlete_id: auth.user.id,
          role: 'athlete',
          status: 'active',
        }, { onConflict: 'club_id,athlete_id' });

      if (memberError) {
        console.error('[LevelUp] join club_member error:', memberError.message);
        return NextResponse.json({ error: 'Failed to join club' }, { status: 500 });
      }

      // Update profile with club_id
      await db
        .from('profiles')
        .update({ club_id: invite.club_id })
        .eq('id', auth.user.id);
    } else {
      // Parent/guardian/supporter → create family_connection (pending approval)
      const { error: connError } = await db
        .from('family_connections')
        .insert({
          parent_user_id: auth.user.id,
          club_id: invite.club_id,
          relationship: relationship || 'parent',
          status: 'pending',
        });

      if (connError) {
        console.error('[LevelUp] join family_connection error:', connError.message);
        return NextResponse.json({ error: 'Failed to join club' }, { status: 500 });
      }
    }

    // Increment use_count
    await db
      .from('club_invite_tokens')
      .update({ use_count: invite.use_count + 1 })
      .eq('id', invite.id);

    return NextResponse.json({
      success: true,
      type: isAthlete ? 'athlete_joined' : 'parent_pending',
      clubId: invite.club_id,
    });
  } catch (err: any) {
    console.error('[LevelUp] invite join error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

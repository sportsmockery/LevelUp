import { NextRequest, NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
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
    // Verify user is org_admin or coach
    const { data: profile, error: profileError } = await db
      .from('profiles')
      .select('role, club_id')
      .eq('id', auth.user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 });
    }

    if (!['org_admin', 'coach'].includes(profile.role)) {
      return NextResponse.json({ error: 'Only admins and coaches can generate invite links' }, { status: 403 });
    }

    if (!profile.club_id) {
      return NextResponse.json({ error: 'You must belong to a club to generate invite links' }, { status: 400 });
    }

    // Generate random token
    const token = randomBytes(16).toString('hex');

    // Expires in 30 days
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    // Insert token
    const { error: insertError } = await db
      .from('club_invite_tokens')
      .insert({
        club_id: profile.club_id,
        token,
        created_by_user_id: auth.user.id,
        expires_at: expiresAt.toISOString(),
      });

    if (insertError) {
      console.error('[LevelUp] invite generate error:', insertError.message);
      return NextResponse.json({ error: 'Failed to generate invite link' }, { status: 500 });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://levelupwrestlingapp.com';

    return NextResponse.json({
      token,
      url: `${baseUrl}/join/${token}`,
      expiresAt: expiresAt.toISOString(),
    });
  } catch (err: any) {
    console.error('[LevelUp] invite generate error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

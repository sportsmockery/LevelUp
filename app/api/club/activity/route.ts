import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const clubId = request.nextUrl.searchParams.get('clubId');
  const athleteId = request.nextUrl.searchParams.get('athleteId');
  const limit = parseInt(request.nextUrl.searchParams.get('limit') || '30', 10);
  const offset = parseInt(request.nextUrl.searchParams.get('offset') || '0', 10);

  if (!clubId && !athleteId) {
    return NextResponse.json({ error: 'clubId or athleteId required' }, { status: 400 });
  }

  try {
    let query = supabase
      .from('activity_feed')
      .select('*')
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    if (clubId) {
      query = query.eq('club_id', clubId);
    }
    if (athleteId) {
      query = query.eq('athlete_id', athleteId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      activities: data || [],
      count: data?.length || 0,
      offset,
      limit,
    });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch activity' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { clubId, athleteId, athleteName, eventType, title, subtitle, metadata } = body;

    if (!athleteId || !eventType || !title) {
      return NextResponse.json({ error: 'athleteId, eventType, and title are required' }, { status: 400 });
    }

    const validTypes = ['analysis_complete', 'score_improvement', 'badge_earned', 'streak', 'comparison', 'drill_completed', 'milestone'];
    if (!validTypes.includes(eventType)) {
      return NextResponse.json({ error: `Invalid eventType. Must be one of: ${validTypes.join(', ')}` }, { status: 400 });
    }

    const { data, error } = await supabase
      .from('activity_feed')
      .insert({
        club_id: clubId || null,
        athlete_id: athleteId,
        athlete_name: athleteName || null,
        event_type: eventType,
        title,
        subtitle: subtitle || null,
        metadata: metadata || {},
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, activityId: data?.id });

  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to create activity' }, { status: 500 });
  }
}

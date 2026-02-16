import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { supabaseServer } from '../../../lib/supabase-server';

const XP_BY_PRIORITY: Record<string, number> = {
  critical: 50,
  high: 35,
  medium: 25,
  maintenance: 15,
};

export async function GET(request: NextRequest) {
  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  const athleteId = request.nextUrl.searchParams.get('athlete_id');
  if (!athleteId) {
    return NextResponse.json({ error: 'athlete_id is required' }, { status: 400 });
  }

  try {
    const { data, error } = await db
      .from('drill_assignments')
      .select('id, analysis_id, athlete_id, drill_name, drill_desc, reps, priority, addresses, completed, completed_at, created_at')
      .eq('athlete_id', athleteId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;

    return NextResponse.json({ drills: data || [] });
  } catch (err: any) {
    console.error('[LevelUp] Drills GET error:', err);
    return NextResponse.json({ error: err.message || 'Failed to fetch drills' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  let body: { drillId?: string; athleteId?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { drillId, athleteId } = body;
  if (!drillId || !athleteId) {
    return NextResponse.json({ error: 'drillId and athleteId are required' }, { status: 400 });
  }

  try {
    // Fetch the drill to get its details
    const { data: drill, error: fetchError } = await db
      .from('drill_assignments')
      .select('id, drill_name, drill_desc, priority, completed, athlete_id')
      .eq('id', drillId)
      .single();

    if (fetchError || !drill) {
      return NextResponse.json({ error: 'Drill not found' }, { status: 404 });
    }

    if (drill.athlete_id !== athleteId) {
      return NextResponse.json({ error: 'Drill does not belong to this athlete' }, { status: 403 });
    }

    if (drill.completed) {
      return NextResponse.json({ error: 'Drill already completed' }, { status: 409 });
    }

    // Mark drill complete
    const { error: updateError } = await db
      .from('drill_assignments')
      .update({ completed: true, completed_at: new Date().toISOString() })
      .eq('id', drillId);

    if (updateError) throw updateError;

    // Calculate XP
    const xpEarned = XP_BY_PRIORITY[drill.priority] || 15;

    // Log to level_history
    const { error: historyError } = await db
      .from('level_history')
      .insert({
        athlete_id: athleteId,
        event_type: 'drill_completed',
        title: `+${xpEarned} XP — ${drill.drill_name}`,
        subtitle: drill.drill_desc || '',
      });

    if (historyError) {
      console.error('[LevelUp] Failed to log drill completion to level_history:', historyError);
    }

    return NextResponse.json({ success: true, xp_earned: xpEarned });
  } catch (err: any) {
    console.error('[LevelUp] Drills POST error:', err);
    return NextResponse.json({ error: err.message || 'Failed to complete drill' }, { status: 500 });
  }
}

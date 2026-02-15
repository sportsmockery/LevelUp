import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ eventId: string }> }
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { eventId } = await params;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Get event info
    const { data: event, error: eventErr } = await supabase
      .from('events')
      .select('id, name, start_date, end_date, location_city, location_state, venue, flo_event_id')
      .eq('id', eventId)
      .single();

    if (eventErr || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    // Get all brackets for this event
    const { data: brackets, error: bracketErr } = await supabase
      .from('event_brackets')
      .select('id, flo_bracket_id, weight_class, participant_count, bout_count, synced_at')
      .eq('event_id', eventId)
      .order('weight_class');

    if (bracketErr) {
      return NextResponse.json({ error: 'Failed to fetch brackets' }, { status: 500 });
    }

    if (!brackets || brackets.length === 0) {
      return NextResponse.json({
        event,
        brackets: [],
        message: 'No bracket data synced yet',
      });
    }

    // For each bracket, get bouts and placements
    const bracketIds = brackets.map((b: { id: string }) => b.id);

    const [boutsResult, placementsResult] = await Promise.all([
      supabase
        .from('event_bouts')
        .select('*')
        .in('bracket_id', bracketIds)
        .order('round_name')
        .order('match_number'),
      supabase
        .from('event_placements')
        .select('*')
        .in('bracket_id', bracketIds)
        .order('place'),
    ]);

    // Group bouts and placements by bracket_id
    const boutsByBracket = new Map<string, Record<string, unknown>[]>();
    const placementsByBracket = new Map<string, Record<string, unknown>[]>();

    for (const bout of boutsResult.data || []) {
      const existing = boutsByBracket.get(bout.bracket_id) || [];
      existing.push(bout);
      boutsByBracket.set(bout.bracket_id, existing);
    }

    for (const p of placementsResult.data || []) {
      const existing = placementsByBracket.get(p.bracket_id) || [];
      existing.push(p);
      placementsByBracket.set(p.bracket_id, existing);
    }

    // Combine
    const fullBrackets = brackets.map((b: { id: string }) => ({
      ...b,
      bouts: boutsByBracket.get(b.id) || [],
      placements: placementsByBracket.get(b.id) || [],
    }));

    return NextResponse.json({
      event,
      brackets: fullBrackets,
    });
  } catch (error) {
    console.error('[Mobile Brackets] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

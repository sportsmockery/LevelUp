import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '50', 10), 100);
    const offset = parseInt(url.searchParams.get('offset') || '0', 10);

    // Get events from the past 14 days forward
    const fourteenDaysAgo = new Date();
    fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);
    const cutoffDate = fourteenDaysAgo.toISOString().split('T')[0];

    const { data: events, error, count } = await supabase
      .from('events')
      .select(
        'id, name, start_date, end_date, location_city, location_state, venue, street, zip, style, age_divisions, trackwrestling_url, flo_event_id, flo_bracket_url, bracket_sync_status, total_brackets, total_bouts, tw_tournament_id',
        { count: 'exact' }
      )
      .gte('start_date', cutoffDate)
      .order('start_date', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error('[Mobile Events] Query error:', error);
      return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 });
    }

    // Add computed fields
    const enrichedEvents = (events || []).map((e: Record<string, string | number | null>) => ({
      ...e,
      hasBracketData: e.bracket_sync_status === 'synced' && ((e.total_brackets as number) || 0) > 0,
      floUrl: e.flo_event_id
        ? `https://www.flowrestling.org/nextgen/events/${e.flo_event_id}/brackets`
        : null,
      twUrl: e.tw_tournament_id
        ? `https://www.trackwrestling.com/Login.jsp?tName=&state=16&sDate=&eDate=&lastName=&firstName=&teamName=&sfvString=&city=&gbId=&camps=false`
        : null,
    }));

    return NextResponse.json({
      events: enrichedEvents,
      total: count || 0,
      limit,
      offset,
    });
  } catch (error) {
    console.error('[Mobile Events] Unexpected error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

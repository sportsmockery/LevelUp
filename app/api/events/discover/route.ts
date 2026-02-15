import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { scrapeIllinoisEvents } from '@/lib/tw-events';
import { findFloEventIdsBatch } from '@/lib/flo-api';
import type { TwEvent } from '@/lib/tw-events';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const pages = Math.min(Math.max(body.pages || 1, 1), 10);

    // Step 1: Scrape TW events
    let allTwEvents: TwEvent[] = [];
    let totalCount = 0;

    for (let page = 0; page < pages; page++) {
      const result = await scrapeIllinoisEvents(page);
      allTwEvents = allTwEvents.concat(result.events);
      if (page === 0) totalCount = result.totalCount;

      if (result.events.length === 0) break;
    }

    if (allTwEvents.length === 0) {
      return NextResponse.json({
        totalScraped: 0,
        newCandidates: 0,
        alreadyKnown: 0,
        floMatched: 0,
        message: 'No events found on TrackWrestling',
      });
    }

    // Step 2: Deduplicate against existing candidate_events AND events
    const twIds = allTwEvents.map((e) => e.twTournamentId);

    const { data: existingCandidates } = await supabase
      .from('candidate_events')
      .select('tw_tournament_id')
      .in('tw_tournament_id', twIds);

    const { data: existingEvents } = await supabase
      .from('events')
      .select('tw_tournament_id')
      .in('tw_tournament_id', twIds);

    const knownTwIds = new Set([
      ...(existingCandidates || []).map((c: { tw_tournament_id: string }) => c.tw_tournament_id),
      ...(existingEvents || []).map((e: { tw_tournament_id: string }) => e.tw_tournament_id),
    ]);

    const newEvents = allTwEvents.filter((e) => !knownTwIds.has(e.twTournamentId));

    if (newEvents.length === 0) {
      return NextResponse.json({
        totalScraped: allTwEvents.length,
        newCandidates: 0,
        alreadyKnown: allTwEvents.length,
        floMatched: 0,
        totalOnTW: totalCount,
      });
    }

    // Step 3: Auto-match to Flo event IDs
    const { data: configRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'last_flo_event_id')
      .single();

    const hintFloId = configRow ? parseInt(configRow.value, 10) : 14468740;

    let floMatchMap = new Map<string, string>();
    try {
      floMatchMap = await findFloEventIdsBatch(
        newEvents.map((e) => ({ name: e.name, startDate: e.startDate })),
        hintFloId
      );
    } catch (err) {
      console.error('[Discover] Flo matching error:', err);
    }

    // Step 4: Insert new candidates
    const candidateRows = newEvents.map((e) => ({
      name: e.name,
      start_date: e.startDate,
      end_date: e.endDate,
      location_city: e.city,
      location_state: e.state || 'IL',
      venue: e.venueName,
      street: e.street,
      zip: e.zip,
      tw_tournament_id: e.twTournamentId,
      flo_event_id: floMatchMap.get(e.name) || null,
      match_confidence: floMatchMap.has(e.name) ? 90 : null,
      source: 'trackwrestling',
      status: 'pending',
    }));

    const { error: insertError } = await supabase
      .from('candidate_events')
      .upsert(candidateRows, { onConflict: 'tw_tournament_id', ignoreDuplicates: true });

    if (insertError) {
      console.error('[Discover] Insert error:', insertError);
      return NextResponse.json({ error: 'Failed to insert candidates', details: insertError.message }, { status: 500 });
    }

    // Step 5: Update last known Flo ID
    if (floMatchMap.size > 0) {
      const maxFloId = Math.max(...Array.from(floMatchMap.values()).map(Number));
      await supabase
        .from('app_config')
        .upsert({ key: 'last_flo_event_id', value: String(maxFloId) }, { onConflict: 'key' });
    }

    return NextResponse.json({
      totalScraped: allTwEvents.length,
      newCandidates: newEvents.length,
      alreadyKnown: allTwEvents.length - newEvents.length,
      floMatched: floMatchMap.size,
      totalOnTW: totalCount,
    });
  } catch (error) {
    console.error('[Discover] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

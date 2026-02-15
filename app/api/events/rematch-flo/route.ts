import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { findFloEventIdsBatch } from '@/lib/flo-api';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { scope } = body; // 'events' | 'candidates' | 'all'

    type NameDateRow = { id: string; name: string; start_date: string };
    let matchedCount = 0;
    const errors: string[] = [];

    // Get Flo ID hint
    const { data: configRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'last_flo_event_id')
      .single();

    const hintFloId = configRow ? parseInt(configRow.value, 10) : 14468740;

    // Rematch unmatched approved events
    if (scope === 'events' || scope === 'all') {
      const { data: unmatchedEvents } = await supabase
        .from('events')
        .select('id, name, start_date')
        .is('flo_event_id', null);

      if (unmatchedEvents && unmatchedEvents.length > 0) {
        try {
          const matchMap = await findFloEventIdsBatch(
            unmatchedEvents.map((e: NameDateRow) => ({ name: e.name, startDate: e.start_date })),
            hintFloId
          );

          for (const event of unmatchedEvents) {
            const floId = matchMap.get(event.name);
            if (floId) {
              await supabase
                .from('events')
                .update({ flo_event_id: floId })
                .eq('id', event.id);
              matchedCount++;
            }
          }
        } catch (err) {
          errors.push(`Events rematch: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    // Rematch unmatched pending candidates
    if (scope === 'candidates' || scope === 'all') {
      const { data: unmatchedCandidates } = await supabase
        .from('candidate_events')
        .select('id, name, start_date')
        .is('flo_event_id', null)
        .eq('status', 'pending');

      if (unmatchedCandidates && unmatchedCandidates.length > 0) {
        try {
          const matchMap = await findFloEventIdsBatch(
            unmatchedCandidates.map((c: NameDateRow) => ({ name: c.name, startDate: c.start_date })),
            hintFloId
          );

          for (const candidate of unmatchedCandidates) {
            const floId = matchMap.get(candidate.name);
            if (floId) {
              await supabase
                .from('candidate_events')
                .update({ flo_event_id: floId, match_confidence: 90 })
                .eq('id', candidate.id);
              matchedCount++;
            }
          }
        } catch (err) {
          errors.push(`Candidates rematch: ${err instanceof Error ? err.message : String(err)}`);
        }
      }
    }

    return NextResponse.json({
      success: true,
      matchedCount,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (error) {
    console.error('[Rematch Flo] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

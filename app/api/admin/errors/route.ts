import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    // 1. Sync Health Overview
    const { data: syncCounts } = await supabase
      .from('events')
      .select('bracket_sync_status');

    type SyncRow = { bracket_sync_status: string | null };
    const health = {
      total: syncCounts?.length || 0,
      synced: syncCounts?.filter((e: SyncRow) => e.bracket_sync_status === 'synced').length || 0,
      error: syncCounts?.filter((e: SyncRow) => e.bracket_sync_status === 'error').length || 0,
      pending: syncCounts?.filter((e: SyncRow) => e.bracket_sync_status === 'pending').length || 0,
      syncing: syncCounts?.filter((e: SyncRow) => e.bracket_sync_status === 'syncing').length || 0,
    };

    // 2. Cron Job History (last 20 runs)
    const { data: cronLogs } = await supabase
      .from('cron_logs')
      .select('*')
      .order('started_at', { ascending: false })
      .limit(20);

    // 3. Failed Events (bracket_sync_status = 'error')
    const { data: failedEvents } = await supabase
      .from('events')
      .select('id, name, start_date, flo_event_id, bracket_sync_status, updated_at')
      .eq('bracket_sync_status', 'error')
      .order('updated_at', { ascending: false })
      .limit(50);

    // 4. Unmatched Events (no flo_event_id)
    const { data: unmatchedEvents } = await supabase
      .from('events')
      .select('id, name, start_date, tw_tournament_id, flo_event_id')
      .is('flo_event_id', null)
      .order('start_date', { ascending: false })
      .limit(50);

    // 5. Unmatched Candidates (pending, no flo match)
    const { data: unmatchedCandidates } = await supabase
      .from('candidate_events')
      .select('id, name, start_date, tw_tournament_id, flo_event_id, status')
      .is('flo_event_id', null)
      .eq('status', 'pending')
      .order('start_date', { ascending: false })
      .limit(50);

    return NextResponse.json({
      health,
      cronLogs: cronLogs || [],
      failedEvents: failedEvents || [],
      unmatchedEvents: unmatchedEvents || [],
      unmatchedCandidates: unmatchedCandidates || [],
    });
  } catch (error) {
    console.error('[Admin Errors] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

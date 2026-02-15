import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { scrapeIllinoisEvents } from '@/lib/tw-events';
import { findFloEventIdsBatch, getFullEventData } from '@/lib/flo-api';
import type { TwEvent } from '@/lib/tw-events';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Use service role client for cron (no user session)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Missing Supabase configuration' }, { status: 503 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const log: string[] = [];
  const addLog = (msg: string) => {
    console.log(`[Cron] ${msg}`);
    log.push(msg);
  };

  // Create cron log entry
  const startTime = Date.now();
  const { data: cronLog } = await supabase
    .from('cron_logs')
    .insert({ job_name: 'discover-events', status: 'running' })
    .select('id')
    .single();
  const cronLogId = cronLog?.id;

  try {
    // Step 1: Scrape first 2 pages of TW events (60 most recent)
    addLog('Starting TW scrape...');
    let allEvents: TwEvent[] = [];

    for (let page = 0; page < 2; page++) {
      try {
        const result = await scrapeIllinoisEvents(page);
        allEvents = allEvents.concat(result.events);
        addLog(`Page ${page}: scraped ${result.events.length} events (${result.totalCount} total on TW)`);
        if (result.events.length === 0) break;
      } catch (err) {
        addLog(`Page ${page} scrape failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (allEvents.length === 0) {
      addLog('No events scraped from TW');
      if (cronLogId) {
        await supabase.from('cron_logs').update({
          status: 'success', finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime, scraped: 0, log_lines: log,
        }).eq('id', cronLogId);
      }
      return NextResponse.json({ success: true, log });
    }

    // Step 2: Deduplicate
    const twIds = allEvents.map((e) => e.twTournamentId);

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

    const newEvents = allEvents.filter((e) => !knownTwIds.has(e.twTournamentId));
    addLog(`${newEvents.length} new events (${allEvents.length - newEvents.length} already known)`);

    if (newEvents.length === 0) {
      if (cronLogId) {
        await supabase.from('cron_logs').update({
          status: 'success', finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime, scraped: allEvents.length,
          new_candidates: 0, log_lines: log,
        }).eq('id', cronLogId);
      }
      return NextResponse.json({ success: true, newCandidates: 0, log });
    }

    // Step 3: Auto-match Flo IDs
    const { data: configRow } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'last_flo_event_id')
      .single();

    const hintFloId = configRow ? parseInt(configRow.value, 10) : 14468740;
    addLog(`Flo ID scan center: ${hintFloId}`);

    let floMatchMap = new Map<string, string>();
    try {
      floMatchMap = await findFloEventIdsBatch(
        newEvents.map((e) => ({ name: e.name, startDate: e.startDate })),
        hintFloId
      );
      addLog(`Flo auto-matched: ${floMatchMap.size}/${newEvents.length}`);
    } catch (err) {
      addLog(`Flo matching failed: ${err instanceof Error ? err.message : String(err)}`);
    }

    // Step 4: Insert candidates
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

    const { error: insertErr } = await supabase
      .from('candidate_events')
      .upsert(candidateRows, { onConflict: 'tw_tournament_id', ignoreDuplicates: true });

    if (insertErr) {
      addLog(`Candidate insert error: ${insertErr.message}`);
    }

    // Step 5: Auto-approve + sync matched events
    let autoApproved = 0;
    let autoSynced = 0;

    for (const [eventName, floId] of floMatchMap.entries()) {
      try {
        const candidate = candidateRows.find((c) => c.name === eventName);
        if (!candidate) continue;

        // Insert into events table
        const { data: newEvent, error: eventInsertErr } = await supabase
          .from('events')
          .upsert(
            {
              name: candidate.name,
              start_date: candidate.start_date,
              end_date: candidate.end_date,
              location_city: candidate.location_city,
              location_state: candidate.location_state,
              venue: candidate.venue,
              street: candidate.street,
              zip: candidate.zip,
              tw_tournament_id: candidate.tw_tournament_id,
              flo_event_id: floId,
              source: 'trackwrestling',
              bracket_sync_status: 'syncing',
            },
            { onConflict: 'tw_tournament_id' }
          )
          .select('id')
          .single();

        if (eventInsertErr || !newEvent) {
          addLog(`Auto-approve failed for ${eventName}: ${eventInsertErr?.message}`);
          continue;
        }

        autoApproved++;

        // Update candidate status
        await supabase
          .from('candidate_events')
          .update({ status: 'auto_approved', approved_event_id: newEvent.id })
          .eq('tw_tournament_id', candidate.tw_tournament_id);

        // Sync brackets from Flo
        try {
          const floData = await getFullEventData(floId);
          let totalBouts = 0;
          let totalBrackets = 0;

          for (const bracket of floData.brackets) {
            const { data: bracketRow, error: bracketErr } = await supabase
              .from('event_brackets')
              .upsert(
                {
                  event_id: newEvent.id,
                  flo_bracket_id: bracket.weightClass,
                  weight_class: bracket.weightClass,
                  participant_count: bracket.participantCount,
                  bout_count: bracket.bouts.length,
                  synced_at: new Date().toISOString(),
                },
                { onConflict: 'event_id,flo_bracket_id' }
              )
              .select('id')
              .single();

            if (bracketErr || !bracketRow) continue;
            totalBrackets++;

            // Clear and re-insert bouts
            await supabase.from('event_bouts').delete().eq('bracket_id', bracketRow.id);
            await supabase.from('event_placements').delete().eq('bracket_id', bracketRow.id);

            if (bracket.bouts.length > 0) {
              const boutRows = bracket.bouts.map((bout) => ({
                bracket_id: bracketRow.id,
                flo_bout_id: bout.id,
                match_number: bout.matchNumber,
                round_name: bout.roundName,
                result: bout.result,
                win_type: bout.winType,
                bout_state: bout.state,
                placement: bout.placement,
                top_wrestler_name: bout.topParticipant?.name || null,
                top_wrestler_team: bout.topParticipant?.teamName || null,
                top_wrestler_display_team: bout.topParticipant?.displayTeamName || null,
                top_wrestler_seed: bout.topParticipant?.seed || null,
                top_wrestler_score: bout.topParticipant?.score || 0,
                top_wrestler_winner: bout.topParticipant?.winner || false,
                top_wrestler_flo_id: bout.topParticipant?.id || null,
                bottom_wrestler_name: bout.bottomParticipant?.name || null,
                bottom_wrestler_team: bout.bottomParticipant?.teamName || null,
                bottom_wrestler_display_team: bout.bottomParticipant?.displayTeamName || null,
                bottom_wrestler_seed: bout.bottomParticipant?.seed || null,
                bottom_wrestler_score: bout.bottomParticipant?.score || 0,
                bottom_wrestler_winner: bout.bottomParticipant?.winner || false,
                bottom_wrestler_flo_id: bout.bottomParticipant?.id || null,
                bracket_x: bout.x,
                bracket_y: bout.y,
              }));

              for (let i = 0; i < boutRows.length; i += 50) {
                await supabase.from('event_bouts').insert(boutRows.slice(i, i + 50));
              }
              totalBouts += boutRows.length;
            }

            if (bracket.placements.length > 0) {
              await supabase.from('event_placements').insert(
                bracket.placements.map((p) => ({
                  bracket_id: bracketRow.id,
                  place: p.place,
                  wrestler_name: p.name,
                  team_name: p.teamName,
                  flo_participant_id: p.participantId,
                }))
              );
            }
          }

          // Update event sync status
          await supabase
            .from('events')
            .update({
              bracket_sync_status: 'synced',
              bracket_synced_at: new Date().toISOString(),
              total_brackets: totalBrackets,
              total_bouts: totalBouts,
            })
            .eq('id', newEvent.id);

          autoSynced++;
          addLog(`Auto-synced ${eventName}: ${totalBrackets} brackets, ${totalBouts} bouts`);
        } catch (syncErr) {
          addLog(`Auto-sync failed for ${eventName}: ${syncErr instanceof Error ? syncErr.message : String(syncErr)}`);
          await supabase
            .from('events')
            .update({ bracket_sync_status: 'error' })
            .eq('id', newEvent.id);
        }
      } catch (err) {
        addLog(`Auto-approve error: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Step 6: Update last known Flo ID
    if (floMatchMap.size > 0) {
      const maxFloId = Math.max(...Array.from(floMatchMap.values()).map(Number));
      await supabase
        .from('app_config')
        .upsert({ key: 'last_flo_event_id', value: String(maxFloId) }, { onConflict: 'key' });
    }

    // Update cron log with results
    if (cronLogId) {
      await supabase
        .from('cron_logs')
        .update({
          status: 'success',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          scraped: allEvents.length,
          new_candidates: newEvents.length,
          flo_matched: floMatchMap.size,
          auto_approved: autoApproved,
          auto_synced: autoSynced,
          log_lines: log,
        })
        .eq('id', cronLogId);
    }

    return NextResponse.json({
      success: true,
      scraped: allEvents.length,
      newCandidates: newEvents.length,
      floMatched: floMatchMap.size,
      autoApproved,
      autoSynced,
      log,
    });
  } catch (error) {
    addLog(`Fatal error: ${error instanceof Error ? error.message : String(error)}`);

    // Log cron failure
    if (cronLogId) {
      await supabase
        .from('cron_logs')
        .update({
          status: 'error',
          finished_at: new Date().toISOString(),
          duration_ms: Date.now() - startTime,
          error_message: error instanceof Error ? error.message : String(error),
          log_lines: log,
        })
        .eq('id', cronLogId);
    }

    return NextResponse.json({ success: false, error: 'Cron failed', log }, { status: 500 });
  }
}

import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { getFullEventData } from '@/lib/flo-api';

export const maxDuration = 60;

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { candidateId, syncBrackets } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    // Get candidate
    const { data: candidate, error: candErr } = await supabase
      .from('candidate_events')
      .select('*')
      .eq('id', candidateId)
      .single();

    if (candErr || !candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    // Insert into events table
    const { data: newEvent, error: eventErr } = await supabase
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
          flo_event_id: candidate.flo_event_id,
          source: candidate.source || 'trackwrestling',
          bracket_sync_status: syncBrackets && candidate.flo_event_id ? 'syncing' : 'pending',
        },
        { onConflict: 'tw_tournament_id' }
      )
      .select('id')
      .single();

    if (eventErr || !newEvent) {
      return NextResponse.json({ error: 'Failed to create event', details: eventErr?.message }, { status: 500 });
    }

    // Update candidate status
    await supabase
      .from('candidate_events')
      .update({ status: 'approved', approved_event_id: newEvent.id })
      .eq('id', candidateId);

    let bracketsImported = 0;
    let boutsImported = 0;

    // Sync brackets if requested and Flo ID exists
    if (syncBrackets && candidate.flo_event_id) {
      try {
        const floData = await getFullEventData(candidate.flo_event_id);

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
          bracketsImported++;

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
            boutsImported += boutRows.length;
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

        await supabase
          .from('events')
          .update({
            bracket_sync_status: 'synced',
            bracket_synced_at: new Date().toISOString(),
            total_brackets: bracketsImported,
            total_bouts: boutsImported,
          })
          .eq('id', newEvent.id);
      } catch (syncErr) {
        console.error('[Approve] Sync failed:', syncErr);
        await supabase
          .from('events')
          .update({ bracket_sync_status: 'error' })
          .eq('id', newEvent.id);
      }
    }

    return NextResponse.json({
      success: true,
      eventId: newEvent.id,
      bracketsImported,
      boutsImported,
    });
  } catch (error) {
    console.error('[Approve] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

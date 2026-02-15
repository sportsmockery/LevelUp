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
    const { eventId } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    // Get event from DB
    const { data: event, error: eventError } = await supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 });
    }

    if (!event.flo_event_id) {
      return NextResponse.json({ error: 'No Flo event ID linked to this event. Add one first.' }, { status: 400 });
    }

    // Fetch all data from Flo
    const floData = await getFullEventData(event.flo_event_id);

    let bracketsImported = 0;
    let boutsImported = 0;
    let placementsImported = 0;

    for (const bracket of floData.brackets) {
      // Upsert bracket
      const { data: bracketRow, error: bracketErr } = await supabase
        .from('event_brackets')
        .upsert(
          {
            event_id: eventId,
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

      if (bracketErr || !bracketRow) {
        console.error(`[Sync] Failed to upsert bracket ${bracket.weightClass}:`, bracketErr);
        continue;
      }

      bracketsImported++;

      // Delete existing bouts and placements for this bracket (full refresh)
      await supabase.from('event_bouts').delete().eq('bracket_id', bracketRow.id);
      await supabase.from('event_placements').delete().eq('bracket_id', bracketRow.id);

      // Insert bouts
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

        // Insert in batches of 50
        for (let i = 0; i < boutRows.length; i += 50) {
          const batch = boutRows.slice(i, i + 50);
          const { error: boutErr } = await supabase.from('event_bouts').insert(batch);
          if (boutErr) {
            console.error(`[Sync] Bout insert error for ${bracket.weightClass}:`, boutErr);
          } else {
            boutsImported += batch.length;
          }
        }
      }

      // Insert placements
      if (bracket.placements.length > 0) {
        const placementRows = bracket.placements.map((p) => ({
          bracket_id: bracketRow.id,
          place: p.place,
          wrestler_name: p.name,
          team_name: p.teamName,
          flo_participant_id: p.participantId,
        }));

        const { error: placeErr } = await supabase.from('event_placements').insert(placementRows);
        if (placeErr) {
          console.error(`[Sync] Placement insert error for ${bracket.weightClass}:`, placeErr);
        } else {
          placementsImported += placementRows.length;
        }
      }
    }

    // Update event sync status
    await supabase
      .from('events')
      .update({
        bracket_sync_status: 'synced',
        bracket_synced_at: new Date().toISOString(),
        total_brackets: bracketsImported,
        total_bouts: boutsImported,
      })
      .eq('id', eventId);

    return NextResponse.json({
      success: true,
      bracketsImported,
      boutsImported,
      placementsImported,
      errors: floData.errors,
      eventTitle: floData.event.title,
    });
  } catch (error) {
    console.error('[Sync] Unexpected error:', error);
    return NextResponse.json(
      { error: 'Sync failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { searchTwWrestler, formatForImport } from '../../../../lib/tw-wrestlers';

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { lastName, firstName, teamName, state, wrestlerProfileId } = body;

    if (!lastName) {
      return NextResponse.json({ error: 'lastName is required' }, { status: 400 });
    }

    // Search TrackWrestling
    const wrestlers = await searchTwWrestler(lastName, firstName, teamName, state || 'IL');

    if (wrestlers.length === 0) {
      return NextResponse.json({
        found: 0,
        message: 'No wrestlers found matching the search criteria.',
        imported: 0,
      });
    }

    // Import results to database
    const importRecords = wrestlers.map(w => formatForImport(w, wrestlerProfileId));

    const { data, error } = await supabase
      .from('tw_wrestler_records')
      .upsert(importRecords, {
        onConflict: 'tw_wrestler_id',
      })
      .select('id, name, team, weight_class, wins, losses');

    if (error) {
      console.error('[LevelUp] TW import error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      found: wrestlers.length,
      imported: data?.length || 0,
      records: data || [],
    });

  } catch (err: any) {
    console.error('[LevelUp] TW import error:', err);
    return NextResponse.json({ error: err?.message || 'Import failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const profileId = request.nextUrl.searchParams.get('profileId');

  try {
    let query = supabase
      .from('tw_wrestler_records')
      .select('*')
      .order('last_synced_at', { ascending: false })
      .limit(50);

    if (profileId) {
      query = query.eq('wrestler_profile_id', profileId);
    }

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ records: data || [] });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch records' }, { status: 500 });
  }
}

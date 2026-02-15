import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { parseMatBossCSV, parseMatBossJSON, formatForImport } from '../../../../lib/matboss';

export async function POST(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { data: importData, format, wrestlerProfileId } = body;

    if (!importData) {
      return NextResponse.json({ error: 'data is required (CSV string or JSON)' }, { status: 400 });
    }

    if (!wrestlerProfileId) {
      return NextResponse.json({ error: 'wrestlerProfileId is required' }, { status: 400 });
    }

    // Parse based on format
    const parseResult = format === 'json'
      ? parseMatBossJSON(typeof importData === 'string' ? importData : JSON.stringify(importData))
      : parseMatBossCSV(importData);

    if (parseResult.records.length === 0) {
      return NextResponse.json({
        success: false,
        imported: 0,
        skipped: parseResult.skipped,
        errors: parseResult.errors,
        message: 'No valid match records found in the import data.',
      });
    }

    // Format for database insertion
    const dbRecords = parseResult.records.map(r => formatForImport(r, wrestlerProfileId));

    // Insert in batches of 50
    let totalInserted = 0;
    const insertErrors: string[] = [];

    for (let i = 0; i < dbRecords.length; i += 50) {
      const batch = dbRecords.slice(i, i + 50);
      const { data, error } = await supabase
        .from('matboss_imports')
        .insert(batch)
        .select('id');

      if (error) {
        insertErrors.push(`Batch ${Math.floor(i / 50) + 1}: ${error.message}`);
      } else {
        totalInserted += data?.length || 0;
      }
    }

    return NextResponse.json({
      success: insertErrors.length === 0,
      imported: totalInserted,
      parsed: parseResult.records.length,
      skipped: parseResult.skipped,
      parseErrors: parseResult.errors,
      insertErrors,
      summary: {
        wins: parseResult.records.filter(r => r.result === 'win').length,
        losses: parseResult.records.filter(r => r.result === 'loss').length,
        pins: parseResult.records.filter(r => r.resultType === 'pin').length,
      },
    });

  } catch (err: any) {
    console.error('[LevelUp] MatBoss import error:', err);
    return NextResponse.json({ error: err?.message || 'Import failed' }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  const profileId = request.nextUrl.searchParams.get('profileId');
  if (!profileId) {
    return NextResponse.json({ error: 'profileId query param required' }, { status: 400 });
  }

  try {
    const { data, error } = await supabase
      .from('matboss_imports')
      .select('*')
      .eq('wrestler_profile_id', profileId)
      .order('match_date', { ascending: false })
      .limit(100);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Compute summary stats
    const records = data || [];
    const wins = records.filter((r: any) => r.result === 'win').length;
    const losses = records.filter((r: any) => r.result === 'loss').length;
    const pins = records.filter((r: any) => r.result_type === 'pin' && r.result === 'win').length;

    return NextResponse.json({
      records,
      totalRecords: records.length,
      summary: { wins, losses, pins, winPercentage: records.length > 0 ? Math.round((wins / records.length) * 100) : 0 },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Failed to fetch records' }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const url = request.nextUrl;
  const limit = parseInt(url.searchParams.get('limit') || '50', 10);
  const lowConfidenceOnly = url.searchParams.get('low_confidence') === 'true';

  let query = supabase
    .from('match_analyses')
    .select('id, created_at, overall_score, standing, top, bottom, confidence, identity_confidence, quality_flags, hallucination_warnings, pipeline_version, reviewed_by, reviewed_at, match_style, job_status, error_message')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (lowConfidenceOnly) {
    query = query.lt('identity_confidence', 0.5);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ analyses: data || [] });
}

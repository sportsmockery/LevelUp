import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { supabaseServer } from '../../../../lib/supabase-server';

export async function GET(request: NextRequest) {
  const jobId = request.nextUrl.searchParams.get('jobId');

  if (!jobId) {
    return NextResponse.json({ error: 'Missing jobId parameter' }, { status: 400 });
  }

  const db = supabaseServer || supabase;
  if (!db) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 503 });
  }

  try {
    const { data, error } = await db
      .from('match_analyses')
      .select('job_status, analysis_json, error_message')
      .eq('id', jobId)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (data.job_status === 'complete') {
      return NextResponse.json({
        status: 'complete',
        result: data.analysis_json,
      });
    }

    if (data.job_status === 'failed') {
      return NextResponse.json({
        status: 'failed',
        error: data.error_message || 'Analysis failed',
      });
    }

    return NextResponse.json({ status: 'processing' });
  } catch (err: any) {
    console.error('[LevelUp] Status check error:', err);
    return NextResponse.json({ error: err.message || 'Status check failed' }, { status: 500 });
  }
}

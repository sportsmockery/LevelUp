import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const { data: candidates, error } = await supabase
      .from('candidate_events')
      .select('*')
      .eq('status', 'pending')
      .order('start_date', { ascending: true });

    if (error) {
      return NextResponse.json({ error: 'Failed to fetch candidates' }, { status: 500 });
    }

    return NextResponse.json({ candidates: candidates || [] });
  } catch (error) {
    console.error('[Admin Candidates] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

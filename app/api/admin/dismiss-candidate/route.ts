import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { candidateId } = body;

    if (!candidateId) {
      return NextResponse.json({ error: 'candidateId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('candidate_events')
      .update({ status: 'dismissed' })
      .eq('id', candidateId);

    if (error) {
      return NextResponse.json({ error: 'Failed to dismiss candidate' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Dismiss] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

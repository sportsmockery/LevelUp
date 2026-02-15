import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function POST(request: Request) {
  if (!supabase) {
    return NextResponse.json({ error: 'Database not configured' }, { status: 503 });
  }

  try {
    const body = await request.json();
    const { eventId, ...fields } = body;

    if (!eventId) {
      return NextResponse.json({ error: 'eventId is required' }, { status: 400 });
    }

    const { error } = await supabase
      .from('events')
      .update(fields)
      .eq('id', eventId);

    if (error) {
      console.error('[Update Event] Error:', error);
      return NextResponse.json({ error: 'Failed to update event', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[Update Event] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

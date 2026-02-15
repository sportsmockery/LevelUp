import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../../lib/supabase';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  if (!supabase) {
    return NextResponse.json({ error: 'Supabase not configured' }, { status: 500 });
  }

  const { id } = await params;
  const body = await request.json();
  const { reviewed_by, corrected_json } = body;

  if (!reviewed_by) {
    return NextResponse.json({ error: 'reviewed_by is required' }, { status: 400 });
  }

  const { error } = await supabase
    .from('match_analyses')
    .update({
      reviewed_by,
      reviewed_at: new Date().toISOString(),
      ...(corrected_json ? { corrected_json } : {}),
    })
    .eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}

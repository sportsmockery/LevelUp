import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 30;

const PYTHON_SERVICE_URL = process.env.HS_DETECTION_URL || 'http://localhost:8100';

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_SERVICE_URL}/loop/status`);
    if (!response.ok) {
      return NextResponse.json({ error: 'Loop service unavailable' }, { status: 502 });
    }
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const action = body.action || 'start';
    const endpoint = action === 'stop' ? 'loop/stop' : 'loop/start';

    const response = await fetch(`${PYTHON_SERVICE_URL}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body.config || {}),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json({ error: errorText }, { status: 502 });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

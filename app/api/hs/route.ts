import { NextRequest, NextResponse } from 'next/server';

export const maxDuration = 120;

const PYTHON_SERVICE_URL = process.env.HS_DETECTION_URL || 'http://localhost:8100';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const confidence = formData.get('confidence') || '0.25';
    const mode = formData.get('mode') || 'detect'; // 'detect' or 'segment'

    if (!file) {
      return NextResponse.json(
        { error: 'No image file provided' },
        { status: 400 }
      );
    }

    const endpointMap: Record<string, string> = {
      detect: 'detect',
      segment: 'segment',
      'broken-contacts': 'broken-contacts',
      enhance: 'enhance',
      'sam-factory': 'sam-factory',
    };
    const endpoint = endpointMap[mode as string] || 'detect';

    // Forward to Python detection service
    const pyFormData = new FormData();
    pyFormData.append('file', file);

    const response = await fetch(
      `${PYTHON_SERVICE_URL}/${endpoint}?confidence=${confidence}`,
      {
        method: 'POST',
        body: pyFormData,
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Detection service error:', errorText);
      return NextResponse.json(
        { error: 'Detection service failed', details: errorText },
        { status: 502 }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('HS API error:', message);
    return NextResponse.json(
      { error: 'Request failed', details: message },
      { status: 500 }
    );
  }
}

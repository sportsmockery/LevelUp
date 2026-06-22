import { NextRequest, NextResponse } from 'next/server';
import { specToDxf } from '@/lib/sunvista/dxf';
import { SitePlanSpec } from '@/lib/sunvista/schemas';

export const maxDuration = 15;

// Convert a site-plan spec into a downloadable AutoCAD .dxf file.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const plan = body.plan as SitePlanSpec | undefined;

    if (!plan || !Array.isArray(plan.zones)) {
      return NextResponse.json({ error: 'Provide plan with zones' }, { status: 400 });
    }

    const dxf = specToDxf(plan);
    const fileName = (plan.title || 'sunvista-plan').replace(/[^a-z0-9]+/gi, '_').toLowerCase() + '.dxf';

    return new NextResponse(dxf, {
      headers: {
        'Content-Type': 'application/dxf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'DXF export failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

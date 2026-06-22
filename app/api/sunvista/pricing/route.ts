import { NextRequest, NextResponse } from 'next/server';
import { priceEstimate } from '@/lib/sunvista/pricing';
import { Estimate } from '@/lib/sunvista/schemas';

export const maxDuration = 15;

// Price the estimate's material/equipment lines across simulated suppliers.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const estimate = body.estimate as Estimate | undefined;

    if (!estimate || !Array.isArray(estimate.lineItems)) {
      return NextResponse.json({ error: 'Provide estimate with lineItems' }, { status: 400 });
    }

    const pricing = priceEstimate(estimate);
    return NextResponse.json({ pricing });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Pricing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { runJsonCompletion } from '@/lib/sunvista/ai';
import { ESTIMATE_PROMPT } from '@/lib/sunvista/prompts';
import { fallbackEstimate } from '@/lib/sunvista/fallbacks';
import { Estimate, ParsedIntake } from '@/lib/sunvista/schemas';

export const maxDuration = 45;

// Turn a structured scope into a preliminary line-item estimate.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const intake = body.intake as ParsedIntake | undefined;

    if (!intake) {
      return NextResponse.json({ error: 'Provide intake' }, { status: 400 });
    }

    const userContent = `Property: ${intake.propertyAddress} (${intake.propertyType})
Square feet: ${intake.squareFeet || 'unknown'}
Trades: ${intake.trades.join(', ')}
Urgency: ${intake.urgency}
Scope: ${intake.scopeSummary}
Requirements:\n- ${intake.keyRequirements.join('\n- ')}`;

    const ai = await runJsonCompletion(ESTIMATE_PROMPT, userContent);

    let estimate: Estimate;
    if (ai && Array.isArray((ai as Record<string, unknown>).lineItems)) {
      estimate = ai as unknown as Estimate;
    } else {
      estimate = fallbackEstimate(intake);
    }

    return NextResponse.json({ estimate, source: ai ? 'ai' : 'fallback' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Estimate generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

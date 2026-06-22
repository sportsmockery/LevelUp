import { NextRequest, NextResponse } from 'next/server';
import { runJsonCompletion } from '@/lib/sunvista/ai';
import { DESIGN_PROMPT } from '@/lib/sunvista/prompts';
import { fallbackPlan } from '@/lib/sunvista/fallbacks';
import { ParsedIntake, SitePlanSpec } from '@/lib/sunvista/schemas';

export const maxDuration = 45;

// Generate a schematic 2D site/floor plan spec from the scope.
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
Scope: ${intake.scopeSummary}
Requirements:\n- ${intake.keyRequirements.join('\n- ')}`;

    const ai = await runJsonCompletion(DESIGN_PROMPT, userContent);

    let plan: SitePlanSpec;
    if (ai && Array.isArray((ai as Record<string, unknown>).zones)) {
      plan = ai as unknown as SitePlanSpec;
    } else {
      plan = fallbackPlan(intake);
    }

    return NextResponse.json({ plan, source: ai ? 'ai' : 'fallback' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Plan generation failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from 'next/server';
import { runJsonCompletion } from '@/lib/sunvista/ai';
import { INTAKE_PROMPT } from '@/lib/sunvista/prompts';
import { fallbackIntake } from '@/lib/sunvista/fallbacks';
import { getEmailById } from '@/lib/sunvista/mock/emails';
import { IntakeEmail, ParsedIntake } from '@/lib/sunvista/schemas';

export const maxDuration = 30;

// Parse an inbound email/proposal into a structured work request.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let email: IntakeEmail | undefined;

    if (body.emailId) email = getEmailById(body.emailId);
    if (!email && body.email) email = body.email as IntakeEmail;

    if (!email) {
      return NextResponse.json({ error: 'Provide emailId or email' }, { status: 400 });
    }

    const userContent = `From: ${email.fromName} <${email.from}>\nSubject: ${email.subject}\n\n${email.body}`;
    const ai = await runJsonCompletion(INTAKE_PROMPT, userContent);

    const intake: ParsedIntake = ai
      ? { ...fallbackIntake(email), ...(ai as Partial<ParsedIntake>) }
      : fallbackIntake(email);

    return NextResponse.json({ intake, source: ai ? 'ai' : 'fallback' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Intake processing failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

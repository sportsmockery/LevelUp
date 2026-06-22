// Shared OpenAI JSON helper for SunVista BuildAI routes. Returns parsed JSON,
// or null if the API key is missing or the call fails — callers then use the
// deterministic fixtures in fallbacks.ts so the demo never breaks.
import OpenAI from 'openai';

export async function runJsonCompletion(
  systemPrompt: string,
  userContent: string
): Promise<Record<string, unknown> | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const openai = new OpenAI({ apiKey });
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      temperature: 0.2,
      seed: 42,
      max_tokens: 2000,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      response_format: { type: 'json_object' },
    });
    const raw = response.choices[0]?.message?.content;
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (err) {
    console.error('[sunvista/ai] completion failed, using fallback:', err);
    return null;
  }
}

import { AnalysisResult, MatchStyle, AnalysisMode, MatchContext, AthleteIdentification, WrestlerIdentificationResult } from './types';

// Points to our Vercel API for AI analysis
export const API_BASE = process.env.EXPO_PUBLIC_API_URL || 'https://levelup-chris-burhans-projects.vercel.app';

// Identify wrestlers in a frame via GPT-4o
export async function identifyWrestler(frame: string): Promise<WrestlerIdentificationResult> {
  console.log(`[LevelUp] Sending frame for wrestler identification (${Math.round(frame.length / 1024)}KB)`);

  const response = await fetch(`${API_BASE}/api/identify-wrestler`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frame }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Wrestler identification failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Synchronous analysis — waits for full result
export async function analyzeFrames(
  frames: string[],
  matchStyle: MatchStyle = 'folkstyle',
  mode: AnalysisMode = 'athlete',
  matchContext?: MatchContext,
  athleteIdentification?: AthleteIdentification,
  opponentIdentification?: AthleteIdentification,
  idFrameBase64?: string,
): Promise<AnalysisResult> {
  console.log(`[LevelUp] Sending ${frames.length} frames to API (style: ${matchStyle}, mode: ${mode}, id: ${athleteIdentification ? 'yes' : 'none'}, context: ${matchContext ? 'yes' : 'none'})`);

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames, matchStyle, mode, matchContext, athleteIdentification, opponentIdentification, idFrameBase64 }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    console.error(`[LevelUp] API error ${response.status}: ${errorText}`);
    throw new Error(`Analysis failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  console.log(`[LevelUp] API response: model=${data.model}, score=${data.overall_score}, frames=${data.framesAnalyzed}, finish=${data.finish_reason || 'n/a'}`);

  if (data.error) {
    console.error(`[LevelUp] API returned error: ${data.error}`);
    throw new Error(data.error);
  }

  return data;
}

// Async analysis — returns jobId immediately, analysis runs in background
export async function submitAnalysis(
  frames: string[],
  matchStyle: MatchStyle = 'folkstyle',
  mode: AnalysisMode = 'athlete',
  matchContext?: MatchContext,
  athleteIdentification?: AthleteIdentification,
  opponentIdentification?: AthleteIdentification,
  idFrameBase64?: string,
): Promise<{ jobId: string }> {
  console.log(`[LevelUp] Submitting async analysis: ${frames.length} frames`);

  const response = await fetch(`${API_BASE}/api/analyze?async=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames, matchStyle, mode, matchContext, athleteIdentification, opponentIdentification, idFrameBase64 }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Submit failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (!data.jobId) throw new Error('No jobId returned from async submit');
  return { jobId: data.jobId };
}

// Poll for async analysis completion
export async function checkAnalysisStatus(jobId: string): Promise<{
  status: 'processing' | 'complete' | 'failed';
  result?: AnalysisResult;
  error?: string;
}> {
  const response = await fetch(`${API_BASE}/api/analyze/status?jobId=${encodeURIComponent(jobId)}`);
  if (!response.ok) {
    throw new Error(`Status check failed (${response.status})`);
  }
  return response.json();
}

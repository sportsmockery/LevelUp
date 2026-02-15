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
  athletePosition?: 'left' | 'right',
): Promise<AnalysisResult> {
  console.log(`[LevelUp] Sending ${frames.length} frames to API (style: ${matchStyle}, mode: ${mode}, id: ${athleteIdentification ? 'yes' : 'none'}, position: ${athletePosition || 'none'}, context: ${matchContext ? 'yes' : 'none'})`);

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames, matchStyle, mode, matchContext, athleteIdentification, opponentIdentification, idFrameBase64, athletePosition }),
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
  athletePosition?: 'left' | 'right',
): Promise<{ jobId: string }> {
  console.log(`[LevelUp] Submitting async analysis: ${frames.length} frames (position: ${athletePosition || 'none'})`);

  const response = await fetch(`${API_BASE}/api/analyze?async=true`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frames, matchStyle, mode, matchContext, athleteIdentification, opponentIdentification, idFrameBase64, athletePosition }),
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

// Quick tournament analysis — 30-second turnaround with 8 frames
export type AnalysisSpeed = 'full' | 'quick';

export async function analyzeQuick(
  frames: string[],
  matchStyle: MatchStyle = 'folkstyle',
  athletePosition?: 'left' | 'right',
  athleteIdentification?: AthleteIdentification,
  idFrameBase64?: string,
): Promise<AnalysisResult> {
  console.log(`[LevelUp] Quick analysis: ${frames.length} frames (tournament mode)`);

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      frames,
      matchStyle,
      mode: 'athlete',
      speed: 'quick',
      athleteIdentification,
      idFrameBase64,
      athletePosition,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Quick analysis failed (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  if (data.error) throw new Error(data.error);
  return data;
}

// Progressive analysis — submit frames in chunks, get rolling scores
export type ProgressiveScores = {
  overall: number;
  standing: number;
  top: number;
  bottom: number;
};

export type ProgressiveResult = {
  sessionId: string;
  chunkIndex: number;
  framesProcessed: number;
  currentScores: ProgressiveScores;
  chunkScores: ProgressiveScores;
  status: 'active' | 'complete';
  finalAnalysisId?: string;
};

export async function submitProgressiveChunk(
  frames: string[],
  sessionId?: string,
  matchStyle: MatchStyle = 'folkstyle',
  athletePosition?: 'left' | 'right',
  isLastChunk: boolean = false,
): Promise<ProgressiveResult> {
  console.log(`[LevelUp] Progressive chunk: ${frames.length} frames (session: ${sessionId || 'new'}, last: ${isLastChunk})`);

  const response = await fetch(`${API_BASE}/api/analyze/progressive`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sessionId, frames, matchStyle, athletePosition, isLastChunk }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Progressive analysis failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

export async function checkProgressiveSession(sessionId: string): Promise<{
  sessionId: string;
  status: string;
  framesReceived: number;
  framesProcessed: number;
  chunksCompleted: number;
  currentScores: ProgressiveScores;
  finalAnalysisId?: string;
}> {
  const response = await fetch(`${API_BASE}/api/analyze/progressive?sessionId=${encodeURIComponent(sessionId)}`);
  if (!response.ok) throw new Error(`Session check failed (${response.status})`);
  return response.json();
}

// Share analysis — create public shareable link
export async function shareAnalysis(
  analysisId: string,
  options?: {
    sharedBy?: string;
    visibility?: 'public' | 'team' | 'unlisted';
    includeSubScores?: boolean;
    includeDrills?: boolean;
    expiresInDays?: number;
  },
): Promise<{ shareToken: string; shareUrl: string }> {
  const response = await fetch(`${API_BASE}/api/share`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      analysisId,
      sharedBy: options?.sharedBy,
      visibility: options?.visibility || 'public',
      includeSubScores: options?.includeSubScores ?? true,
      includeDrills: options?.includeDrills ?? true,
      expiresInDays: options?.expiresInDays,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error');
    throw new Error(`Share failed (${response.status}): ${errorText}`);
  }

  return response.json();
}

// Club leaderboard
export type LeaderboardEntry = {
  athleteId: string;
  athleteName: string;
  rank: number;
  value: number;
  analysisCount: number;
  trend: 'up' | 'down' | 'stable';
  recentDelta: number;
};

export async function getClubLeaderboard(
  clubId: string,
  type: 'overall' | 'standing' | 'top' | 'bottom' | 'improvement' | 'consistency' = 'overall',
  limit: number = 20,
): Promise<{ rankings: LeaderboardEntry[] }> {
  const response = await fetch(
    `${API_BASE}/api/club/leaderboard?clubId=${encodeURIComponent(clubId)}&type=${type}&limit=${limit}`,
  );
  if (!response.ok) throw new Error(`Leaderboard fetch failed (${response.status})`);
  return response.json();
}

// Activity feed
export type ActivityEntry = {
  id: string;
  athleteId: string;
  athleteName: string;
  eventType: string;
  title: string;
  subtitle?: string;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export async function getClubActivity(
  clubId: string,
  limit: number = 30,
  offset: number = 0,
): Promise<{ activities: ActivityEntry[] }> {
  const response = await fetch(
    `${API_BASE}/api/club/activity?clubId=${encodeURIComponent(clubId)}&limit=${limit}&offset=${offset}`,
  );
  if (!response.ok) throw new Error(`Activity fetch failed (${response.status})`);
  return response.json();
}

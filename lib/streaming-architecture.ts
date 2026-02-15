// Live Streaming Analysis Architecture — Feature 8, Phase 3 (Roadmap)
//
// This file documents the planned architecture for real-time wrestling match
// analysis via live video streaming. This is a FUTURE feature — the types
// and interfaces defined here serve as a design document and contract for
// when this feature is implemented.
//
// Architecture Overview:
// 1. Mobile app captures video frames in real-time during a match
// 2. Frames are sent to the server via WebSocket connection
// 3. Server processes frames in sliding windows (every 3-5 seconds)
// 4. Progressive results are pushed back to the client as they're computed
// 5. At match end, a final comprehensive analysis is generated
//
// Key Challenges:
// - GPT-4o latency (~2-5s per call) limits real-time scoring
// - Need to batch frames intelligently during fast action
// - Must handle network interruptions gracefully
// - Progressive results must be coherent even mid-match
//
// Estimated Timeline: Post-MVP, requires WebSocket infrastructure

// ===== Stream Event Types =====

/** Client-to-server: frame submission */
export type StreamFrameEvent = {
  type: 'frame';
  sessionId: string;
  frameIndex: number;
  timestamp: number; // ms since match start
  base64: string;
  metadata?: {
    matchPhase?: 'warmup' | 'period1' | 'period2' | 'period3' | 'overtime';
    isScoring?: boolean; // Client-side hint if scoring action detected
  };
};

/** Client-to-server: match control events */
export type StreamControlEvent = {
  type: 'control';
  sessionId: string;
  action: 'start' | 'pause' | 'resume' | 'end' | 'period_break';
  timestamp: number;
};

/** Server-to-client: progressive analysis update */
export type StreamAnalysisUpdate = {
  type: 'analysis_update';
  sessionId: string;
  windowIndex: number;
  timestamp: number;
  update: {
    currentScore: {
      overall: number;
      standing: number;
      top: number;
      bottom: number;
    };
    recentAction?: string;
    recentPosition?: 'standing' | 'top' | 'bottom' | 'transition';
    confidence: number;
    keyMoment?: {
      frameIndex: number;
      type: 'takedown' | 'escape' | 'reversal' | 'near_fall' | 'pin';
      description: string;
    };
  };
};

/** Server-to-client: final match analysis */
export type StreamFinalAnalysis = {
  type: 'final_analysis';
  sessionId: string;
  analysisId: string; // ID in match_analyses table
  redirectUrl: string; // URL to full analysis page
};

/** Server-to-client: status/error events */
export type StreamStatusEvent = {
  type: 'status';
  sessionId: string;
  status: 'connected' | 'processing' | 'buffering' | 'error' | 'complete';
  message?: string;
};

// Union type for all server-to-client events
export type ServerStreamEvent = StreamAnalysisUpdate | StreamFinalAnalysis | StreamStatusEvent;

// Union type for all client-to-server events
export type ClientStreamEvent = StreamFrameEvent | StreamControlEvent;

// ===== Session Management =====

/** Live analysis session state */
export type StreamSession = {
  id: string;
  athleteId: string;
  matchStyle: string;
  startedAt: number;
  status: 'active' | 'paused' | 'ended';
  frameBuffer: StreamFrameEvent[];
  processedWindows: number;
  progressiveScores: Array<{
    windowIndex: number;
    timestamp: number;
    score: { overall: number; standing: number; top: number; bottom: number };
  }>;
  athleteIdentification?: {
    uniform_description: string;
    distinguishing_features: string;
  };
};

// ===== Processing Pipeline =====

/** Configuration for the streaming analysis pipeline */
export type StreamPipelineConfig = {
  /** How often to process a window of frames (ms). Default: 5000 */
  windowIntervalMs: number;
  /** Number of frames per processing window. Default: 3 */
  framesPerWindow: number;
  /** Overlap with previous window (frames). Default: 1 */
  windowOverlap: number;
  /** Use quick analysis mode for windows. Default: true */
  useQuickMode: boolean;
  /** Maximum concurrent processing windows. Default: 2 */
  maxConcurrentWindows: number;
  /** Minimum confidence to include in progressive score. Default: 0.5 */
  minConfidenceThreshold: number;
};

export const DEFAULT_STREAM_CONFIG: StreamPipelineConfig = {
  windowIntervalMs: 5000,
  framesPerWindow: 3,
  windowOverlap: 1,
  useQuickMode: true,
  maxConcurrentWindows: 2,
  minConfidenceThreshold: 0.5,
};

// ===== Implementation Notes =====
//
// Phase 3 Implementation Plan (when ready):
//
// 1. WebSocket Server
//    - Use Vercel's Edge Functions or a dedicated WebSocket server (e.g., Socket.io)
//    - Handle connection lifecycle, authentication, session management
//    - Rate limit: max 5 frames/second per session
//
// 2. Frame Buffer
//    - Circular buffer of last 30 seconds of frames
//    - Smart frame selection within each processing window
//    - Drop frames if processing falls behind
//
// 3. Progressive Scoring
//    - Use quick analysis mode for each window
//    - Maintain rolling average of position scores
//    - Weight recent windows more heavily
//    - Emit score updates every 5 seconds
//
// 4. Key Moment Detection
//    - Run lightweight classifier on each frame
//    - If scoring action detected, trigger immediate window processing
//    - Buffer key moment frames for final analysis
//
// 5. Final Analysis
//    - At match end, run full analysis on selected key frames
//    - Combine progressive scores with final analysis
//    - Save to database as standard match_analysis
//
// 6. Mobile Client
//    - WebSocket connection with auto-reconnect
//    - Display progressive score overlay on video
//    - Haptic feedback on key moments
//    - Queue frames during disconnection
//
// 7. Infrastructure Requirements
//    - WebSocket-capable hosting (not standard Vercel serverless)
//    - Options: Vercel Edge + Durable Objects, AWS WebSocket API, Socket.io server
//    - Redis for session state (shared across instances)
//    - Estimated cost: ~$0.05-0.10 per live match (API calls)

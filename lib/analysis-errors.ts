// Structured error types for the analysis pipeline.
// Every failure returns a typed error — never mock/fallback data.

export type AnalysisErrorCode =
  | 'NO_FRAMES'
  | 'ANALYSIS_TIMEOUT'
  | 'INVALID_API_KEY'
  | 'PASS1_FAILED'
  | 'PASS2_FAILED'
  | 'IDENTITY_LOW'
  | 'ANALYSIS_ERROR';

export type StructuredAnalysisError = {
  status: 'analysis_failed';
  code: AnalysisErrorCode;
  error: string;
  userMessage: string;
  canRetry: boolean;
  reasons?: string[];
};

const ERROR_MESSAGES: Record<AnalysisErrorCode, { userMessage: string; canRetry: boolean }> = {
  NO_FRAMES: {
    userMessage: 'No video frames were provided. Please select a video and try again.',
    canRetry: false,
  },
  ANALYSIS_TIMEOUT: {
    userMessage: 'Analysis took too long. Try a shorter video clip (under 7 minutes) for best results.',
    canRetry: true,
  },
  INVALID_API_KEY: {
    userMessage: 'LevelUp is temporarily unable to analyze videos. Our team has been notified.',
    canRetry: false,
  },
  PASS1_FAILED: {
    userMessage: 'LevelUp could not observe the video frames clearly. Please try a video with better lighting and a clearer angle.',
    canRetry: true,
  },
  PASS2_FAILED: {
    userMessage: 'LevelUp could not complete the scoring analysis. Please try again.',
    canRetry: true,
  },
  IDENTITY_LOW: {
    userMessage: "We're not confident which wrestler is yours in this video. Please upload a clearer angle or re-select your wrestler from the first frame.",
    canRetry: true,
  },
  ANALYSIS_ERROR: {
    userMessage: 'LevelUp was unable to analyze this video. Please try again or upload a different video.',
    canRetry: true,
  },
};

export function buildAnalysisError(
  code: AnalysisErrorCode,
  detail?: string,
  reasons?: string[],
): StructuredAnalysisError {
  const template = ERROR_MESSAGES[code];
  return {
    status: 'analysis_failed',
    code,
    error: detail || code,
    userMessage: template.userMessage,
    canRetry: template.canRetry,
    ...(reasons && reasons.length > 0 ? { reasons } : {}),
  };
}

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisHistoryEntry, AnalysisResult } from './types';

const HISTORY_KEY = '@levelup/analysis_history';
const SUMMARY_KEY = '@levelup/analysis_summaries';
const MAX_ENTRIES = 50;

// Slim summary stored in AsyncStorage (~500 bytes per entry)
export type AnalysisSummary = {
  id: string;
  createdAt: string;
  thumbnailUri: string;
  videoFileName: string;
  videoDurationSeconds: number;
  overallScore: number;
  standing: number;
  top: number;
  bottom: number;
  matchResult?: string;
  resultType?: string;
  matchStyle?: string;
  strengths: string[];
  weaknesses: string[];
};

function toSummary(entry: AnalysisHistoryEntry): AnalysisSummary {
  return {
    id: entry.id,
    createdAt: entry.createdAt,
    thumbnailUri: entry.thumbnailUri,
    videoFileName: entry.videoFileName,
    videoDurationSeconds: entry.videoDurationSeconds,
    overallScore: entry.result.overall_score,
    standing: entry.result.position_scores.standing,
    top: entry.result.position_scores.top,
    bottom: entry.result.position_scores.bottom,
    matchResult: entry.result.match_result?.result,
    resultType: entry.result.match_result?.result_type,
    strengths: entry.result.strengths.slice(0, 3),
    weaknesses: entry.result.weaknesses.slice(0, 3),
  };
}

// --- Full history (legacy, still used for detail views & VideoReviewOverlay) ---
export async function getAnalysisHistory(): Promise<AnalysisHistoryEntry[]> {
  const raw = await AsyncStorage.getItem(HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AnalysisHistoryEntry[];
  } catch {
    return [];
  }
}

export async function addAnalysisEntry(entry: AnalysisHistoryEntry): Promise<void> {
  // Save full entry (for detail views, video review overlay, etc.)
  const history = await getAnalysisHistory();
  const updated = [entry, ...history].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

  // Also save slim summary for profile stats
  const summaries = await getAnalysisSummaries();
  const updatedSummaries = [toSummary(entry), ...summaries].slice(0, MAX_ENTRIES);
  await AsyncStorage.setItem(SUMMARY_KEY, JSON.stringify(updatedSummaries));
}

export async function deleteAnalysisEntry(id: string): Promise<void> {
  const history = await getAnalysisHistory();
  const updated = history.filter((e) => e.id !== id);
  await AsyncStorage.setItem(HISTORY_KEY, JSON.stringify(updated));

  const summaries = await getAnalysisSummaries();
  const updatedSummaries = summaries.filter((s) => s.id !== id);
  await AsyncStorage.setItem(SUMMARY_KEY, JSON.stringify(updatedSummaries));
}

// --- Slim summaries for profile stats ---
export async function getAnalysisSummaries(): Promise<AnalysisSummary[]> {
  const raw = await AsyncStorage.getItem(SUMMARY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as AnalysisSummary[];
  } catch {
    return [];
  }
}

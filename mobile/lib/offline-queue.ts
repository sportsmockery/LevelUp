import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Network from 'expo-network';
import { MatchStyle, AnalysisMode, MatchContext } from './types';

const QUEUE_KEY = '@levelup/analysis_queue';

export type QueuedAnalysis = {
  id: string;
  createdAt: string;
  frames: string[];
  singletColor: string;
  referencePhoto?: string;
  matchStyle: MatchStyle;
  mode: AnalysisMode;
  matchContext?: MatchContext;
  videoFileName: string;
  videoDurationSeconds: number;
  singletColors: string[];
  thumbnailUri: string;
  frameUris: string[];
  frameTimestamps: number[];
  videoUri?: string;
};

export async function isOnline(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.isConnected === true && state.isInternetReachable !== false;
  } catch {
    return false;
  }
}

export async function isWiFi(): Promise<boolean> {
  try {
    const state = await Network.getNetworkStateAsync();
    return state.type === Network.NetworkStateType.WIFI;
  } catch {
    return true; // Allow on error
  }
}

export async function getQueue(): Promise<QueuedAnalysis[]> {
  const stored = await AsyncStorage.getItem(QUEUE_KEY);
  if (!stored) return [];
  return JSON.parse(stored);
}

export async function addToQueue(item: QueuedAnalysis): Promise<void> {
  const queue = await getQueue();
  queue.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

export async function removeFromQueue(id: string): Promise<void> {
  const queue = await getQueue();
  const filtered = queue.filter((q) => q.id !== id);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(filtered));
}

export async function getQueueCount(): Promise<number> {
  const queue = await getQueue();
  return queue.length;
}

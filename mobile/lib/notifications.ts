import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisResult } from './types';

const PENDING_RESULT_KEY = 'levelup_pending_analysis_result';

// Configure notification handler for foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  if (existingStatus === 'granted') return true;

  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function sendAnalysisCompleteNotification(): Promise<void> {
  await Notifications.scheduleNotificationAsync({
    content: {
      title: 'LevelUp Analysis Ready',
      body: 'Your wrestling analysis is ready! Tap to view results.',
      data: { type: 'analysis_complete' },
    },
    trigger: null, // Fire immediately
  });
}

export async function storePendingResult(result: AnalysisResult): Promise<void> {
  await AsyncStorage.setItem(PENDING_RESULT_KEY, JSON.stringify(result));
}

export async function getPendingResult(): Promise<AnalysisResult | null> {
  const stored = await AsyncStorage.getItem(PENDING_RESULT_KEY);
  if (!stored) return null;
  await AsyncStorage.removeItem(PENDING_RESULT_KEY);
  return JSON.parse(stored);
}

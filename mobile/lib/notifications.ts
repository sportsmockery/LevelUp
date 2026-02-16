import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AnalysisResult } from './types';

const PENDING_RESULT_KEY = 'levelup_pending_analysis_result';
const PUSH_TOKEN_KEY = '@levelup/push_token';

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

// --- Expo Push Token ---

export async function registerPushToken(): Promise<string | null> {
  try {
    const granted = await requestNotificationPermissions();
    if (!granted) {
      console.log('[LevelUp] Push notification permissions not granted');
      return null;
    }

    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'default',
        importance: Notifications.AndroidImportance.MAX,
        sound: 'default',
      });
    }

    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId: projectId || undefined,
    });
    const token = tokenData.data;
    console.log(`[LevelUp] Expo push token: ${token}`);

    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    return token;
  } catch (err) {
    console.warn('[LevelUp] Failed to get push token:', err);
    return null;
  }
}

export async function getStoredPushToken(): Promise<string | null> {
  return AsyncStorage.getItem(PUSH_TOKEN_KEY);
}

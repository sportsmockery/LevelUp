import * as Notifications from 'expo-notifications';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { checkAnalysisStatus } from './api';
import { AnalysisResult } from './types';

const PENDING_JOBS_KEY = '@levelup/pending_analysis_jobs';
const POLL_INTERVAL = 5000; // 5 seconds
const MAX_POLLS = 60; // 5 minutes max

// Configure notification handler (call once at app startup)
export function configureNotifications() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// Request notification permissions
export async function requestNotificationPermissions(): Promise<boolean> {
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

// Send a local notification
async function sendLocalNotification(title: string, body: string, data?: Record<string, unknown>) {
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data, sound: 'default' },
    trigger: null, // Send immediately
  });
}

// Save pending job to AsyncStorage
export async function savePendingJob(jobId: string) {
  const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
  const jobs: string[] = raw ? JSON.parse(raw) : [];
  if (!jobs.includes(jobId)) {
    jobs.push(jobId);
    await AsyncStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(jobs));
  }
}

// Remove completed/failed job from AsyncStorage
async function removePendingJob(jobId: string) {
  const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
  const jobs: string[] = raw ? JSON.parse(raw) : [];
  const updated = jobs.filter((j) => j !== jobId);
  await AsyncStorage.setItem(PENDING_JOBS_KEY, JSON.stringify(updated));
}

// Get all pending jobs
export async function getPendingJobs(): Promise<string[]> {
  const raw = await AsyncStorage.getItem(PENDING_JOBS_KEY);
  return raw ? JSON.parse(raw) : [];
}

// Poll for a specific job's completion
// Returns the result when complete, or throws on failure/timeout
export function pollForCompletion(
  jobId: string,
  onStatusUpdate?: (status: string, polls: number) => void,
): Promise<AnalysisResult> {
  return new Promise((resolve, reject) => {
    let polls = 0;

    const poll = async () => {
      polls++;

      if (polls > MAX_POLLS) {
        await removePendingJob(jobId);
        await sendLocalNotification(
          'Analysis Timed Out',
          'Your video analysis took too long. Please try a shorter clip.',
        );
        reject(new Error('Analysis timed out'));
        return;
      }

      try {
        const { status, result, error } = await checkAnalysisStatus(jobId);

        onStatusUpdate?.(status, polls);

        if (status === 'complete' && result) {
          await removePendingJob(jobId);
          await sendLocalNotification(
            'Analysis Complete!',
            `Your match analysis is ready. Overall score: ${result.overall_score}`,
            { jobId },
          );
          resolve(result);
          return;
        }

        if (status === 'failed') {
          await removePendingJob(jobId);
          await sendLocalNotification(
            'Analysis Failed',
            error || 'Something went wrong analyzing your video. Please try again.',
          );
          reject(new Error(error || 'Analysis failed'));
          return;
        }

        // Still processing — poll again
        setTimeout(poll, POLL_INTERVAL);
      } catch (err) {
        // Network error — keep polling with backoff
        setTimeout(poll, POLL_INTERVAL * 2);
      }
    };

    poll();
  });
}

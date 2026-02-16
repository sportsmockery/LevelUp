import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { StatusBar } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-reanimated';
import { configureNotifications } from '@/lib/analysis-poller';
import { registerPushToken } from '@/lib/notifications';
import { AuthProvider, useAuth } from '@/lib/auth';

SplashScreen.preventAutoHideAsync();
configureNotifications();

const LevelUpDark = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: '#0A0A0A',
    card: '#0A0A0A',
    text: '#FFFFFF',
    border: '#27272A',
    primary: '#2563EB',
  },
};

function RootNavigator() {
  const { session, profile, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();
  const [tutorialChecked, setTutorialChecked] = useState(false);
  const [needsTutorial, setNeedsTutorial] = useState(false);

  // Check tutorial flag once on mount
  useEffect(() => {
    AsyncStorage.getItem('hasSeenTutorial')
      .then((val) => {
        setNeedsTutorial(val !== 'true');
      })
      .catch((err) => {
        console.error('[LevelUp] Error checking tutorial flag:', err);
        // On error, skip tutorial to avoid blocking user
        setNeedsTutorial(false);
      })
      .finally(() => {
        setTutorialChecked(true);
      });
  }, []);

  useEffect(() => {
    if (loading || !tutorialChecked) return;

    const inAuth = segments[0] === '(auth)';
    const inParentTabs = segments[0] === '(parent-tabs)';
    const inTabs = segments[0] === '(tabs)';
    const inTutorial = segments[0] === 'onboarding-tutorial';
    const isParent = profile?.role === 'parent';

    if (!session && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuth) {
      // Just authenticated — check if tutorial needed
      if (needsTutorial) {
        setNeedsTutorial(false);
        router.replace('/onboarding-tutorial');
      } else if (isParent) {
        router.replace('/(parent-tabs)');
      } else {
        router.replace('/(tabs)');
      }
    } else if (session && !inAuth && !inTutorial) {
      // Already in app — handle role-based routing
      if (isParent && inTabs) {
        router.replace('/(parent-tabs)');
      } else if (!isParent && inParentTabs) {
        router.replace('/(tabs)');
      }
    }
  }, [session, profile, loading, segments, tutorialChecked, needsTutorial]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(parent-tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="onboarding-tutorial" options={{ headerShown: false, gestureEnabled: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
  });

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
      registerPushToken();
    }
  }, [loaded]);

  if (!loaded) return null;

  return (
    <AuthProvider>
      <ThemeProvider value={LevelUpDark}>
        <StatusBar barStyle="light-content" backgroundColor="#0A0A0A" />
        <RootNavigator />
      </ThemeProvider>
    </AuthProvider>
  );
}

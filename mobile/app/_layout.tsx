import { DarkTheme, ThemeProvider } from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { StatusBar } from 'react-native';
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

  useEffect(() => {
    if (loading) return;

    const inAuth = segments[0] === '(auth)';
    const inParentTabs = segments[0] === '(parent-tabs)';
    const inTabs = segments[0] === '(tabs)';
    const isParent = profile?.role === 'parent';

    if (!session && !inAuth) {
      router.replace('/(auth)/welcome');
    } else if (session && inAuth) {
      if (isParent) {
        router.replace('/(parent-tabs)');
      } else {
        router.replace('/(tabs)');
      }
    } else if (session && isParent && inTabs) {
      // Parent landed on athlete tabs — redirect
      router.replace('/(parent-tabs)');
    } else if (session && !isParent && inParentTabs) {
      // Non-parent landed on parent tabs — redirect
      router.replace('/(tabs)');
    }
  }, [session, profile, loading, segments]);

  return (
    <Stack>
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="(parent-tabs)" options={{ headerShown: false }} />
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

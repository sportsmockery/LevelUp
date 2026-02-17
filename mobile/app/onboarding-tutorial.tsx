import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  useWindowDimensions,
  ViewToken,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';
import { CheckCircle } from 'lucide-react-native';

import PhoneFrame from '@/components/tutorial/PhoneFrame';
import UploadMockup from '@/components/tutorial/UploadMockup';
import ResultsMockup from '@/components/tutorial/ResultsMockup';
import ProgressMockup from '@/components/tutorial/ProgressMockup';

type StepDef = {
  id: string;
};

const STEPS: StepDef[] = [
  { id: 'welcome' },
  { id: 'upload' },
  { id: 'results' },
  { id: 'progress' },
  { id: 'getstarted' },
];

// --- Welcome Step ---
function WelcomeSlide({ isActive }: { isActive: boolean }) {
  const logoScale = useSharedValue(1);
  const titleOpacity = useSharedValue(0);
  const subtitleOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      titleOpacity.value = 0;
      subtitleOpacity.value = 0;
      logoScale.value = 1;

      // Breathing logo
      logoScale.value = withRepeat(
        withSequence(
          withTiming(1.08, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
      );

      // Title and subtitle fade in
      titleOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
      subtitleOpacity.value = withDelay(600, withTiming(1, { duration: 600 }));
    } else {
      logoScale.value = 1;
      titleOpacity.value = 0;
      subtitleOpacity.value = 0;
    }
  }, [isActive, logoScale, titleOpacity, subtitleOpacity]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: logoScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({ opacity: titleOpacity.value }));
  const subtitleStyle = useAnimatedStyle(() => ({ opacity: subtitleOpacity.value }));

  return (
    <View style={welcomeStyles.container}>
      <Animated.View style={[welcomeStyles.logoWrap, logoStyle]}>
        <LinearGradient
          colors={['#2563EB', '#E91E8C']}
          style={welcomeStyles.logoGradient}
        >
          <View style={welcomeStyles.logoInner}>
            <Text style={welcomeStyles.logoText}>LU</Text>
          </View>
        </LinearGradient>
      </Animated.View>
      <Animated.Text style={[welcomeStyles.title, titleStyle]}>
        Welcome to LevelUp
      </Animated.Text>
      <Animated.Text style={[welcomeStyles.subtitle, subtitleStyle]}>
        Let us show you how it works
      </Animated.Text>
    </View>
  );
}

const welcomeStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  logoWrap: {
    marginBottom: 8,
  },
  logoGradient: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoInner: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoText: {
    fontSize: 32,
    fontWeight: '900',
    color: '#fff',
    letterSpacing: -1,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 24,
  },
});

// --- Get Started Step ---
function GetStartedSlide({ isActive }: { isActive: boolean }) {
  const checkScale = useSharedValue(0);
  const checkOpacity = useSharedValue(0);
  const textOpacity = useSharedValue(0);

  useEffect(() => {
    if (isActive) {
      checkScale.value = 0;
      checkOpacity.value = 0;
      textOpacity.value = 0;

      checkOpacity.value = withDelay(200, withTiming(1, { duration: 300 }));
      checkScale.value = withDelay(200, withSpring(1, { damping: 8, stiffness: 120 }));
      textOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
    } else {
      checkScale.value = 0;
      checkOpacity.value = 0;
      textOpacity.value = 0;
    }
  }, [isActive, checkScale, checkOpacity, textOpacity]);

  const checkStyle = useAnimatedStyle(() => ({
    opacity: checkOpacity.value,
    transform: [{ scale: checkScale.value }],
  }));
  const textStyle = useAnimatedStyle(() => ({ opacity: textOpacity.value }));

  return (
    <View style={getStartedStyles.container}>
      <Animated.View style={[getStartedStyles.checkWrap, checkStyle]}>
        <LinearGradient
          colors={['#22C55E', '#10B981']}
          style={getStartedStyles.checkCircle}
        >
          <CheckCircle size={48} color="#fff" />
        </LinearGradient>
      </Animated.View>
      <Animated.Text style={[getStartedStyles.title, textStyle]}>
        You're ready to level up!
      </Animated.Text>
      <Animated.Text style={[getStartedStyles.subtitle, textStyle]}>
        Upload your first match video and get instant AI analysis
      </Animated.Text>
    </View>
  );
}

const getStartedStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 20,
  },
  checkWrap: {
    marginBottom: 8,
  },
  checkCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 16,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 24,
  },
});

// --- Mockup Slide Wrapper ---
function MockupSlide({
  isActive,
  callout,
  children,
}: {
  isActive: boolean;
  callout: string;
  children: React.ReactNode;
}) {
  const calloutOpacity = useSharedValue(0);
  const calloutTranslateY = useSharedValue(10);

  useEffect(() => {
    if (isActive) {
      calloutOpacity.value = withDelay(500, withTiming(1, { duration: 400 }));
      calloutTranslateY.value = withDelay(500, withTiming(0, { duration: 400, easing: Easing.out(Easing.ease) }));
    } else {
      calloutOpacity.value = 0;
      calloutTranslateY.value = 10;
    }
  }, [isActive, calloutOpacity, calloutTranslateY]);

  const calloutStyle = useAnimatedStyle(() => ({
    opacity: calloutOpacity.value,
    transform: [{ translateY: calloutTranslateY.value }],
  }));

  return (
    <View style={mockupStyles.container}>
      <PhoneFrame>{children}</PhoneFrame>
      <Animated.Text style={[mockupStyles.callout, calloutStyle]}>
        {callout}
      </Animated.Text>
    </View>
  );
}

const mockupStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    gap: 20,
  },
  callout: {
    fontSize: 15,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
});

// --- Main Tutorial Screen ---
export default function OnboardingTutorialScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  const completeTutorial = useCallback(async () => {
    try {
      await AsyncStorage.setItem('hasSeenTutorial', 'true');
    } catch (err) {
      console.error('[LevelUp] Error saving tutorial flag:', err);
    }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  }, [router]);

  const handleNext = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (currentIndex < STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentIndex + 1, animated: true });
    } else {
      completeTutorial();
    }
  }, [currentIndex, completeTutorial]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    completeTutorial();
  }, [completeTutorial]);

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index != null) {
        setCurrentIndex(viewableItems[0].index);
      }
    }
  ).current;

  const viewabilityConfig = useRef({ viewAreaCoveragePercentThreshold: 50 }).current;

  const renderItem = ({ item, index }: { item: StepDef; index: number }) => {
    const isActive = index === currentIndex;

    let content: React.ReactNode;
    switch (item.id) {
      case 'welcome':
        content = <WelcomeSlide isActive={isActive} />;
        break;
      case 'upload':
        content = (
          <MockupSlide isActive={isActive} callout="Tap to upload a video, then hit Analyze">
            <UploadMockup isActive={isActive} />
          </MockupSlide>
        );
        break;
      case 'results':
        content = (
          <MockupSlide isActive={isActive} callout="See your scores broken down by position">
            <ResultsMockup isActive={isActive} />
          </MockupSlide>
        );
        break;
      case 'progress':
        content = (
          <MockupSlide isActive={isActive} callout="Watch your scores improve over time">
            <ProgressMockup isActive={isActive} />
          </MockupSlide>
        );
        break;
      case 'getstarted':
        content = <GetStartedSlide isActive={isActive} />;
        break;
      default:
        content = null;
    }

    return <View style={[styles.slide, { width }]}>{content}</View>;
  };

  const isLastStep = currentIndex === STEPS.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      <View style={styles.skipRow}>
        <TouchableOpacity onPress={handleSkip} style={styles.skipBtn}>
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Slides */}
      <FlatList
        ref={flatListRef}
        data={STEPS}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        bounces={false}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        getItemLayout={(_, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Bottom: dots + button */}
      <View style={styles.bottomSection}>
        {/* Progress dots */}
        <View style={styles.dotsRow}>
          {STEPS.map((_, i) => (
            <View
              key={i}
              style={[
                styles.dot,
                i === currentIndex && styles.dotActive,
              ]}
            />
          ))}
        </View>

        {/* Next / Get Started button */}
        <TouchableOpacity onPress={handleNext} activeOpacity={0.85}>
          <LinearGradient
            colors={['#2563EB', '#E91E8C']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nextBtn}
          >
            <Text style={styles.nextBtnText}>
              {isLastStep ? 'Get Started' : 'Next'}
            </Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0A0A',
  },
  skipRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  skipBtn: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  skipText: {
    fontSize: 15,
    color: '#71717A',
    fontWeight: '600',
  },
  slide: {
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 20,
    alignItems: 'center',
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#27272A',
  },
  dotActive: {
    backgroundColor: '#2563EB',
    width: 24,
  },
  nextBtn: {
    paddingVertical: 16,
    paddingHorizontal: 64,
    borderRadius: 20,
    alignItems: 'center',
  },
  nextBtnText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    letterSpacing: 0.5,
  },
});

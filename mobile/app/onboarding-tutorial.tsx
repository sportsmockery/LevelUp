import React, { useRef, useState, useCallback } from 'react';
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
import {
  Upload,
  BarChart3,
  TrendingUp,
  Target,
  CheckCircle,
} from 'lucide-react-native';

type TutorialStep = {
  id: string;
  icon: React.ReactNode;
  iconBg: [string, string];
  title: string;
  description: string;
};

const STEPS: Omit<TutorialStep, 'icon'>[] = [
  {
    id: '1',
    iconBg: ['#2563EB', '#E91E8C'],
    title: 'Welcome to LevelUp Wrestling',
    description:
      'Track your wrestling progress with AI-powered analysis. Upload match videos and get instant, detailed feedback on your technique across all positions.',
  },
  {
    id: '2',
    iconBg: ['#2563EB', '#3B82F6'],
    title: 'Upload Your Matches',
    description:
      'Record or upload match videos for instant analysis. LevelUp supports folkstyle, freestyle, and Greco-Roman — just pick your singlet color and go.',
  },
  {
    id: '3',
    iconBg: ['#22C55E', '#10B981'],
    title: 'Get AI Analysis',
    description:
      'Receive detailed scores and feedback on your technique. LevelUp grades your standing, top, and bottom positions using a comprehensive rubric.',
  },
  {
    id: '4',
    iconBg: ['#E91E8C', '#EC4899'],
    title: 'Track Your Progress',
    description:
      'See your improvement over time with trends and insights. The Progress Dashboard shows score trends, position breakdowns, and recurring areas to work on.',
  },
  {
    id: '5',
    iconBg: ['#EAB308', '#F59E0B'],
    title: 'Improve Your Game',
    description:
      'Get personalized drill recommendations to level up. Every analysis includes targeted drills based on your specific areas for improvement.',
  },
];

const ICON_MAP: Record<string, (color: string, size: number) => React.ReactNode> = {
  '1': (color, size) => <Upload size={size} color={color} />,
  '2': (color, size) => <BarChart3 size={size} color={color} />,
  '3': (color, size) => <TrendingUp size={size} color={color} />,
  '4': (color, size) => <Target size={size} color={color} />,
  '5': (color, size) => <CheckCircle size={size} color={color} />,
};

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
      // Still navigate — don't block user if storage fails
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

  const renderItem = ({ item }: { item: typeof STEPS[number] }) => {
    const iconRenderer = ICON_MAP[item.id];
    return (
      <View style={[styles.slide, { width }]}>
        <View style={styles.slideContent}>
          <LinearGradient
            colors={item.iconBg as [string, string]}
            style={styles.iconCircle}
          >
            <View style={styles.iconInner}>
              {iconRenderer('#fff', 48)}
            </View>
          </LinearGradient>
          <Text style={styles.title}>{item.title}</Text>
          <Text style={styles.description}>{item.description}</Text>
        </View>
      </View>
    );
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    alignItems: 'center',
    paddingHorizontal: 40,
    gap: 24,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconInner: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#0A0A0A',
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
  description: {
    fontSize: 16,
    color: '#A1A1AA',
    textAlign: 'center',
    lineHeight: 24,
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

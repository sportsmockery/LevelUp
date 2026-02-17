import React, { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import { Upload, Camera, Video, Cpu } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import TapIndicator from './TapIndicator';

type Props = {
  isActive: boolean;
};

export default function UploadMockup({ isActive }: Props) {
  const pickersOpacity = useSharedValue(0);
  const libraryGlow = useSharedValue(0);
  const pickersOut = useSharedValue(1);
  const selectedOpacity = useSharedValue(0);
  const selectedTranslateY = useSharedValue(20);
  const analyzeOpacity = useSharedValue(0);
  const analyzeTranslateY = useSharedValue(20);
  const analyzePulse = useSharedValue(1);

  // Use React state for tap indicator booleans (read on JS thread during render)
  const [tapLibrary, setTapLibrary] = useState(false);
  const [tapAnalyze, setTapAnalyze] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    // Clear any pending timers on cleanup or re-run
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];

    if (isActive) {
      // Reset animated values
      pickersOpacity.value = 0;
      libraryGlow.value = 0;
      pickersOut.value = 1;
      selectedOpacity.value = 0;
      selectedTranslateY.value = 20;
      analyzeOpacity.value = 0;
      analyzeTranslateY.value = 20;
      analyzePulse.value = 1;
      setTapLibrary(false);
      setTapAnalyze(false);

      // 1. Pickers fade in
      pickersOpacity.value = withTiming(1, { duration: 500 });

      // 2. Tap indicator on library card (via React state)
      timersRef.current.push(setTimeout(() => setTapLibrary(true), 800));

      // 3. Library card glow
      libraryGlow.value = withDelay(1800, withTiming(1, { duration: 300 }));

      // 4. Pickers + tap fade out
      pickersOut.value = withDelay(2200, withTiming(0, { duration: 300 }));
      timersRef.current.push(setTimeout(() => setTapLibrary(false), 2200));

      // 5. Selected video slides up
      selectedOpacity.value = withDelay(2600, withTiming(1, { duration: 400 }));
      selectedTranslateY.value = withDelay(2600, withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.5)) }));

      // 6. Analyze button slides up
      analyzeOpacity.value = withDelay(3200, withTiming(1, { duration: 400 }));
      analyzeTranslateY.value = withDelay(3200, withTiming(0, { duration: 400, easing: Easing.out(Easing.back(1.5)) }));

      // 7. Tap on analyze (via React state)
      timersRef.current.push(setTimeout(() => setTapAnalyze(true), 3600));

      // 8. Button pulse
      analyzePulse.value = withDelay(
        4200,
        withSequence(
          withTiming(1.05, { duration: 150 }),
          withTiming(1, { duration: 150 }),
        ),
      );
    } else {
      // Reset all to initial
      pickersOpacity.value = withTiming(0, { duration: 200 });
      libraryGlow.value = 0;
      pickersOut.value = 1;
      selectedOpacity.value = 0;
      selectedTranslateY.value = 20;
      analyzeOpacity.value = 0;
      analyzeTranslateY.value = 20;
      analyzePulse.value = 1;
      setTapLibrary(false);
      setTapAnalyze(false);
    }

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const pickersStyle = useAnimatedStyle(() => ({
    opacity: pickersOpacity.value * pickersOut.value,
  }));

  const libraryGlowStyle = useAnimatedStyle(() => ({
    borderColor: libraryGlow.value === 1 ? '#2563EB' : '#27272A',
    shadowOpacity: libraryGlow.value * 0.5,
  }));

  const selectedStyle = useAnimatedStyle(() => ({
    opacity: selectedOpacity.value,
    transform: [{ translateY: selectedTranslateY.value }],
  }));

  const analyzeStyle = useAnimatedStyle(() => ({
    opacity: analyzeOpacity.value,
    transform: [
      { translateY: analyzeTranslateY.value },
      { scale: analyzePulse.value },
    ],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Upload</Text>

      {/* Picker cards */}
      <Animated.View style={[styles.pickersRow, pickersStyle]}>
        <Animated.View style={[styles.pickerCard, libraryGlowStyle]}>
          <Upload size={20} color="#2563EB" />
          <Text style={styles.pickerLabel}>Choose from{'\n'}Library</Text>
          <TapIndicator isActive={tapLibrary} size={32} color="#2563EB" />
        </Animated.View>
        <View style={styles.pickerCard}>
          <Camera size={20} color="#A1A1AA" />
          <Text style={styles.pickerLabel}>Record{'\n'}Video</Text>
        </View>
      </Animated.View>

      {/* Selected video card */}
      <Animated.View style={[styles.selectedCard, selectedStyle]}>
        <Video size={18} color="#2563EB" />
        <View style={styles.selectedInfo}>
          <Text style={styles.selectedName}>match_finals.mp4</Text>
          <Text style={styles.selectedDuration}>2:34</Text>
        </View>
      </Animated.View>

      {/* Analyze button */}
      <Animated.View style={[styles.analyzeWrap, analyzeStyle]}>
        <LinearGradient
          colors={['#2563EB', '#E91E8C']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.analyzeBtn}
        >
          <Cpu size={14} color="#fff" />
          <Text style={styles.analyzeText}>Analyze</Text>
        </LinearGradient>
        <TapIndicator isActive={tapAnalyze} size={32} color="#E91E8C" />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  header: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 12,
  },
  pickersRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  pickerCard: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingVertical: 14,
    alignItems: 'center',
    gap: 6,
    position: 'relative',
  },
  pickerLabel: {
    fontSize: 10,
    color: '#A1A1AA',
    textAlign: 'center',
    fontWeight: '600',
    lineHeight: 14,
  },
  selectedCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    padding: 12,
    gap: 10,
    marginBottom: 12,
  },
  selectedInfo: {
    flex: 1,
  },
  selectedName: {
    fontSize: 11,
    color: '#fff',
    fontWeight: '600',
  },
  selectedDuration: {
    fontSize: 9,
    color: '#71717A',
    marginTop: 2,
  },
  analyzeWrap: {
    alignItems: 'center',
    position: 'relative',
  },
  analyzeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 32,
    borderRadius: 14,
  },
  analyzeText: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
});

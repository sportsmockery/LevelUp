import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedReaction,
  withTiming,
  withDelay,
  withSpring,
  runOnJS,
  Easing,
  SharedValue,
} from 'react-native-reanimated';
import { CheckCircle } from 'lucide-react-native';
import { LinearGradient } from 'expo-linear-gradient';

type Props = {
  isActive: boolean;
};

const POSITIONS = [
  { label: 'STANDING', score: 78, color: '#2563EB' },
  { label: 'TOP', score: 85, color: '#22C55E' },
  { label: 'BOTTOM', score: 82, color: '#2563EB' },
];

const STRENGTHS = [
  'Strong shot selection',
  'Good ride pressure',
  'Quick stand-ups',
];

const getScoreColor = (score: number) => {
  if (score >= 85) return '#22C55E';
  if (score >= 70) return '#2563EB';
  if (score >= 55) return '#EAB308';
  return '#EF4444';
};

// Extracted component to avoid hooks-in-loop violation
function PositionCard({
  label,
  targetScore,
  opacityVal,
  translateYVal,
  scoreAnimVal,
}: {
  label: string;
  targetScore: number;
  opacityVal: SharedValue<number>;
  translateYVal: SharedValue<number>;
  scoreAnimVal: SharedValue<number>;
}) {
  const [displayScore, setDisplayScore] = useState(0);

  useAnimatedReaction(
    () => scoreAnimVal.value,
    (val) => { runOnJS(setDisplayScore)(Math.round(val)); },
  );

  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacityVal.value,
    transform: [{ translateY: translateYVal.value }],
  }));

  return (
    <Animated.View style={[styles.posCard, cardStyle]}>
      <Text style={[styles.posScore, { color: getScoreColor(targetScore) }]}>
        {displayScore}
      </Text>
      <Text style={styles.posLabel}>{label}</Text>
    </Animated.View>
  );
}

// Extracted component to avoid hooks-in-loop violation
function StrengthItem({
  text,
  opacityVal,
  translateXVal,
}: {
  text: string;
  opacityVal: SharedValue<number>;
  translateXVal: SharedValue<number>;
}) {
  const itemStyle = useAnimatedStyle(() => ({
    opacity: opacityVal.value,
    transform: [{ translateX: translateXVal.value }],
  }));

  return (
    <Animated.View style={[styles.strengthItem, itemStyle]}>
      <CheckCircle size={12} color="#22C55E" />
      <Text style={styles.strengthText}>{text}</Text>
    </Animated.View>
  );
}

export default function ResultsMockup({ isActive }: Props) {
  const [displayOverall, setDisplayOverall] = useState(0);

  const overallAnim = useSharedValue(0);
  const scoreCircleOpacity = useSharedValue(0);
  const scoreCircleScale = useSharedValue(0.8);

  // Position cards — 3 fixed items, hooks called at top level
  const posCard0Opacity = useSharedValue(0);
  const posCard1Opacity = useSharedValue(0);
  const posCard2Opacity = useSharedValue(0);
  const posCard0TranslateY = useSharedValue(20);
  const posCard1TranslateY = useSharedValue(20);
  const posCard2TranslateY = useSharedValue(20);
  const posScore0Anim = useSharedValue(0);
  const posScore1Anim = useSharedValue(0);
  const posScore2Anim = useSharedValue(0);

  const posCardOpacity = [posCard0Opacity, posCard1Opacity, posCard2Opacity];
  const posCardTranslateY = [posCard0TranslateY, posCard1TranslateY, posCard2TranslateY];
  const posScoreAnim = [posScore0Anim, posScore1Anim, posScore2Anim];

  // Strengths — 3 fixed items
  const strengthsTitleOpacity = useSharedValue(0);
  const str0Opacity = useSharedValue(0);
  const str1Opacity = useSharedValue(0);
  const str2Opacity = useSharedValue(0);
  const str0TranslateX = useSharedValue(-20);
  const str1TranslateX = useSharedValue(-20);
  const str2TranslateX = useSharedValue(-20);

  const strengthItemOpacity = [str0Opacity, str1Opacity, str2Opacity];
  const strengthItemTranslateX = [str0TranslateX, str1TranslateX, str2TranslateX];

  useAnimatedReaction(
    () => overallAnim.value,
    (val) => { runOnJS(setDisplayOverall)(Math.round(val)); },
  );

  useEffect(() => {
    if (isActive) {
      // Reset
      overallAnim.value = 0;
      scoreCircleOpacity.value = 0;
      scoreCircleScale.value = 0.8;
      posCardOpacity.forEach(v => { v.value = 0; });
      posCardTranslateY.forEach(v => { v.value = 20; });
      posScoreAnim.forEach(v => { v.value = 0; });
      strengthsTitleOpacity.value = 0;
      strengthItemOpacity.forEach(v => { v.value = 0; });
      strengthItemTranslateX.forEach(v => { v.value = -20; });
      setDisplayOverall(0);

      // 1. Score circle fades in with scale bounce
      scoreCircleOpacity.value = withTiming(1, { duration: 400 });
      scoreCircleScale.value = withSpring(1, { damping: 12, stiffness: 150 });

      // 2. Overall score counts up
      overallAnim.value = withDelay(200, withTiming(82, { duration: 1000, easing: Easing.out(Easing.ease) }));

      // 3. Position cards stagger in
      POSITIONS.forEach((pos, i) => {
        const delay = 600 + i * 150;
        posCardOpacity[i].value = withDelay(delay, withTiming(1, { duration: 300 }));
        posCardTranslateY[i].value = withDelay(delay, withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }));
        posScoreAnim[i].value = withDelay(delay, withTiming(pos.score, { duration: 800, easing: Easing.out(Easing.ease) }));
      });

      // 4. Strengths title
      strengthsTitleOpacity.value = withDelay(1200, withTiming(1, { duration: 300 }));

      // 5. Strength items stagger
      STRENGTHS.forEach((_, i) => {
        const delay = 1400 + i * 200;
        strengthItemOpacity[i].value = withDelay(delay, withTiming(1, { duration: 300 }));
        strengthItemTranslateX[i].value = withDelay(delay, withTiming(0, { duration: 300, easing: Easing.out(Easing.ease) }));
      });
    } else {
      scoreCircleOpacity.value = withTiming(0, { duration: 200 });
      scoreCircleScale.value = 0.8;
      overallAnim.value = 0;
      posCardOpacity.forEach(v => { v.value = 0; });
      posCardTranslateY.forEach(v => { v.value = 20; });
      posScoreAnim.forEach(v => { v.value = 0; });
      strengthsTitleOpacity.value = 0;
      strengthItemOpacity.forEach(v => { v.value = 0; });
      strengthItemTranslateX.forEach(v => { v.value = -20; });
      setDisplayOverall(0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const circleStyle = useAnimatedStyle(() => ({
    opacity: scoreCircleOpacity.value,
    transform: [{ scale: scoreCircleScale.value }],
  }));

  const strengthsTitleStyle = useAnimatedStyle(() => ({
    opacity: strengthsTitleOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Overall score circle */}
      <Animated.View style={[styles.scoreCircleWrap, circleStyle]}>
        <LinearGradient
          colors={['#2563EB', '#E91E8C']}
          style={styles.scoreRing}
        >
          <View style={styles.scoreInner}>
            <Text style={styles.scoreValue}>{displayOverall}</Text>
          </View>
        </LinearGradient>
        <Text style={styles.scoreLabel}>OVERALL</Text>
      </Animated.View>

      {/* Position cards */}
      <View style={styles.positionRow}>
        {POSITIONS.map((pos, i) => (
          <PositionCard
            key={pos.label}
            label={pos.label}
            targetScore={pos.score}
            opacityVal={posCardOpacity[i]}
            translateYVal={posCardTranslateY[i]}
            scoreAnimVal={posScoreAnim[i]}
          />
        ))}
      </View>

      {/* Strengths */}
      <Animated.View style={[styles.strengthsSection, strengthsTitleStyle]}>
        <Text style={styles.strengthsTitle}>STRENGTHS</Text>
      </Animated.View>
      {STRENGTHS.map((s, i) => (
        <StrengthItem
          key={i}
          text={s}
          opacityVal={strengthItemOpacity[i]}
          translateXVal={strengthItemTranslateX[i]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 6,
    alignItems: 'center',
  },
  scoreCircleWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  scoreRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#fff',
  },
  scoreLabel: {
    fontSize: 8,
    color: '#71717A',
    fontWeight: '700',
    letterSpacing: 1.5,
    marginTop: 4,
  },
  positionRow: {
    flexDirection: 'row',
    gap: 6,
    width: '100%',
    marginBottom: 10,
  },
  posCard: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  posScore: {
    fontSize: 18,
    fontWeight: '800',
  },
  posLabel: {
    fontSize: 7,
    color: '#71717A',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 2,
  },
  strengthsSection: {
    width: '100%',
    marginBottom: 4,
  },
  strengthsTitle: {
    fontSize: 9,
    fontWeight: '700',
    color: '#22C55E',
    letterSpacing: 1,
  },
  strengthItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
    marginBottom: 4,
  },
  strengthText: {
    fontSize: 9,
    color: '#E4E4E7',
    flex: 1,
  },
});

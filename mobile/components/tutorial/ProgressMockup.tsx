import React, { useEffect, useMemo } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSequence,
  Easing,
  createAnimatedComponent,
  SharedValue,
} from 'react-native-reanimated';
import Svg, {
  Polyline,
  Line,
  Circle as SvgCircle,
} from 'react-native-svg';

const AnimatedPolyline = createAnimatedComponent(Polyline);

type Props = {
  isActive: boolean;
};

const SUMMARY_CARDS = [
  { label: 'Matches', value: '5' },
  { label: 'Avg', value: '79' },
  { label: 'W-L', value: '3-2' },
];

const CHART_DATA = [65, 70, 68, 75, 79];
const POSITION_TABS = ['Standing', 'Top', 'Bottom'];

const CHART_W = 220;
const CHART_H = 80;
const PAD_L = 24;
const PAD_R = 8;
const PAD_T = 8;
const PAD_B = 16;

// Extracted component to avoid hooks-in-loop violation
function SummaryCard({
  label,
  value,
  opacityVal,
}: {
  label: string;
  value: string;
  opacityVal: SharedValue<number>;
}) {
  const cardStyle = useAnimatedStyle(() => ({
    opacity: opacityVal.value,
  }));

  return (
    <Animated.View style={[styles.summaryCard, cardStyle]}>
      <Text style={styles.summaryValue}>{value}</Text>
      <Text style={styles.summaryLabel}>{label}</Text>
    </Animated.View>
  );
}

export default function ProgressMockup({ isActive }: Props) {
  // Summary cards — 3 fixed, hooks at top level
  const sum0Opacity = useSharedValue(0);
  const sum1Opacity = useSharedValue(0);
  const sum2Opacity = useSharedValue(0);
  const summaryOpacity = [sum0Opacity, sum1Opacity, sum2Opacity];

  const chartDashOffset = useSharedValue(1);
  const tabIndicatorX = useSharedValue(0);

  // Chart calculations
  const chartW = CHART_W - PAD_L - PAD_R;
  const chartH = CHART_H - PAD_T - PAD_B;
  const minY = 50;
  const maxY = 100;
  const range = maxY - minY;

  const toX = (i: number) => PAD_L + (i / (CHART_DATA.length - 1)) * chartW;
  const toY = (v: number) => PAD_T + chartH - ((v - minY) / range) * chartH;

  const pointsStr = CHART_DATA.map((d, i) => `${toX(i)},${toY(d)}`).join(' ');

  // Estimate total path length
  const totalLength = useMemo(() => {
    let len = 0;
    for (let i = 1; i < CHART_DATA.length; i++) {
      const dx = toX(i) - toX(i - 1);
      const dy = toY(CHART_DATA[i]) - toY(CHART_DATA[i - 1]);
      len += Math.sqrt(dx * dx + dy * dy);
    }
    return len;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const animatedPolylineProps = useAnimatedProps(() => ({
    strokeDashoffset: chartDashOffset.value * totalLength,
  }));

  useEffect(() => {
    if (isActive) {
      // Reset
      summaryOpacity.forEach(v => { v.value = 0; });
      chartDashOffset.value = 1;
      tabIndicatorX.value = 0;

      // 1. Summary cards stagger in
      SUMMARY_CARDS.forEach((_, i) => {
        summaryOpacity[i].value = withDelay(i * 200, withTiming(1, { duration: 300 }));
      });

      // 2. Chart draws
      chartDashOffset.value = withDelay(800, withTiming(0, { duration: 1500, easing: Easing.out(Easing.ease) }));

      // 3. Tab cycling
      const tabWidth = 60;
      tabIndicatorX.value = withDelay(
        2500,
        withSequence(
          withTiming(tabWidth, { duration: 600 }),     // → Top
          withTiming(tabWidth * 2, { duration: 600 }), // → Bottom
          withTiming(0, { duration: 600 }),             // → Standing
        ),
      );
    } else {
      summaryOpacity.forEach(v => { v.value = 0; });
      chartDashOffset.value = 1;
      tabIndicatorX.value = 0;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isActive]);

  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicatorX.value }],
  }));

  return (
    <View style={styles.container}>
      {/* Header */}
      <Text style={styles.header}>Progress Dashboard</Text>

      {/* Summary row */}
      <View style={styles.summaryRow}>
        {SUMMARY_CARDS.map((card, i) => (
          <SummaryCard
            key={card.label}
            label={card.label}
            value={card.value}
            opacityVal={summaryOpacity[i]}
          />
        ))}
      </View>

      {/* Chart */}
      <View style={styles.chartWrap}>
        <Svg width={CHART_W} height={CHART_H}>
          {/* Horizontal grid lines */}
          {[50, 75, 100].map(v => (
            <Line
              key={v}
              x1={PAD_L}
              y1={toY(v)}
              x2={CHART_W - PAD_R}
              y2={toY(v)}
              stroke="#27272A"
              strokeWidth={0.5}
            />
          ))}

          {/* Animated line */}
          <AnimatedPolyline
            points={pointsStr}
            fill="none"
            stroke="#2563EB"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
            strokeDasharray={totalLength}
            animatedProps={animatedPolylineProps}
          />

          {/* Data dots */}
          {CHART_DATA.map((d, i) => (
            <SvgCircle
              key={i}
              cx={toX(i)}
              cy={toY(d)}
              r={2.5}
              fill="#2563EB"
              stroke="#0A0A0A"
              strokeWidth={1}
            />
          ))}
        </Svg>
      </View>

      {/* Position tabs */}
      <View style={styles.tabsContainer}>
        <Animated.View style={[styles.tabIndicator, tabIndicatorStyle]} />
        {POSITION_TABS.map((tab) => (
          <View key={tab} style={styles.tab}>
            <Text style={styles.tabText}>{tab}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 8,
  },
  header: {
    fontSize: 14,
    fontWeight: '800',
    color: '#fff',
    textAlign: 'center',
    marginBottom: 10,
  },
  summaryRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#fff',
  },
  summaryLabel: {
    fontSize: 8,
    color: '#71717A',
    fontWeight: '600',
    marginTop: 2,
  },
  chartWrap: {
    alignItems: 'center',
    marginBottom: 10,
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#18181B',
    borderRadius: 10,
    padding: 2,
    position: 'relative',
  },
  tabIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 60,
    height: 26,
    backgroundColor: '#2563EB',
    borderRadius: 8,
  },
  tab: {
    width: 60,
    height: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  tabText: {
    fontSize: 9,
    color: '#fff',
    fontWeight: '600',
  },
});

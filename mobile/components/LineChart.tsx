import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, {
  Polyline,
  Circle as SvgCircle,
  Line,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Polygon,
  Text as SvgText,
} from 'react-native-svg';

type DataPoint = {
  date: string;
  score: number;
};

type LineChartProps = {
  data: DataPoint[];
  color?: string;
  width?: number;
  height?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingTop?: number;
  paddingBottom?: number;
  showDots?: boolean;
  showGradient?: boolean;
  showYAxis?: boolean;
  showXAxis?: boolean;
  minY?: number;
  maxY?: number;
};

export default function LineChart({
  data,
  color = '#2563EB',
  width = 300,
  height = 160,
  paddingLeft = 36,
  paddingRight = 12,
  paddingTop = 12,
  paddingBottom = 28,
  showDots = true,
  showGradient = true,
  showYAxis = true,
  showXAxis = true,
  minY = 0,
  maxY = 100,
}: LineChartProps) {
  if (data.length < 2) return null;

  const chartW = width - paddingLeft - paddingRight;
  const chartH = height - paddingTop - paddingBottom;
  const range = maxY - minY || 1;

  const toX = (i: number) => paddingLeft + (i / (data.length - 1)) * chartW;
  const toY = (v: number) => paddingTop + chartH - ((v - minY) / range) * chartH;

  const points = data.map((d, i) => `${toX(i)},${toY(d.score)}`).join(' ');

  // Gradient fill polygon — line path + bottom edge
  const gradientPoints = [
    ...data.map((d, i) => `${toX(i)},${toY(d.score)}`),
    `${toX(data.length - 1)},${paddingTop + chartH}`,
    `${toX(0)},${paddingTop + chartH}`,
  ].join(' ');

  // Y-axis labels
  const yLabels = [0, 25, 50, 75, 100];

  // X-axis date labels — pick a subset
  const xLabelCount = Math.min(data.length, 4);
  const xIndices: number[] = [];
  if (data.length <= 4) {
    for (let i = 0; i < data.length; i++) xIndices.push(i);
  } else {
    for (let i = 0; i < xLabelCount; i++) {
      xIndices.push(Math.round((i / (xLabelCount - 1)) * (data.length - 1)));
    }
  }

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <View style={[styles.container, { width, height }]}>
      <Svg width={width} height={height}>
        <Defs>
          <SvgLinearGradient id="fillGradient" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <Stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </SvgLinearGradient>
        </Defs>

        {/* Horizontal grid lines */}
        {showYAxis &&
          yLabels.map((v) => (
            <Line
              key={v}
              x1={paddingLeft}
              y1={toY(v)}
              x2={width - paddingRight}
              y2={toY(v)}
              stroke="#27272A"
              strokeWidth={1}
            />
          ))}

        {/* Y-axis labels */}
        {showYAxis &&
          yLabels.map((v) => (
            <SvgText
              key={`y-${v}`}
              x={paddingLeft - 6}
              y={toY(v) + 4}
              fill="#52525B"
              fontSize={10}
              textAnchor="end"
            >
              {v}
            </SvgText>
          ))}

        {/* X-axis labels */}
        {showXAxis &&
          xIndices.map((idx) => (
            <SvgText
              key={`x-${idx}`}
              x={toX(idx)}
              y={height - 4}
              fill="#52525B"
              fontSize={9}
              textAnchor="middle"
            >
              {formatDate(data[idx].date)}
            </SvgText>
          ))}

        {/* Gradient fill */}
        {showGradient && (
          <Polygon points={gradientPoints} fill="url(#fillGradient)" />
        )}

        {/* Line */}
        <Polyline
          points={points}
          fill="none"
          stroke={color}
          strokeWidth={2.5}
          strokeLinejoin="round"
          strokeLinecap="round"
        />

        {/* Data point dots */}
        {showDots &&
          data.map((d, i) => (
            <SvgCircle
              key={i}
              cx={toX(i)}
              cy={toY(d.score)}
              r={3}
              fill={color}
              stroke="#0A0A0A"
              strokeWidth={1.5}
            />
          ))}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignSelf: 'center',
  },
});

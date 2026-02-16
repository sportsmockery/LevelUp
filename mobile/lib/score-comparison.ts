export type ScoreTrendIndicator = {
  icon: 'up-double' | 'up' | 'neutral' | 'down' | 'down-double' | 'first';
  color: string;
  bgColor: string;
  label: string;
};

export function computeScoreDelta(
  currentScore: number,
  previousScore: number | null,
): number | null {
  if (previousScore === null) return null;
  return currentScore - previousScore;
}

export function getScoreTrendIndicator(delta: number | null): ScoreTrendIndicator {
  if (delta === null) {
    return { icon: 'first', color: '#71717A', bgColor: '#71717A20', label: 'First match' };
  }
  if (delta >= 10) {
    return { icon: 'up-double', color: '#22C55E', bgColor: '#22C55E20', label: `+${delta} from last match` };
  }
  if (delta >= 5) {
    return { icon: 'up', color: '#22C55E', bgColor: '#22C55E20', label: `+${delta} from last match` };
  }
  if (delta <= -10) {
    return { icon: 'down-double', color: '#EF4444', bgColor: '#EF444420', label: `${delta} from last match` };
  }
  if (delta <= -5) {
    return { icon: 'down', color: '#EF4444', bgColor: '#EF444420', label: `${delta} from last match` };
  }
  return { icon: 'neutral', color: '#71717A', bgColor: '#71717A20', label: 'Similar to last match' };
}

export function formatScoreComparison(
  current: number,
  previous: number | null,
): string {
  if (previous === null) return 'First match';
  const delta = current - previous;
  if (delta > 0) return `+${delta} from last`;
  if (delta < 0) return `${delta} from last`;
  return 'Same as last';
}

export function getPositionDeltaColor(delta: number): string {
  if (delta > 0) return '#22C55E';
  if (delta < 0) return '#EF4444';
  return '#71717A';
}

export function formatPositionVsAvg(
  positionName: string,
  current: number,
  avg: number,
): { text: string; delta: number; color: string } {
  const delta = Math.round(current - avg);
  const color = getPositionDeltaColor(delta);
  const sign = delta > 0 ? '+' : '';
  return {
    text: `${sign}${delta} from avg (${avg})`,
    delta,
    color,
  };
}

// Leaderboard Engine — Feature 11: Social/Community
//
// Computes club/team leaderboards from match analyses.
// Rankings by: overall score avg, position scores, improvement rate, consistency.

export type LeaderboardEntry = {
  athleteId: string;
  athleteName: string;
  rank: number;
  value: number;
  analysisCount: number;
  trend: 'up' | 'down' | 'stable';
  recentDelta: number;
};

export type LeaderboardType = 'overall' | 'standing' | 'top' | 'bottom' | 'improvement' | 'consistency';

type AnalysisRecord = {
  athlete_id: string;
  athlete_name?: string;
  overall_score: number;
  standing: number;
  top: number;
  bottom: number;
  created_at: string;
};

/**
 * Compute leaderboard rankings from analysis records.
 */
export function computeLeaderboard(
  analyses: AnalysisRecord[],
  type: LeaderboardType,
): LeaderboardEntry[] {
  // Group by athlete
  const byAthlete = new Map<string, AnalysisRecord[]>();
  for (const a of analyses) {
    const existing = byAthlete.get(a.athlete_id) || [];
    existing.push(a);
    byAthlete.set(a.athlete_id, existing);
  }

  const entries: LeaderboardEntry[] = [];

  for (const [athleteId, records] of byAthlete) {
    // Sort by date ascending
    records.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    const latest = records[records.length - 1];
    const athleteName = latest.athlete_name || athleteId.substring(0, 8);

    let value: number;
    let trend: 'up' | 'down' | 'stable';
    let recentDelta: number;

    switch (type) {
      case 'overall':
        value = average(records.map(r => r.overall_score));
        break;
      case 'standing':
        value = average(records.map(r => r.standing));
        break;
      case 'top':
        value = average(records.map(r => r.top));
        break;
      case 'bottom':
        value = average(records.map(r => r.bottom));
        break;
      case 'improvement': {
        if (records.length < 2) {
          value = 0;
        } else {
          const firstThree = records.slice(0, Math.min(3, Math.floor(records.length / 2)));
          const lastThree = records.slice(-Math.min(3, Math.floor(records.length / 2)));
          value = average(lastThree.map(r => r.overall_score)) - average(firstThree.map(r => r.overall_score));
        }
        break;
      }
      case 'consistency': {
        if (records.length < 3) {
          value = 0;
        } else {
          const scores = records.map(r => r.overall_score);
          const stdDev = standardDeviation(scores);
          // Invert: lower stdDev = more consistent = higher ranking
          value = Math.round((100 - stdDev) * 10) / 10;
        }
        break;
      }
    }

    // Compute trend from last 3 analyses
    if (records.length >= 3) {
      const last3 = records.slice(-3).map(r => r.overall_score);
      const last3Delta = last3[2] - last3[0];
      trend = last3Delta > 3 ? 'up' : last3Delta < -3 ? 'down' : 'stable';
      recentDelta = last3Delta;
    } else if (records.length >= 2) {
      const delta = records[records.length - 1].overall_score - records[records.length - 2].overall_score;
      trend = delta > 3 ? 'up' : delta < -3 ? 'down' : 'stable';
      recentDelta = delta;
    } else {
      trend = 'stable';
      recentDelta = 0;
    }

    entries.push({
      athleteId,
      athleteName,
      rank: 0,
      value: Math.round(value * 10) / 10,
      analysisCount: records.length,
      trend,
      recentDelta: Math.round(recentDelta * 10) / 10,
    });
  }

  // Sort descending by value
  entries.sort((a, b) => b.value - a.value);

  // Assign ranks
  entries.forEach((e, i) => { e.rank = i + 1; });

  return entries;
}

function average(nums: number[]): number {
  return nums.length > 0 ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
}

function standardDeviation(nums: number[]): number {
  if (nums.length < 2) return 0;
  const avg = average(nums);
  const squaredDiffs = nums.map(n => (n - avg) ** 2);
  return Math.sqrt(average(squaredDiffs));
}

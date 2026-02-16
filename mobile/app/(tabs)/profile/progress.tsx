import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Trophy,
  BarChart3,
  ChevronRight,
  Minus,
} from 'lucide-react-native';
import { API_BASE } from '@/lib/api';
import { ProgressDashboardData } from '@/lib/types';
import { useAuth } from '@/lib/auth';
import LineChart from '@/components/LineChart';

type PositionTab = 'standing' | 'top' | 'bottom';

const getScoreColor = (score: number) => {
  if (score >= 85) return '#22C55E';
  if (score >= 70) return '#2563EB';
  if (score >= 55) return '#EAB308';
  return '#EF4444';
};

const getTrendIcon = (trend: string, size: number = 14) => {
  if (trend === 'improving') return <TrendingUp size={size} color="#22C55E" />;
  if (trend === 'declining') return <TrendingDown size={size} color="#EF4444" />;
  return <Minus size={size} color="#71717A" />;
};

const getTrendColor = (trend: string) => {
  if (trend === 'improving') return '#22C55E';
  if (trend === 'declining') return '#EF4444';
  return '#71717A';
};

export default function ProgressDashboardScreen() {
  const router = useRouter();
  const { profile } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const [data, setData] = useState<ProgressDashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posTab, setPosTab] = useState<PositionTab>('standing');

  const chartWidth = Math.min(screenWidth - 64, 340);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      setLoading(true);
      setError(null);

      fetch(`${API_BASE}/api/wrestler/progress`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json();
        })
        .then((json) => {
          if (cancelled) return;
          setData(json);
        })
        .catch((err) => {
          if (cancelled) return;
          console.error('[LevelUp] Progress fetch error:', err);
          setError('Failed to load progress data');
        })
        .finally(() => {
          if (!cancelled) setLoading(false);
        });

      return () => { cancelled = true; };
    }, [])
  );

  const positionData = data ? {
    scores: data.positionScores[posTab],
    avg: data.positionAverages[posTab],
    trend: data.positionTrends[posTab],
    strengths: data.topStrengths.filter((s) => s.position === posTab),
    weaknesses: data.topWeaknesses.filter((w) => w.position === posTab),
  } : null;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              router.back();
            }}
          >
            <ArrowLeft size={20} color="#A1A1AA" />
          </TouchableOpacity>
          <View style={styles.headerInfo}>
            <Text style={styles.headerTitle}>Progress Dashboard</Text>
            {profile?.full_name && (
              <Text style={styles.headerSubtitle}>{profile.full_name}</Text>
            )}
          </View>
        </View>

        {loading && (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.emptySubtext}>Loading progress...</Text>
          </View>
        )}

        {error && (
          <View style={styles.emptyState}>
            <BarChart3 size={40} color="#52525B" />
            <Text style={styles.emptyText}>{error}</Text>
          </View>
        )}

        {data && data.stats.totalMatches === 0 && (
          <View style={styles.emptyState}>
            <BarChart3 size={40} color="#52525B" />
            <Text style={styles.emptyText}>No matches yet</Text>
            <Text style={styles.emptySubtext}>
              Upload a match video to start tracking your progress
            </Text>
          </View>
        )}

        {data && data.stats.totalMatches > 0 && (
          <>
            {/* Summary Row */}
            <View style={styles.summaryRow}>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>{data.stats.totalMatches}</Text>
                <Text style={styles.summaryLabel}>Matches</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={[styles.summaryValue, { color: getScoreColor(data.stats.avgScore) }]}>
                  {data.stats.avgScore}
                </Text>
                <Text style={styles.summaryLabel}>Avg Score</Text>
              </View>
              <View style={styles.summaryCard}>
                <Text style={styles.summaryValue}>
                  {data.stats.wins}-{data.stats.losses}
                  {data.stats.draws > 0 ? `-${data.stats.draws}` : ''}
                </Text>
                <Text style={styles.summaryLabel}>W-L</Text>
              </View>
            </View>

            {/* Overall Trend Chart */}
            {data.overallScores.length >= 2 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>OVERALL SCORE TREND</Text>
                <View style={styles.chartCard}>
                  <LineChart
                    data={data.overallScores}
                    color="#2563EB"
                    width={chartWidth}
                    height={170}
                  />
                </View>
              </View>
            )}

            {/* Position Tabs */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>POSITION BREAKDOWN</Text>
              <View style={styles.posTabRow}>
                {(['standing', 'top', 'bottom'] as PositionTab[]).map((p) => (
                  <TouchableOpacity
                    key={p}
                    style={[styles.posTab, posTab === p && styles.posTabActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setPosTab(p);
                    }}
                  >
                    <Text style={[styles.posTabText, posTab === p && styles.posTabTextActive]}>
                      {p.charAt(0).toUpperCase() + p.slice(1)}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {positionData && (
                <View style={styles.posContent}>
                  {/* Avg score + trend */}
                  <View style={styles.posScoreRow}>
                    <View>
                      <Text style={styles.posScoreLabel}>Average</Text>
                      <Text style={[styles.posScoreValue, { color: getScoreColor(positionData.avg) }]}>
                        {positionData.avg}
                      </Text>
                    </View>
                    <View style={styles.posTrendWrap}>
                      {getTrendIcon(positionData.trend.trend, 18)}
                      <Text style={[styles.posTrendDelta, { color: getTrendColor(positionData.trend.trend) }]}>
                        {positionData.trend.delta > 0 ? '+' : ''}
                        {positionData.trend.delta}
                      </Text>
                      <Text style={styles.posTrendLabel}>{positionData.trend.trend}</Text>
                    </View>
                  </View>

                  {/* Mini chart */}
                  {positionData.scores.length >= 2 && (
                    <View style={styles.miniChartWrap}>
                      <LineChart
                        data={positionData.scores}
                        color={posTab === 'standing' ? '#2563EB' : posTab === 'top' ? '#22C55E' : '#EAB308'}
                        width={chartWidth}
                        height={120}
                        showYAxis={false}
                        showXAxis={false}
                        paddingLeft={8}
                        paddingRight={8}
                        paddingTop={8}
                        paddingBottom={8}
                      />
                    </View>
                  )}

                  {/* Strengths */}
                  {positionData.strengths.length > 0 && (
                    <View style={styles.posListSection}>
                      <Text style={styles.posListTitle}>Strengths</Text>
                      {positionData.strengths.map((s, i) => (
                        <View key={i} style={styles.posListItem}>
                          <View style={[styles.posListDot, { backgroundColor: '#22C55E' }]} />
                          <Text style={styles.posListText}>{s.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Weaknesses */}
                  {positionData.weaknesses.length > 0 && (
                    <View style={styles.posListSection}>
                      <Text style={styles.posListTitle}>Areas to Improve</Text>
                      {positionData.weaknesses.map((w, i) => (
                        <View key={i} style={styles.posListItem}>
                          <View style={[styles.posListDot, { backgroundColor: '#EF4444' }]} />
                          <Text style={styles.posListText}>{w.text}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* Recurring Issues */}
            {data.recurringIssues.length > 0 && (
              <View style={styles.section}>
                <View style={styles.issueHeader}>
                  <AlertTriangle size={14} color="#EAB308" />
                  <Text style={[styles.sectionTitle, { color: '#EAB308', marginBottom: 0 }]}>
                    RECURRING ISSUES
                  </Text>
                </View>
                {data.recurringIssues.map((issue, i) => (
                  <View key={i} style={styles.issueCard}>
                    <Text style={styles.issueText}>{issue.weakness}</Text>
                    <Text style={styles.issueCount}>
                      Appeared in {issue.occurrences} of {issue.totalMatches} matches
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Recent Matches */}
            {data.recentMatches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>RECENT MATCHES</Text>
                {data.recentMatches.map((m) => {
                  const isWin = m.matchResult === 'win' || m.matchResult === 'W';
                  const isLoss = m.matchResult === 'loss' || m.matchResult === 'L';
                  return (
                    <View key={m.id} style={styles.matchCard}>
                      <View style={styles.matchInfo}>
                        <View style={styles.matchTopRow}>
                          {(isWin || isLoss) && (
                            <View style={[styles.matchBadge, isWin ? styles.matchBadgeWin : styles.matchBadgeLoss]}>
                              <Text style={styles.matchBadgeText}>{isWin ? 'W' : 'L'}</Text>
                            </View>
                          )}
                          <Text style={styles.matchOpponent} numberOfLines={1}>
                            {m.opponentName || 'Unknown'}
                          </Text>
                        </View>
                        <Text style={styles.matchDate}>
                          {new Date(m.date).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                          })}
                        </Text>
                      </View>
                      <View style={styles.matchScoreWrap}>
                        <Text style={[styles.matchScore, { color: getScoreColor(m.overallScore) }]}>
                          {m.overallScore}
                        </Text>
                        {m.scoreDelta !== null && (
                          <Text
                            style={[
                              styles.matchDelta,
                              { color: m.scoreDelta > 0 ? '#22C55E' : m.scoreDelta < 0 ? '#EF4444' : '#71717A' },
                            ]}
                          >
                            {m.scoreDelta > 0 ? '+' : ''}{m.scoreDelta}
                          </Text>
                        )}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}
          </>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
    gap: 12,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerInfo: { flex: 1 },
  headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff' },
  headerSubtitle: { fontSize: 13, color: '#A1A1AA', marginTop: 2 },

  // Summary row
  summaryRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  summaryValue: { fontSize: 22, fontWeight: '800', color: '#fff' },
  summaryLabel: { fontSize: 10, color: '#71717A', fontWeight: '600', letterSpacing: 0.5 },

  // Section
  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.5,
    marginBottom: 14,
  },

  // Chart card
  chartCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
  },

  // Position tabs
  posTabRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  posTab: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: '#18181B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  posTabActive: {
    backgroundColor: '#2563EB20',
    borderColor: '#2563EB',
  },
  posTabText: { fontSize: 13, fontWeight: '700', color: '#71717A' },
  posTabTextActive: { color: '#2563EB' },

  posContent: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  posScoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  posScoreLabel: { fontSize: 11, color: '#71717A', fontWeight: '600' },
  posScoreValue: { fontSize: 32, fontWeight: '800' },
  posTrendWrap: {
    alignItems: 'flex-end',
    gap: 2,
  },
  posTrendDelta: { fontSize: 18, fontWeight: '700' },
  posTrendLabel: { fontSize: 11, color: '#71717A', fontWeight: '600', textTransform: 'capitalize' },

  miniChartWrap: {
    marginVertical: 8,
    alignItems: 'center',
  },

  posListSection: { marginTop: 12 },
  posListTitle: { fontSize: 12, fontWeight: '700', color: '#A1A1AA', marginBottom: 8 },
  posListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  posListDot: { width: 6, height: 6, borderRadius: 3 },
  posListText: { fontSize: 13, color: '#E4E4E7', textTransform: 'capitalize', flex: 1 },

  // Recurring issues
  issueHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  issueCard: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  issueText: { fontSize: 14, fontWeight: '600', color: '#E4E4E7', textTransform: 'capitalize' },
  issueCount: { fontSize: 11, color: '#71717A', marginTop: 4 },

  // Recent matches
  matchCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  matchInfo: { flex: 1 },
  matchTopRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  matchBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  matchBadgeWin: { backgroundColor: '#22C55E20' },
  matchBadgeLoss: { backgroundColor: '#EF444420' },
  matchBadgeText: { fontSize: 11, fontWeight: '800', color: '#E4E4E7' },
  matchOpponent: { fontSize: 14, fontWeight: '600', color: '#E4E4E7', flex: 1 },
  matchDate: { fontSize: 12, color: '#71717A', marginTop: 4 },
  matchScoreWrap: { alignItems: 'flex-end', gap: 2 },
  matchScore: { fontSize: 24, fontWeight: '800' },
  matchDelta: { fontSize: 12, fontWeight: '700' },

  // Empty state
  emptyState: { alignItems: 'center', paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#52525B' },
  emptySubtext: { fontSize: 13, color: '#3F3F46', textAlign: 'center' },
});

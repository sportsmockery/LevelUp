import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Image,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect, useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Svg, { Polyline, Circle as SvgCircle } from 'react-native-svg';
import {
  Trophy,
  Video,
  Award,
  BarChart3,
  Settings,
  ChevronRight,
  Lock,
  LogOut,
  Bell,
  User,
  Scale,
  Users,
  Flame,
  Calendar,
  Zap,
  Target,
  Shield,
  Star,
  Medal,
  Swords,
  History,
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
} from 'lucide-react-native';
import { getAnalysisHistory } from '@/lib/storage';
import { AnalysisHistoryEntry } from '@/lib/types';
import { getProfileStats, ProfileStats } from '@/lib/profile-stats';
import AnalysisResults from '@/components/AnalysisResults';
import VideoReviewOverlay from '@/components/VideoReviewOverlay';
import ComparisonView from '@/components/ComparisonView';

type ProfileTab = 'stats' | 'history' | 'badges' | 'settings';

const COLOR_HEX_MAP: Record<string, string> = {
  red: '#EF4444', blue: '#2563EB', green: '#22C55E',
  black: '#3F3F46', white: '#E4E4E7', gray: '#71717A',
};

const getScoreColor = (score: number) => {
  if (score >= 85) return '#22C55E';
  if (score >= 70) return '#2563EB';
  if (score >= 55) return '#EAB308';
  return '#EF4444';
};

const getBadgeIcon = (type: string, color: string) => {
  switch (type) {
    case 'trophy': return <Trophy size={24} color={color} />;
    case 'flame': return <Flame size={24} color={color} />;
    case 'target': return <Target size={24} color={color} />;
    case 'shield': return <Shield size={24} color={color} />;
    case 'star': return <Star size={24} color={color} />;
    case 'medal': return <Medal size={24} color={color} />;
    case 'zap': return <Zap size={24} color={color} />;
    case 'swords': return <Swords size={24} color={color} />;
    case 'upload': return <Video size={24} color={color} />;
    case 'film': return <Video size={24} color={color} />;
    case 'award': return <Award size={24} color={color} />;
    case 'crown': return <Trophy size={24} color={color} />;
    case 'wind': return <Zap size={24} color={color} />;
    case 'lock': return <Lock size={24} color={color} />;
    case 'heart': return <Flame size={24} color={color} />;
    case 'eye': return <Target size={24} color={color} />;
    default: return <Award size={24} color={color} />;
  }
};

// Simple sparkline component
function Sparkline({ data, color, width = 280, height = 60 }: { data: number[]; color: string; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const min = Math.min(...data) - 5;
  const max = Math.max(...data) + 5;
  const range = max - min || 1;
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - ((v - min) / range) * height;
    return `${x},${y}`;
  }).join(' ');
  const lastX = width;
  const lastY = height - ((data[data.length - 1] - min) / range) * height;
  return (
    <Svg width={width} height={height}>
      <Polyline points={points} fill="none" stroke={color} strokeWidth={2} />
      <SvgCircle cx={lastX} cy={lastY} r={3} fill={color} />
    </Svg>
  );
}

export default function ProfileScreen() {
  const router = useRouter();
  const [tab, setTab] = useState<ProfileTab>('stats');
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>([]);
  const [stats, setStats] = useState<ProfileStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [selectedEntry, setSelectedEntry] = useState<AnalysisHistoryEntry | null>(null);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelections, setCompareSelections] = useState<AnalysisHistoryEntry[]>([]);

  const loadData = useCallback(async () => {
    setLoadingStats(true);
    const [h, s] = await Promise.all([
      getAnalysisHistory(),
      getProfileStats(),
    ]);
    setHistory(h);
    setStats(s);
    setLoadingStats(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  useEffect(() => {
    if (tab === 'history') getAnalysisHistory().then(setHistory);
  }, [tab]);

  const videoCount = stats?.videoCount ?? history.length;
  const avgScore = stats?.avgScore ?? 0;
  const record = stats ? `${stats.record.wins}-${stats.record.losses}` : `${history.length}-0`;
  const badgesEarned = stats?.badges.length ?? 0;
  const xp = videoCount * 150;
  const level = Math.floor(xp / 500) + 1;
  const xpInLevel = xp % 500;
  const xpPercent = (xpInLevel / 500) * 100;

  const seasonStats = stats ? [
    { label: 'Win Rate', value: `${stats.winRate}%`, color: '#22C55E' },
    { label: 'Pin Rate', value: `${stats.pinRate}%`, color: '#2563EB' },
    { label: 'Avg Match', value: stats.avgDuration > 0 ? `${Math.floor(stats.avgDuration / 60)}:${String(stats.avgDuration % 60).padStart(2, '0')}` : '--', color: '#E91E8C' },
    { label: 'TDs/Match', value: String(stats.perMatchStats.takedowns), color: '#EAB308' },
    { label: 'NFs/Match', value: String(stats.perMatchStats.nearFalls), color: '#8B5CF6' },
    { label: 'Esc/Match', value: String(stats.perMatchStats.escapes), color: '#06B6D4' },
  ] : [];

  const renderTabContent = () => {
    switch (tab) {
      case 'stats':
        if (loadingStats) {
          return (
            <View style={styles.emptyState}>
              <ActivityIndicator size="large" color="#2563EB" />
              <Text style={styles.emptySubtext}>Loading stats...</Text>
            </View>
          );
        }

        if (!stats || stats.videoCount === 0) {
          return (
            <View style={styles.emptyState}>
              <BarChart3 size={40} color="#52525B" />
              <Text style={styles.emptyText}>No stats yet</Text>
              <Text style={styles.emptySubtext}>Upload your first match video to see stats here</Text>
            </View>
          );
        }

        return (
          <>
            {/* Season Performance Grid */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>SEASON PERFORMANCE</Text>
              <View style={styles.seasonGrid}>
                {seasonStats.map((stat, i) => (
                  <View key={i} style={styles.seasonCard}>
                    <Text style={[styles.seasonValue, { color: stat.color }]}>
                      {stat.value}
                    </Text>
                    <Text style={styles.seasonLabel}>{stat.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Score Trend */}
            {stats.scoreTrend.length >= 2 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>SCORE TREND</Text>
                <View style={styles.trendCard}>
                  <Sparkline
                    data={stats.scoreTrend.map((t) => t.score)}
                    color="#2563EB"
                  />
                  <View style={styles.trendLabels}>
                    <Text style={styles.trendLabel}>First: {stats.scoreTrend[0].score}</Text>
                    <Text style={styles.trendLabel}>Latest: {stats.scoreTrend[stats.scoreTrend.length - 1].score}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Position Breakdown */}
            {stats.positionImprovement && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>POSITION PROGRESS</Text>
                {(['standing', 'top', 'bottom'] as const).map((pos) => {
                  const imp = stats.positionImprovement![pos];
                  const deltaColor = imp.delta > 0 ? '#22C55E' : imp.delta < 0 ? '#EF4444' : '#71717A';
                  return (
                    <View key={pos} style={styles.positionProgressRow}>
                      <Text style={styles.positionProgressLabel}>{pos.toUpperCase()}</Text>
                      <Text style={[styles.positionProgressScore, { color: getScoreColor(imp.latest) }]}>
                        {imp.latest}
                      </Text>
                      <View style={styles.positionProgressDelta}>
                        {imp.delta > 0 ? <TrendingUp size={14} color={deltaColor} /> : imp.delta < 0 ? <TrendingDown size={14} color={deltaColor} /> : null}
                        <Text style={[styles.positionProgressDeltaText, { color: deltaColor }]}>
                          {imp.delta > 0 ? '+' : ''}{imp.delta}
                        </Text>
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Recurring Weaknesses / Focus Areas */}
            {stats.recurringWeaknesses.length > 0 && (
              <View style={styles.section}>
                <View style={styles.focusHeader}>
                  <AlertTriangle size={14} color="#EAB308" />
                  <Text style={[styles.sectionTitle, { color: '#EAB308', marginBottom: 0 }]}>FOCUS AREAS</Text>
                </View>
                {stats.recurringWeaknesses.slice(0, 5).map((w, i) => (
                  <View key={i} style={styles.focusItem}>
                    <Text style={styles.focusText}>{w.weakness}</Text>
                    <Text style={styles.focusCount}>
                      {w.count}x in last {Math.min(stats.videoCount, 5)} videos
                    </Text>
                  </View>
                ))}
              </View>
            )}

            {/* Level History */}
            {stats.levelHistory.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>RECENT ACTIVITY</Text>
                {stats.levelHistory.slice(0, 10).map((entry, i) => (
                  <View key={i} style={styles.levelHistoryItem}>
                    <View style={styles.levelBadgeSmall}>
                      <Text style={styles.levelBadgeSmallText}>
                        {entry.event_type === 'analysis' ? entry.title.replace('Scored ', '') : '\u2605'}
                      </Text>
                    </View>
                    <View style={styles.levelHistoryInfo}>
                      <Text style={styles.levelHistoryMilestone}>
                        {entry.title}
                      </Text>
                      <Text style={styles.levelHistoryDate}>
                        {entry.subtitle} {'\u2022'} {new Date(entry.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        );

      case 'history':
        if (compareSelections.length === 2) {
          const sorted = [...compareSelections].sort(
            (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          );
          return (
            <ComparisonView
              entryA={sorted[0]}
              entryB={sorted[1]}
              onBack={() => {
                setCompareSelections([]);
                setCompareMode(false);
              }}
            />
          );
        }

        if (selectedEntry) {
          return (
            <View style={styles.section}>
              <TouchableOpacity
                style={styles.backRow}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedEntry(null);
                }}
              >
                <ArrowLeft size={18} color="#A1A1AA" />
                <Text style={styles.backText}>Back to History</Text>
              </TouchableOpacity>

              <Text style={styles.historyDetailMeta}>
                {new Date(selectedEntry.createdAt).toLocaleDateString('en-US', {
                  month: 'short', day: 'numeric', year: 'numeric',
                })}
                {' | '}
                {selectedEntry.singletColors.join(' & ')} singlet
              </Text>

              {selectedEntry.frameUris && selectedEntry.frameUris.length > 0 && (
                <View style={{ marginHorizontal: -24 }}>
                  <VideoReviewOverlay
                    frameUris={selectedEntry.frameUris}
                    frameTimestamps={selectedEntry.frameTimestamps}
                    videoUri={selectedEntry.videoUri}
                    result={selectedEntry.result}
                    singletColors={selectedEntry.singletColors}
                  />
                </View>
              )}

              <AnalysisResults
                result={selectedEntry.result}
                thumbnailUri={!selectedEntry.frameUris?.length ? (selectedEntry.thumbnailUri || null) : null}
                videoFileName={selectedEntry.videoFileName}
              />
            </View>
          );
        }

        return (
          <View style={styles.section}>
            <View style={styles.historyHeader}>
              <Text style={styles.sectionTitle}>
                LEVELUP ANALYSIS HISTORY ({history.length})
              </Text>
              {history.length >= 2 && (
                <TouchableOpacity
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setCompareMode(!compareMode);
                    setCompareSelections([]);
                  }}
                  style={[styles.compareToggle, compareMode && styles.compareToggleActive]}
                >
                  <Scale size={14} color={compareMode ? '#fff' : '#A1A1AA'} />
                  <Text style={[styles.compareToggleText, compareMode && styles.compareToggleTextActive]}>
                    {compareMode ? 'CANCEL' : 'COMPARE'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            {compareMode && (
              <Text style={styles.compareHint}>
                Select 2 analyses to compare ({compareSelections.length}/2)
              </Text>
            )}
            {history.length === 0 ? (
              <View style={styles.emptyState}>
                <History size={40} color="#52525B" />
                <Text style={styles.emptyText}>No analyses yet</Text>
                <Text style={styles.emptySubtext}>Upload a match video to see your history here</Text>
              </View>
            ) : (
              history.map((entry) => {
                const isSelected = compareSelections.some((e) => e.id === entry.id);
                return (
                  <TouchableOpacity
                    key={entry.id}
                    style={[
                      styles.historyCard,
                      compareMode && isSelected && styles.historyCardSelected,
                    ]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      if (compareMode) {
                        setCompareSelections((prev) => {
                          if (prev.find((e) => e.id === entry.id)) {
                            return prev.filter((e) => e.id !== entry.id);
                          }
                          if (prev.length >= 2) return prev;
                          return [...prev, entry];
                        });
                      } else {
                        setSelectedEntry(entry);
                      }
                    }}
                  >
                    {compareMode && (
                      <View style={[styles.compareCheck, isSelected && styles.compareCheckOn]}>
                        {isSelected && <Text style={styles.compareCheckMark}>{'\u2713'}</Text>}
                      </View>
                    )}
                    {entry.thumbnailUri ? (
                      <Image source={{ uri: entry.thumbnailUri }} style={styles.historyThumb} />
                    ) : (
                      <View style={[styles.historyThumb, styles.historyThumbPlaceholder]}>
                        <Video size={24} color="#52525B" />
                      </View>
                    )}
                    <View style={styles.historyInfo}>
                      <Text style={styles.historyName} numberOfLines={1}>
                        {entry.videoFileName}
                      </Text>
                      <Text style={styles.historyDate}>
                        {new Date(entry.createdAt).toLocaleDateString('en-US', {
                          month: 'short', day: 'numeric',
                        })}
                      </Text>
                      <View style={styles.historyColorRow}>
                        {entry.singletColors.map((c, i) => (
                          <View
                            key={i}
                            style={[styles.historyColorDot, { backgroundColor: COLOR_HEX_MAP[c] || '#71717A' }]}
                          />
                        ))}
                      </View>
                    </View>
                    <View style={styles.historyScoreWrap}>
                      <Text style={[styles.historyScore, { color: getScoreColor(entry.result.overall_score) }]}>
                        {entry.result.overall_score}
                      </Text>
                      {!compareMode && <ChevronRight size={16} color="#52525B" />}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        );

      case 'badges':
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              BADGES ({badgesEarned})
            </Text>
            {(!stats || stats.badges.length === 0) ? (
              <View style={styles.emptyState}>
                <Award size={40} color="#52525B" />
                <Text style={styles.emptyText}>No badges yet</Text>
                <Text style={styles.emptySubtext}>Earn badges by analyzing matches and improving your scores</Text>
              </View>
            ) : (
              <View style={styles.badgeGrid}>
                {stats.badges.map((badge, i) => (
                  <View key={i} style={styles.badgeCard}>
                    <View style={styles.badgeIconWrap}>
                      {getBadgeIcon(badge.badge_icon, '#E91E8C')}
                    </View>
                    <Text style={styles.badgeName}>{badge.badge_label}</Text>
                    {badge.awarded_at && (
                      <Text style={styles.badgeDate}>
                        {new Date(badge.awarded_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        );

      case 'settings':
        const settingsItems = [
          { icon: <User size={20} color="#A1A1AA" />, label: 'Edit Profile', route: '/profile/edit-profile' as const },
          { icon: <Bell size={20} color="#A1A1AA" />, label: 'Notifications', route: '/profile/notifications' as const },
          { icon: <Scale size={20} color="#A1A1AA" />, label: 'Weight Class', route: '/profile/weight-class' as const },
          { icon: <Users size={20} color="#A1A1AA" />, label: 'Club Settings', route: '/profile/club-settings' as const },
        ];
        return (
          <View style={styles.section}>
            {settingsItems.map((item, i) => (
              <TouchableOpacity
                key={i}
                style={styles.settingsItem}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push(item.route);
                }}
              >
                {item.icon}
                <Text style={styles.settingsLabel}>{item.label}</Text>
                <ChevronRight size={18} color="#52525B" />
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.signOutBtn}>
              <LogOut size={20} color="#EF4444" />
              <Text style={styles.signOutText}>Sign Out</Text>
            </TouchableOpacity>
          </View>
        );
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PROFILE</Text>
        </View>

        {/* Avatar + Info */}
        <View style={styles.profileSection}>
          <LinearGradient
            colors={['#2563EB', '#E91E8C']}
            style={styles.avatarBorder}
          >
            <View style={styles.avatarInner}>
              <Text style={styles.avatarText}>L</Text>
              <View style={styles.levelPip}>
                <Text style={styles.levelPipText}>{level}</Text>
              </View>
            </View>
          </LinearGradient>
          <Text style={styles.profileName}>Wrestler</Text>
          <Text style={styles.profileMeta}>
            Level {level} | {videoCount} videos analyzed
          </Text>
        </View>

        {/* XP Bar */}
        <View style={styles.xpSection}>
          <View style={styles.xpLabels}>
            <Text style={styles.xpLabel}>LEVEL {level}</Text>
            <Text style={styles.xpLabel}>
              {xpInLevel} / 500 XP
            </Text>
          </View>
          <View style={styles.xpBarBg}>
            <LinearGradient
              colors={['#2563EB', '#E91E8C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.xpBarFill, { width: `${xpPercent}%` as any }]}
            />
          </View>
        </View>

        {/* Quick Stats Row */}
        <View style={styles.quickStatsRow}>
          {[
            { icon: <Trophy size={16} color="#22C55E" />, value: record, label: 'Record' },
            { icon: <BarChart3 size={16} color="#2563EB" />, value: String(avgScore), label: 'Avg Score' },
            { icon: <Video size={16} color="#E91E8C" />, value: String(videoCount), label: 'Videos' },
            { icon: <Award size={16} color="#EAB308" />, value: String(badgesEarned), label: 'Badges' },
          ].map((stat, i) => (
            <View key={i} style={styles.quickStatCard}>
              {stat.icon}
              <Text style={styles.quickStatValue}>{stat.value}</Text>
              <Text style={styles.quickStatLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        {/* Tab Buttons */}
        <View style={styles.tabRow}>
          {(['stats', 'history', 'badges', 'settings'] as ProfileTab[]).map((t) => (
            <TouchableOpacity
              key={t}
              style={[styles.tabBtn, tab === t && styles.tabBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setTab(t);
                if (t !== 'history') setSelectedEntry(null);
              }}
            >
              <Text style={[styles.tabText, tab === t && styles.tabTextActive]}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Tab Content */}
        {renderTabContent()}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerTitle: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -1 },
  profileSection: { alignItems: 'center', marginTop: 24, gap: 6 },
  avatarBorder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarInner: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { fontSize: 36, fontWeight: '800', color: '#fff' },
  levelPip: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#2563EB',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#0A0A0A',
  },
  levelPipText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  profileName: { fontSize: 24, fontWeight: '800', color: '#fff', marginTop: 8 },
  profileMeta: { fontSize: 14, color: '#A1A1AA' },
  xpSection: { paddingHorizontal: 24, marginTop: 20 },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel: { fontSize: 11, color: '#A1A1AA', fontWeight: '600' },
  xpBarBg: {
    height: 10,
    backgroundColor: '#27272A',
    borderRadius: 5,
    overflow: 'hidden',
  },
  xpBarFill: { height: '100%', borderRadius: 5 },
  quickStatsRow: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 24,
    marginTop: 20,
  },
  quickStatCard: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    gap: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  quickStatValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  quickStatLabel: { fontSize: 9, color: '#71717A', fontWeight: '600', letterSpacing: 0.5 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 24,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 14,
    backgroundColor: '#18181B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  tabBtnActive: {
    backgroundColor: '#2563EB20',
    borderColor: '#2563EB',
  },
  tabText: { fontSize: 13, fontWeight: '700', color: '#71717A' },
  tabTextActive: { color: '#2563EB' },
  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  // History styles
  historyCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  historyThumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  historyThumbPlaceholder: {
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  historyInfo: { flex: 1 },
  historyName: { fontSize: 14, fontWeight: '700', color: '#E4E4E7' },
  historyDate: { fontSize: 12, color: '#71717A', marginTop: 2 },
  historyColorRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  historyColorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  historyScoreWrap: {
    alignItems: 'center',
    gap: 4,
  },
  historyScore: { fontSize: 28, fontWeight: '900' },
  backRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  backText: { fontSize: 14, color: '#A1A1AA', fontWeight: '600' },
  historyDetailMeta: {
    fontSize: 13,
    color: '#71717A',
    marginBottom: 8,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: { fontSize: 18, fontWeight: '700', color: '#52525B' },
  emptySubtext: { fontSize: 13, color: '#3F3F46', textAlign: 'center' },
  // Season stats
  seasonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  seasonCard: {
    width: '31%' as any,
    backgroundColor: '#18181B',
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  seasonValue: { fontSize: 22, fontWeight: '800' },
  seasonLabel: { fontSize: 10, color: '#71717A', fontWeight: '600', marginTop: 4 },
  // Score trend
  trendCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
  },
  trendLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 8,
  },
  trendLabel: { fontSize: 11, color: '#71717A', fontWeight: '600' },
  // Position progress
  positionProgressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  positionProgressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1,
    width: 80,
  },
  positionProgressScore: {
    fontSize: 24,
    fontWeight: '800',
    flex: 1,
  },
  positionProgressDelta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  positionProgressDeltaText: {
    fontSize: 14,
    fontWeight: '700',
  },
  // Focus areas
  focusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  focusItem: {
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: 'rgba(234, 179, 8, 0.2)',
  },
  focusText: { fontSize: 14, fontWeight: '600', color: '#E4E4E7', textTransform: 'capitalize' },
  focusCount: { fontSize: 11, color: '#71717A', marginTop: 4 },
  // Level history
  levelHistoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  levelBadgeSmall: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#2563EB20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  levelBadgeSmallText: { fontSize: 14, fontWeight: '800', color: '#2563EB' },
  levelHistoryInfo: { flex: 1 },
  levelHistoryMilestone: { fontSize: 14, fontWeight: '600', color: '#E4E4E7' },
  levelHistoryDate: { fontSize: 12, color: '#71717A', marginTop: 2 },
  // Badges
  badgeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  badgeCard: {
    width: '47%' as any,
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 6,
  },
  badgeIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeName: { fontSize: 14, fontWeight: '700', color: '#fff', textAlign: 'center' },
  badgeDate: { fontSize: 10, color: '#E91E8C', fontWeight: '600' },
  // Settings
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  settingsLabel: { flex: 1, fontSize: 15, fontWeight: '600', color: '#E4E4E7' },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    marginTop: 20,
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#EF444430',
  },
  signOutText: { fontSize: 15, fontWeight: '700', color: '#EF4444' },

  // Comparison mode
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  compareToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#27272A',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  compareToggleActive: {
    backgroundColor: '#2563EB',
  },
  compareToggleText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#A1A1AA',
    letterSpacing: 0.5,
  },
  compareToggleTextActive: {
    color: '#fff',
  },
  compareHint: {
    fontSize: 12,
    color: '#71717A',
    textAlign: 'center',
    marginBottom: 12,
  },
  historyCardSelected: {
    borderColor: '#2563EB',
    borderWidth: 2,
    backgroundColor: 'rgba(37, 99, 235, 0.08)',
  },
  compareCheck: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#52525B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  compareCheckOn: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  compareCheckMark: {
    fontSize: 13,
    fontWeight: '800',
    color: '#fff',
  },
});

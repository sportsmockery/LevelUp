import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import * as VideoThumbnails from 'expo-video-thumbnails';
import {
  readAsStringAsync,
  EncodingType,
  documentDirectory,
  makeDirectoryAsync,
} from 'expo-file-system/legacy';
import * as Network from 'expo-network';
import {
  Search,
  Video,
  Trophy,
  Target,
  ChevronRight,
  ChevronDown,
  X,
  Shield,
  AlertTriangle,
  Cpu,
  Upload,
  ChevronsUp,
  ChevronsDown,
  ArrowUp,
  ArrowDown,
  ArrowRight,
} from 'lucide-react-native';
import { useFocusEffect } from 'expo-router';
import { analyzeFrames, API_BASE } from '@/lib/api';
import { AnalysisResult, OpponentScoutingResult, MatchStyle, MatchHistoryEntry, OpponentSummary, SINGLET_COLORS } from '@/lib/types';
import { getScoreTrendIndicator } from '@/lib/score-comparison';

type ScoutWrestler = {
  name: string;
  school: string | null;
  weightClass: string | null;
  matchCount: number;
  wins: number;
  losses: number;
  avgScore: number;
  lastFacedDate: string;
};

const MATCH_STYLES: { label: string; value: MatchStyle }[] = [
  { label: 'Folkstyle', value: 'folkstyle' },
  { label: 'Freestyle', value: 'freestyle' },
  { label: 'Greco', value: 'grecoRoman' },
];

function formatMatchDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatResultMethod(match: MatchHistoryEntry): string {
  const parts: string[] = [];
  if (match.resultType) {
    const rt = match.resultType.toLowerCase();
    if (rt === 'pin' || rt === 'fall') {
      const dur = match.matchDurationSec ? `${Math.floor(match.matchDurationSec / 60)}:${String(match.matchDurationSec % 60).padStart(2, '0')}` : '';
      parts.push(`Pin${dur ? ` ${dur}` : ''}`);
    } else if (rt === 'tech_fall') {
      parts.push('Tech Fall');
    } else if (rt === 'major_decision') {
      parts.push('Major Dec');
    } else if (rt === 'decision') {
      parts.push('Decision');
    } else if (rt !== 'unknown') {
      parts.push(match.resultType);
    }
  }
  if (parts.length === 0 && match.matchResult) {
    return match.matchResult === 'win' ? 'W' : match.matchResult === 'loss' ? 'L' : match.matchResult;
  }
  return parts.join(' ');
}

function getResultLetter(match: MatchHistoryEntry): 'W' | 'L' | '-' {
  if (!match.matchResult) return '-';
  const r = match.matchResult.toLowerCase();
  if (r === 'win' || r === 'w') return 'W';
  if (r === 'loss' || r === 'l') return 'L';
  return '-';
}

export default function MatchesScreen() {
  const [tab, setTab] = useState<'log' | 'scout'>('log');
  const [search, setSearch] = useState('');
  const [selectedScout, setSelectedScout] = useState<ScoutWrestler | null>(null);

  // Real data state
  const [matches, setMatches] = useState<MatchHistoryEntry[]>([]);
  const [opponents, setOpponents] = useState<OpponentSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Grouping state
  const [groupByOpponent, setGroupByOpponent] = useState(false);
  const [expandedOpponents, setExpandedOpponents] = useState<Set<string>>(new Set());

  // Scouting video upload state
  const [scoutingVideo, setScoutingVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [scoutSingletColors, setScoutSingletColors] = useState<string[]>([]);
  const [scoutMatchStyle, setScoutMatchStyle] = useState<MatchStyle>('folkstyle');
  const [scoutAnalyzing, setScoutAnalyzing] = useState(false);
  const [scoutProgress, setScoutProgress] = useState(0);
  const [scoutStatusText, setScoutStatusText] = useState('');
  const [scoutResult, setScoutResult] = useState<AnalysisResult | null>(null);

  const fetchMatchHistory = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE}/api/match-history?limit=100`);
      const data = await res.json();
      setMatches(data.matches || []);
      setOpponents(data.opponents || []);
    } catch (err) {
      console.error('[LevelUp] Match history fetch error:', err);
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch match history on focus
  useFocusEffect(
    useCallback(() => {
      fetchMatchHistory();
    }, [fetchMatchHistory])
  );

  // Compute stats from real data
  const wins = matches.filter((m) => getResultLetter(m) === 'W').length;
  const losses = matches.filter((m) => getResultLetter(m) === 'L').length;
  // Average score only counts video-analyzed matches (not manual entries)
  const videoMatches = matches.filter((m) => !m.isManualEntry);
  const avgScore = videoMatches.length > 0
    ? Math.round(videoMatches.reduce((s, m) => s + m.overallScore, 0) / videoMatches.length)
    : 0;

  const filteredMatches = matches.filter(
    (m) =>
      (m.opponentName || '').toLowerCase().includes(search.toLowerCase()) ||
      (m.competitionName || '').toLowerCase().includes(search.toLowerCase())
  );

  // Compute score deltas for each match (matches are newest-first)
  // Video-only matches get deltas computed against the previous video match
  const matchDeltas = new Map<string, number | null>();
  const videoMatchesChron = matches.filter((m) => !m.isManualEntry).reverse();
  for (let i = 0; i < videoMatchesChron.length; i++) {
    const m = videoMatchesChron[i];
    if (i === 0) {
      matchDeltas.set(m.id, null); // first match
    } else {
      matchDeltas.set(m.id, m.overallScore - videoMatchesChron[i - 1].overallScore);
    }
  }

  const filteredScouts = opponents.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.school || '').toLowerCase().includes(search.toLowerCase())
  );

  // Group matches by opponent for "By Opponent" view
  const opponentGroups = new Map<string, { opponent: OpponentSummary; matches: MatchHistoryEntry[] }>();
  for (const m of filteredMatches) {
    const key = (m.opponentName || 'Unknown').toLowerCase().trim();
    const existing = opponentGroups.get(key);
    if (existing) {
      existing.matches.push(m);
    } else {
      const opp = opponents.find((o) => o.name.toLowerCase().trim() === key);
      opponentGroups.set(key, {
        opponent: opp || { name: m.opponentName || 'Unknown', school: m.opponentSchool, weightClass: m.weightClass, matchCount: 1, wins: 0, losses: 0, lastFacedDate: m.createdAt, avgScore: m.overallScore },
        matches: [m],
      });
    }
  }
  // Also include matches with no opponent in a catch-all
  const ungroupedMatches = filteredMatches.filter((m) => !m.opponentName);

  const toggleOpponentExpanded = (key: string) => {
    setExpandedOpponents((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const pickScoutingVideo = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: true,
      quality: 0.7,
    });
    if (!res.canceled && res.assets.length > 0) {
      setScoutingVideo(res.assets[0]);
      setScoutResult(null);
    }
  };

  const analyzeOpponent = async () => {
    if (!scoutingVideo || scoutSingletColors.length === 0) return;

    // Wi-Fi check
    try {
      const state = await Network.getNetworkStateAsync();
      if (state.type !== Network.NetworkStateType.WIFI) {
        Alert.alert('Wi-Fi Required', 'Video analysis requires a Wi-Fi connection.', [{ text: 'OK' }]);
        return;
      }
    } catch { /* allow on error */ }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setScoutAnalyzing(true);
    setScoutProgress(0);
    setScoutStatusText('Extracting opponent frames...');

    try {
      const durationMs = (scoutingVideo.duration || 60) * 1000;
      const durationSec = durationMs / 1000;
      const frameCount = Math.min(Math.max(Math.floor(durationSec / 5), 10), 25);

      // Simple evenly-spaced extraction for scouting
      const frames: string[] = [];
      const startMs = 500;
      const endMs = Math.max(durationMs - 500, startMs + 100);
      const step = (endMs - startMs) / (frameCount - 1 || 1);

      for (let i = 0; i < frameCount; i++) {
        const timeMs = Math.floor(startMs + step * i);
        setScoutProgress(Math.round((i / frameCount) * 50));
        setScoutStatusText(`Extracting frame ${i + 1}/${frameCount}...`);
        try {
          const { uri: thumbUri } = await VideoThumbnails.getThumbnailAsync(scoutingVideo.uri, {
            time: timeMs,
            quality: 0.85,
          });
          const base64 = await readAsStringAsync(thumbUri, { encoding: EncodingType.Base64 });
          frames.push(base64);
        } catch {
          // skip
        }
      }

      setScoutProgress(60);
      setScoutStatusText('LevelUp scouting opponent...');

      const data = await analyzeFrames(
        frames,
        scoutMatchStyle,
        'opponent',
      );

      setScoutProgress(100);
      setScoutStatusText('Scouting complete!');
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setScoutResult(data);
    } catch (err: any) {
      console.error('[LevelUp] Scout error:', err);
      setScoutStatusText(err?.message || 'Scouting failed.');
    } finally {
      setScoutAnalyzing(false);
    }
  };

  const resetScouting = () => {
    setScoutingVideo(null);
    setScoutSingletColors([]);
    setScoutMatchStyle('folkstyle');
    setScoutResult(null);
    setScoutProgress(0);
    setScoutStatusText('');
  };

  // Scout Report
  if (selectedScout) {
    const scouting = scoutResult?.scouting as OpponentScoutingResult | undefined;
    const displayStrengths = scouting
      ? scouting.attack_patterns.map((a) => `${a.technique} — ${a.setup} (${a.effectiveness})`)
      : [];
    const displayWeaknesses = scouting
      ? scouting.defense_patterns.map((d) => d.vulnerability)
      : [];

    return (
      <SafeAreaView style={styles.container}>
        <ScrollView showsVerticalScrollIndicator={false}>
          {/* Back */}
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setSelectedScout(null);
              resetScouting();
            }}
          >
            <X size={20} color="#A1A1AA" />
            <Text style={styles.backText}>Back to Scout List</Text>
          </TouchableOpacity>

          {/* Header */}
          <View style={styles.scoutHeader}>
            <LinearGradient
              colors={['#2563EB', '#E91E8C']}
              style={styles.scoutAvatar}
            >
              <View style={styles.scoutAvatarInner}>
                <Text style={styles.scoutInitial}>
                  {selectedScout.name.charAt(0)}
                </Text>
              </View>
            </LinearGradient>
            <Text style={styles.scoutName}>{selectedScout.name}</Text>
            <Text style={styles.scoutSchool}>
              {selectedScout.school || 'Unknown School'}{selectedScout.weightClass ? ` | ${selectedScout.weightClass}` : ''}
            </Text>
            <Text style={styles.scoutRecord}>Record vs. you: {selectedScout.wins}-{selectedScout.losses} ({selectedScout.matchCount} matches)</Text>
          </View>

          {/* Scout Score */}
          <View style={styles.scoutScoreSection}>
            <LinearGradient
              colors={['#2563EB', '#E91E8C']}
              style={styles.scoutScoreBadge}
            >
              <View style={styles.scoutScoreInner}>
                <Text style={styles.scoutScoreValue}>{selectedScout.avgScore}</Text>
              </View>
            </LinearGradient>
            <Text style={styles.scoutScoreLabel}>
              {scouting ? 'AI SCOUTING SCORE' : 'AVG SCORE VS THEM'}
            </Text>
          </View>

          {/* AI Scouting Profile (if available) */}
          {scouting && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Cpu size={16} color="#2563EB" />
                <Text style={[styles.sectionTitle, { color: '#2563EB' }]}>
                  AI SCOUTING PROFILE
                </Text>
              </View>
              <View style={styles.profileRow}>
                <View style={styles.profileItem}>
                  <Text style={styles.profileLabel}>Skill Level</Text>
                  <Text style={styles.profileValue}>{scouting.opponent_profile.estimated_skill_level}</Text>
                </View>
                <View style={styles.profileItem}>
                  <Text style={styles.profileLabel}>Style</Text>
                  <Text style={styles.profileValue}>{scouting.opponent_profile.primary_style}</Text>
                </View>
                <View style={styles.profileItem}>
                  <Text style={styles.profileLabel}>Stance</Text>
                  <Text style={styles.profileValue}>{scouting.opponent_profile.stance}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Their Strengths / Attack Patterns */}
          {displayStrengths.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Shield size={16} color="#22C55E" />
                <Text style={[styles.sectionTitle, { color: '#22C55E' }]}>
                  ATTACK PATTERNS
                </Text>
              </View>
              {displayStrengths.map((s, i) => (
                <View key={i} style={styles.scoutListItem}>
                  <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
                  <Text style={styles.scoutListText}>{s}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Attack These / Vulnerabilities */}
          {displayWeaknesses.length > 0 && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AlertTriangle size={16} color="#E91E8C" />
                <Text style={[styles.sectionTitle, { color: '#E91E8C' }]}>
                  VULNERABILITIES
                </Text>
              </View>
              {displayWeaknesses.map((w, i) => (
                <View key={i} style={styles.scoutListItem}>
                  <View style={[styles.dot, { backgroundColor: '#E91E8C' }]} />
                  <Text style={styles.scoutListText}>{w}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Gameplan (AI-generated) */}
          {scouting && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Target size={16} color="#F59E0B" />
                <Text style={[styles.sectionTitle, { color: '#F59E0B' }]}>
                  GAMEPLAN
                </Text>
              </View>
              <View style={styles.gameplanCard}>
                <Text style={styles.gameplanPeriod}>Period 1</Text>
                <Text style={styles.gameplanText}>{scouting.gameplan.period1}</Text>
              </View>
              <View style={styles.gameplanCard}>
                <Text style={styles.gameplanPeriod}>Period 2</Text>
                <Text style={styles.gameplanText}>{scouting.gameplan.period2}</Text>
              </View>
              <View style={styles.gameplanCard}>
                <Text style={styles.gameplanPeriod}>If Ahead</Text>
                <Text style={styles.gameplanText}>{scouting.gameplan.if_ahead}</Text>
              </View>
              <View style={styles.gameplanCard}>
                <Text style={styles.gameplanPeriod}>If Behind</Text>
                <Text style={styles.gameplanText}>{scouting.gameplan.if_behind}</Text>
              </View>
              <View style={styles.gameplanCard}>
                <Text style={styles.gameplanPeriod}>Key Techniques</Text>
                {scouting.gameplan.key_techniques.map((t, i) => (
                  <Text key={i} style={styles.gameplanTechnique}>{i + 1}. {t}</Text>
                ))}
              </View>
              {scouting.conditioning_indicators && (
                <View style={styles.gameplanCard}>
                  <Text style={styles.gameplanPeriod}>Conditioning</Text>
                  <Text style={styles.gameplanText}>{scouting.conditioning_indicators}</Text>
                </View>
              )}
            </View>
          )}

          {/* Upload Opponent Video */}
          <View style={styles.section}>
            {!scoutResult && !scoutAnalyzing && (
              <>
                {!scoutingVideo ? (
                  <TouchableOpacity style={styles.uploadOpponentBtn} onPress={pickScoutingVideo}>
                    <Upload size={20} color="#71717A" />
                    <Text style={styles.uploadOpponentText}>UPLOAD OPPONENT VIDEO</Text>
                  </TouchableOpacity>
                ) : (
                  <View>
                    <View style={styles.selectedVideoCard}>
                      <Video size={20} color="#2563EB" />
                      <Text style={styles.selectedVideoName} numberOfLines={1}>
                        {scoutingVideo.fileName || 'Opponent Video'}
                      </Text>
                      <TouchableOpacity onPress={() => setScoutingVideo(null)}>
                        <X size={16} color="#A1A1AA" />
                      </TouchableOpacity>
                    </View>

                    {/* Singlet color for opponent */}
                    <Text style={[styles.sectionLabel, { marginTop: 14 }]}>OPPONENT SINGLET</Text>
                    <View style={styles.colorGrid}>
                      {SINGLET_COLORS.map((c) => {
                        const selected = scoutSingletColors.includes(c.value);
                        return (
                          <TouchableOpacity
                            key={c.value}
                            style={[styles.colorChip, selected && styles.colorChipActive]}
                            onPress={() => {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              setScoutSingletColors((prev) =>
                                selected ? prev.filter((v) => v !== c.value) : [...prev, c.value]
                              );
                            }}
                          >
                            <View style={[styles.colorDot, { backgroundColor: c.hex }]} />
                            <Text style={[styles.colorLabel, selected && styles.colorLabelActive]}>
                              {c.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>

                    {/* Match style for scouting */}
                    {scoutSingletColors.length > 0 && (
                      <>
                        <Text style={[styles.sectionLabel, { marginTop: 14 }]}>MATCH STYLE</Text>
                        <View style={styles.styleRow}>
                          {MATCH_STYLES.map((s) => {
                            const active = scoutMatchStyle === s.value;
                            return (
                              <TouchableOpacity
                                key={s.value}
                                style={[styles.styleChip, active && styles.styleChipActive]}
                                onPress={() => {
                                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                  setScoutMatchStyle(s.value);
                                }}
                              >
                                <Text style={[styles.styleLabel, active && styles.styleLabelActive]}>{s.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      </>
                    )}

                    {/* Analyze opponent button */}
                    {scoutSingletColors.length > 0 && (
                      <TouchableOpacity onPress={analyzeOpponent} activeOpacity={0.85} style={{ marginTop: 14 }}>
                        <LinearGradient
                          colors={['#E91E8C', '#2563EB']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.gamePlanBtn}
                        >
                          <Cpu size={20} color="#fff" />
                          <Text style={styles.gamePlanText}>SCOUT WITH LEVELUP</Text>
                        </LinearGradient>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </>
            )}

            {/* Scouting progress */}
            {scoutAnalyzing && (
              <View style={styles.scoutProgressSection}>
                <ActivityIndicator size="small" color="#E91E8C" />
                <Text style={styles.scoutProgressText}>{scoutProgress}% — {scoutStatusText}</Text>
              </View>
            )}

            {/* Generate Game Plan (fallback when no AI scouting) */}
            {!scouting && !scoutingVideo && !scoutAnalyzing && (
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() =>
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy)
                }
              >
                <LinearGradient
                  colors={['#2563EB', '#E91E8C']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gamePlanBtn}
                >
                  <Cpu size={20} color="#fff" />
                  <Text style={styles.gamePlanText}>GENERATE GAME PLAN</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  // Render delta arrow icon
  const renderDeltaIcon = (delta: number | null) => {
    if (delta === null) return null;
    const indicator = getScoreTrendIndicator(delta);
    const size = 12;
    switch (indicator.icon) {
      case 'up-double': return <ChevronsUp size={size} color={indicator.color} />;
      case 'up': return <ArrowUp size={size} color={indicator.color} />;
      case 'down-double': return <ChevronsDown size={size} color={indicator.color} />;
      case 'down': return <ArrowDown size={size} color={indicator.color} />;
      default: return <ArrowRight size={size} color={indicator.color} />;
    }
  };

  // Render a single match card
  const renderMatchCard = (match: MatchHistoryEntry, indented?: boolean) => {
    const rl = getResultLetter(match);
    const delta = matchDeltas.get(match.id) ?? undefined;
    const hasDelta = delta !== undefined && !match.isManualEntry;
    const indicator = hasDelta ? getScoreTrendIndicator(delta) : null;
    return (
      <View
        key={match.id}
        style={[styles.matchCard, indented && styles.matchCardIndented]}
      >
        <View style={styles.matchLeft}>
          <View
            style={[
              styles.resultBadge,
              {
                backgroundColor: rl === 'W' ? '#22C55E20' : rl === 'L' ? '#EF444420' : '#71717A20',
              },
            ]}
          >
            <Text
              style={[
                styles.resultText,
                {
                  color: rl === 'W' ? '#22C55E' : rl === 'L' ? '#EF4444' : '#71717A',
                },
              ]}
            >
              {rl}
            </Text>
          </View>
          <View style={styles.matchInfo}>
            <Text style={styles.matchOpponent}>{match.opponentName || 'Unknown Opponent'}</Text>
            <View style={styles.matchMethodRow}>
              <Text style={styles.matchMethod}>
                {formatResultMethod(match)}
                {match.matchScoreDetail ? ` (${match.matchScoreDetail})` : ''}
              </Text>
              {match.isManualEntry && !match.hasVideo && (
                <View style={styles.manualBadge}>
                  <Text style={styles.manualBadgeText}>Manual</Text>
                </View>
              )}
              {match.isManualEntry && match.hasVideo && (
                <View style={styles.analyzedBadge}>
                  <Text style={styles.analyzedBadgeText}>Analyzed</Text>
                </View>
              )}
            </View>
            <Text style={styles.matchTournament}>
              {match.competitionName || match.matchStyle || ''}{match.competitionName ? ' | ' : ''}{formatMatchDate(match.createdAt)}
            </Text>
          </View>
        </View>
        <View style={styles.matchRight}>
          {!match.isManualEntry && (
            <Text style={styles.matchScore}>{match.overallScore}</Text>
          )}
          {hasDelta && indicator && (
            <View style={[styles.deltaBadge, { backgroundColor: indicator.bgColor }]}>
              {renderDeltaIcon(delta)}
              <Text style={[styles.deltaText, { color: indicator.color }]}>
                {delta !== null && delta > 0 ? `+${delta}` : delta !== null ? `${delta}` : ''}
              </Text>
            </View>
          )}
          {!hasDelta && match.hasVideo && <Video size={14} color="#2563EB" />}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>MATCHES</Text>
          <Text style={styles.headerSub}>Track & Scout</Text>
        </View>

        {/* Tabs */}
        <View style={styles.tabRow}>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'log' && styles.tabBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTab('log');
            }}
          >
            <Text
              style={[styles.tabText, tab === 'log' && styles.tabTextActive]}
            >
              Match Log
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tabBtn, tab === 'scout' && styles.tabBtnActive]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTab('scout');
            }}
          >
            <Text
              style={[styles.tabText, tab === 'scout' && styles.tabTextActive]}
            >
              Scout
            </Text>
          </TouchableOpacity>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <Search size={18} color="#71717A" />
          <TextInput
            style={styles.searchInput}
            placeholder={
              tab === 'log' ? 'Search matches...' : 'Search wrestlers...'
            }
            placeholderTextColor="#52525B"
            value={search}
            onChangeText={setSearch}
          />
        </View>

        {/* Loading state */}
        {loading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading matches...</Text>
          </View>
        )}

        {/* Error state */}
        {!loading && error && (
          <View style={styles.emptyContainer}>
            <AlertTriangle size={40} color="#EF4444" />
            <Text style={styles.emptyTitle}>{error}</Text>
            <Text style={styles.emptyText}>Check your connection and try again.</Text>
            <TouchableOpacity style={styles.retryBtn} onPress={fetchMatchHistory}>
              <Text style={styles.retryBtnText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {!loading && !error && tab === 'log' ? (
          <>
            {matches.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Video size={40} color="#3F3F46" />
                <Text style={styles.emptyTitle}>No matches yet</Text>
                <Text style={styles.emptyText}>Upload a video to get started.</Text>
              </View>
            ) : (
              <>
                {/* Season Summary */}
                <View style={styles.summaryRow}>
                  <View style={[styles.summaryCard, { borderColor: '#22C55E' }]}>
                    <Text style={[styles.summaryValue, { color: '#22C55E' }]}>
                      {wins}
                    </Text>
                    <Text style={styles.summaryLabel}>WINS</Text>
                  </View>
                  <View style={[styles.summaryCard, { borderColor: '#EF4444' }]}>
                    <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
                      {losses}
                    </Text>
                    <Text style={styles.summaryLabel}>LOSSES</Text>
                  </View>
                  <View style={[styles.summaryCard, { borderColor: '#2563EB' }]}>
                    <Text style={[styles.summaryValue, { color: '#2563EB' }]}>
                      {avgScore}
                    </Text>
                    <Text style={styles.summaryLabel}>AVG SCORE</Text>
                  </View>
                </View>

                {/* Grouping toggle */}
                <View style={styles.groupToggleRow}>
                  <TouchableOpacity
                    style={[styles.groupToggleBtn, !groupByOpponent && styles.groupToggleBtnActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGroupByOpponent(false);
                    }}
                  >
                    <Text style={[styles.groupToggleText, !groupByOpponent && styles.groupToggleTextActive]}>All Matches</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.groupToggleBtn, groupByOpponent && styles.groupToggleBtnActive]}
                    onPress={() => {
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setGroupByOpponent(true);
                    }}
                  >
                    <Text style={[styles.groupToggleText, groupByOpponent && styles.groupToggleTextActive]}>By Opponent</Text>
                  </TouchableOpacity>
                </View>

                {/* Match List */}
                <View style={styles.section}>
                  {groupByOpponent ? (
                    <>
                      {Array.from(opponentGroups.entries()).map(([key, group]) => {
                        const isExpanded = expandedOpponents.has(key);
                        const oppWins = group.matches.filter((m) => getResultLetter(m) === 'W').length;
                        const oppLosses = group.matches.filter((m) => getResultLetter(m) === 'L').length;
                        const oppAvg = Math.round(group.matches.reduce((s, m) => s + m.overallScore, 0) / group.matches.length);
                        return (
                          <View key={key}>
                            <TouchableOpacity
                              style={styles.opponentGroupHeader}
                              onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                toggleOpponentExpanded(key);
                              }}
                            >
                              <View style={styles.opponentGroupLeft}>
                                <Text style={styles.opponentGroupName}>
                                  {group.opponent.name} ({group.matches.length})
                                </Text>
                                <Text style={styles.opponentGroupRecord}>
                                  {oppWins}-{oppLosses} | Avg: {oppAvg}
                                </Text>
                              </View>
                              <ChevronDown
                                size={18}
                                color="#71717A"
                                style={isExpanded ? { transform: [{ rotate: '180deg' }] } : undefined}
                              />
                            </TouchableOpacity>
                            {isExpanded && group.matches.map((m) => renderMatchCard(m, true))}
                          </View>
                        );
                      })}
                      {ungroupedMatches.length > 0 && (
                        <View>
                          <View style={styles.opponentGroupHeader}>
                            <Text style={styles.opponentGroupName}>No Opponent Listed ({ungroupedMatches.length})</Text>
                          </View>
                          {ungroupedMatches.map((m) => renderMatchCard(m))}
                        </View>
                      )}
                    </>
                  ) : (
                    filteredMatches.map((match) => renderMatchCard(match))
                  )}
                </View>
              </>
            )}
          </>
        ) : !loading && !error && tab === 'scout' ? (
          <>
            {/* Scout List from real opponents */}
            <View style={styles.section}>
              {filteredScouts.length === 0 ? (
                <View style={styles.emptyContainer}>
                  <Target size={40} color="#3F3F46" />
                  <Text style={styles.emptyTitle}>No opponents yet</Text>
                  <Text style={styles.emptyText}>Upload a match video with an opponent name to build your scout list.</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.weightClassLabel}>OPPONENTS ({filteredScouts.length})</Text>
                  {filteredScouts.map((wrestler, i) => (
                    <TouchableOpacity
                      key={i}
                      style={styles.scoutCard}
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        setSelectedScout(wrestler);
                      }}
                    >
                      <View style={styles.scoutCardLeft}>
                        <View style={styles.scoutCardAvatar}>
                          <Text style={styles.scoutCardInitial}>
                            {wrestler.name.charAt(0)}
                          </Text>
                        </View>
                        <View>
                          <Text style={styles.scoutCardName}>{wrestler.name}</Text>
                          <Text style={styles.scoutCardSchool}>
                            {wrestler.school || 'Unknown'} | {wrestler.wins}-{wrestler.losses}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.scoutCardRight}>
                        <Text style={styles.scoutCardScore}>{wrestler.avgScore}</Text>
                        <ChevronRight size={16} color="#52525B" />
                      </View>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </View>
          </>
        ) : null}

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
  headerSub: { fontSize: 14, color: '#71717A', marginTop: 4 },
  tabRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 10,
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
  tabText: { fontSize: 14, fontWeight: '700', color: '#71717A' },
  tabTextActive: { color: '#2563EB' },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 24,
    marginTop: 16,
    backgroundColor: '#18181B',
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  searchInput: { flex: 1, fontSize: 14, color: '#fff' },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 14,
  },
  loadingText: { fontSize: 14, color: '#71717A' },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    paddingHorizontal: 40,
    gap: 10,
  },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#A1A1AA' },
  emptyText: { fontSize: 14, color: '#52525B', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
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
    borderWidth: 1,
  },
  summaryValue: { fontSize: 28, fontWeight: '800' },
  summaryLabel: { fontSize: 9, color: '#71717A', fontWeight: '700', marginTop: 4, letterSpacing: 1 },
  groupToggleRow: {
    flexDirection: 'row',
    paddingHorizontal: 24,
    marginTop: 16,
    gap: 8,
  },
  groupToggleBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#18181B',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  groupToggleBtnActive: {
    backgroundColor: '#2563EB20',
    borderColor: '#2563EB',
  },
  groupToggleText: { fontSize: 12, fontWeight: '700', color: '#71717A' },
  groupToggleTextActive: { color: '#2563EB' },
  section: { paddingHorizontal: 24, marginTop: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#A1A1AA',
    letterSpacing: 1.5,
    marginBottom: 8,
  },
  matchCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  matchCardIndented: {
    marginLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#2563EB',
  },
  matchLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  resultBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultText: { fontSize: 16, fontWeight: '800' },
  matchInfo: { flex: 1 },
  matchOpponent: { fontSize: 15, fontWeight: '700', color: '#fff' },
  matchMethod: { fontSize: 12, color: '#A1A1AA' },
  matchTournament: { fontSize: 11, color: '#52525B', marginTop: 2 },
  matchRight: { alignItems: 'flex-end', gap: 4 },
  matchScore: { fontSize: 20, fontWeight: '800', color: '#2563EB' },
  deltaBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  deltaText: { fontSize: 11, fontWeight: '700' },
  opponentGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1a1a2e',
    borderRadius: 12,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  opponentGroupLeft: { flex: 1 },
  opponentGroupName: { fontSize: 14, fontWeight: '700', color: '#E4E4E7' },
  opponentGroupRecord: { fontSize: 12, color: '#71717A', marginTop: 2 },
  weightClassLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  scoutCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  scoutCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  scoutCardAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoutCardInitial: { fontSize: 18, fontWeight: '700', color: '#fff' },
  scoutCardName: { fontSize: 15, fontWeight: '700', color: '#fff' },
  scoutCardSchool: { fontSize: 12, color: '#71717A', marginTop: 2 },
  scoutCardRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  scoutCardScore: { fontSize: 20, fontWeight: '800', color: '#E91E8C' },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 24,
    paddingTop: 16,
  },
  backText: { fontSize: 14, color: '#A1A1AA' },
  scoutHeader: { alignItems: 'center', marginTop: 24, gap: 6 },
  scoutAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoutAvatarInner: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoutInitial: { fontSize: 30, fontWeight: '800', color: '#fff' },
  scoutName: { fontSize: 24, fontWeight: '800', color: '#fff' },
  scoutSchool: { fontSize: 14, color: '#71717A' },
  scoutRecord: { fontSize: 14, color: '#A1A1AA', fontWeight: '600' },
  scoutScoreSection: { alignItems: 'center', marginTop: 24, gap: 10 },
  scoutScoreBadge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoutScoreInner: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#0A0A0A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoutScoreValue: { fontSize: 36, fontWeight: '900', color: '#fff' },
  scoutScoreLabel: { fontSize: 11, color: '#71717A', fontWeight: '700', letterSpacing: 2 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },
  sectionTitle: { fontSize: 13, fontWeight: '700', letterSpacing: 1.5 },
  scoutListItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 6 },
  scoutListText: { fontSize: 14, color: '#E4E4E7', flex: 1, lineHeight: 20 },
  recentResultItem: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  resultDot: { width: 8, height: 8, borderRadius: 4 },
  recentResultText: { fontSize: 14, color: '#A1A1AA' },
  gamePlanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 18,
    borderRadius: 20,
  },
  gamePlanText: { fontSize: 16, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  uploadOpponentBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#18181B',
    borderRadius: 16,
    paddingVertical: 16,
    borderWidth: 1.5,
    borderColor: '#27272A',
    borderStyle: 'dashed',
    marginBottom: 14,
  },
  uploadOpponentText: { fontSize: 14, fontWeight: '700', color: '#71717A', letterSpacing: 1 },
  selectedVideoCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: '#2563EB',
  },
  selectedVideoName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#E4E4E7' },
  colorGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  colorChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1.5,
    borderColor: '#27272A',
  },
  colorChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB15',
  },
  colorDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: '#3F3F46',
  },
  colorLabel: { fontSize: 12, fontWeight: '600', color: '#71717A' },
  colorLabelActive: { color: '#fff' },
  styleRow: {
    flexDirection: 'row',
    gap: 8,
  },
  styleChip: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 12,
    paddingVertical: 10,
    borderWidth: 1.5,
    borderColor: '#27272A',
  },
  styleChipActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB15',
  },
  styleLabel: { fontSize: 13, fontWeight: '700', color: '#71717A' },
  styleLabelActive: { color: '#fff' },
  profileRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  profileItem: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  profileLabel: { fontSize: 10, color: '#71717A', fontWeight: '700', letterSpacing: 1, marginBottom: 4 },
  profileValue: { fontSize: 13, color: '#E4E4E7', fontWeight: '600', textAlign: 'center' },
  gameplanCard: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  gameplanPeriod: { fontSize: 12, fontWeight: '700', color: '#F59E0B', letterSpacing: 1, marginBottom: 6 },
  gameplanText: { fontSize: 14, color: '#E4E4E7', lineHeight: 20 },
  gameplanTechnique: { fontSize: 14, color: '#E4E4E7', lineHeight: 22 },
  scoutProgressSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
  },
  scoutProgressText: { fontSize: 13, color: '#A1A1AA' },
  matchMethodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  manualBadge: {
    backgroundColor: '#3F3F4620',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  manualBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#71717A',
  },
  analyzedBadge: {
    backgroundColor: '#2563EB20',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  analyzedBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2563EB',
  },
});

import React, { useState } from 'react';
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
  X,
  Shield,
  AlertTriangle,
  Cpu,
  Upload,
} from 'lucide-react-native';
import { analyzeFrames } from '@/lib/api';
import { AnalysisResult, OpponentScoutingResult, MatchStyle, SINGLET_COLORS } from '@/lib/types';

type Match = {
  id: number;
  opponent: string;
  result: 'W' | 'L';
  method: string;
  techScore: number;
  tournament: string;
  date: string;
  hasVideo: boolean;
};

type ScoutWrestler = {
  id: number;
  name: string;
  school: string;
  weightClass: string;
  record: string;
  avgScore: number;
  strengths: string[];
  weaknesses: string[];
  recentResults: string[];
  scoutScore: number;
};

const MATCHES: Match[] = [
  { id: 1, opponent: 'Jake Martinez', result: 'W', method: 'Pin 2:34', techScore: 92, tournament: 'District Duals', date: 'Feb 8', hasVideo: true },
  { id: 2, opponent: 'Tyler Chen', result: 'W', method: 'Tech Fall 15-0', techScore: 88, tournament: 'District Duals', date: 'Feb 8', hasVideo: true },
  { id: 3, opponent: 'Marcus Brown', result: 'L', method: 'Dec 3-5', techScore: 71, tournament: 'Eagle Invitational', date: 'Feb 1', hasVideo: false },
  { id: 4, opponent: 'Ryan Kowalski', result: 'W', method: 'MD 12-4', techScore: 85, tournament: 'Eagle Invitational', date: 'Feb 1', hasVideo: true },
  { id: 5, opponent: 'Devin Park', result: 'W', method: 'Pin 1:47', techScore: 95, tournament: 'Quad Meet', date: 'Jan 25', hasVideo: false },
  { id: 6, opponent: 'Aiden Scott', result: 'L', method: 'Dec 2-4', techScore: 68, tournament: 'Quad Meet', date: 'Jan 25', hasVideo: true },
  { id: 7, opponent: 'Noah Williams', result: 'W', method: 'Dec 7-3', techScore: 79, tournament: 'Conference Duals', date: 'Jan 18', hasVideo: true },
  { id: 8, opponent: 'Ethan Rivera', result: 'W', method: 'Tech Fall 16-1', techScore: 91, tournament: 'Conference Duals', date: 'Jan 18', hasVideo: false },
];

const SCOUTS: ScoutWrestler[] = [
  {
    id: 1,
    name: 'Marcus Brown',
    school: 'Eastview High',
    weightClass: '126 lbs',
    record: '24-3',
    avgScore: 83,
    strengths: ['Strong single-leg finish', 'Excellent mat returns', 'Conditioning monster'],
    weaknesses: ['Vulnerable to front headlock', 'Weak on bottom — slow standup', 'Telegraphs shots from distance'],
    recentResults: ['W Pin vs. T. Adams (1:52)', 'W Dec 8-3 vs. R. Kim', 'L Dec 3-5 vs. D. Park'],
    scoutScore: 78,
  },
  {
    id: 2,
    name: 'Devin Park',
    school: 'Central Academy',
    weightClass: '126 lbs',
    record: '28-1',
    avgScore: 91,
    strengths: ['Elite scrambler', 'Heavy hands in ties', 'Cradle from top'],
    weaknesses: ['Can be leg-attacked from open space', 'Gives up underhooks in ties', 'Tires in 3rd period at high pace'],
    recentResults: ['W Pin vs. M. Brown (3:44)', 'W TF 17-2 vs. J. Lee', 'W Dec 6-4 vs. A. Scott'],
    scoutScore: 92,
  },
  {
    id: 3,
    name: 'Aiden Scott',
    school: 'Westfield Prep',
    weightClass: '126 lbs',
    record: '19-8',
    avgScore: 72,
    strengths: ['Good ankle pick', 'Solid base on bottom', 'Physical in ties'],
    weaknesses: ['Poor shot defense on feet', 'Slow to react on top', 'Low gas tank'],
    recentResults: ['L Dec 4-6 vs. D. Park', 'W Dec 5-2 vs. N. Williams', 'L Pin vs. T. Chen (2:11)'],
    scoutScore: 65,
  },
];

const MATCH_STYLES: { label: string; value: MatchStyle }[] = [
  { label: 'Folkstyle', value: 'folkstyle' },
  { label: 'Freestyle', value: 'freestyle' },
  { label: 'Greco', value: 'grecoRoman' },
];

export default function MatchesScreen() {
  const [tab, setTab] = useState<'log' | 'scout'>('log');
  const [search, setSearch] = useState('');
  const [selectedScout, setSelectedScout] = useState<ScoutWrestler | null>(null);

  // Scouting video upload state
  const [scoutingVideo, setScoutingVideo] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [scoutSingletColors, setScoutSingletColors] = useState<string[]>([]);
  const [scoutMatchStyle, setScoutMatchStyle] = useState<MatchStyle>('folkstyle');
  const [scoutAnalyzing, setScoutAnalyzing] = useState(false);
  const [scoutProgress, setScoutProgress] = useState(0);
  const [scoutStatusText, setScoutStatusText] = useState('');
  const [scoutResult, setScoutResult] = useState<AnalysisResult | null>(null);

  const wins = MATCHES.filter((m) => m.result === 'W').length;
  const losses = MATCHES.filter((m) => m.result === 'L').length;
  const avgScore = Math.round(MATCHES.reduce((s, m) => s + m.techScore, 0) / MATCHES.length);

  const filteredMatches = MATCHES.filter(
    (m) =>
      m.opponent.toLowerCase().includes(search.toLowerCase()) ||
      m.tournament.toLowerCase().includes(search.toLowerCase())
  );

  const filteredScouts = SCOUTS.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.school.toLowerCase().includes(search.toLowerCase())
  );

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
      : selectedScout.strengths;
    const displayWeaknesses = scouting
      ? scouting.defense_patterns.map((d) => d.vulnerability)
      : selectedScout.weaknesses;

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
              {selectedScout.school} | {selectedScout.weightClass}
            </Text>
            <Text style={styles.scoutRecord}>Record: {selectedScout.record}</Text>
          </View>

          {/* Scout Score */}
          <View style={styles.scoutScoreSection}>
            <LinearGradient
              colors={['#2563EB', '#E91E8C']}
              style={styles.scoutScoreBadge}
            >
              <View style={styles.scoutScoreInner}>
                <Text style={styles.scoutScoreValue}>{selectedScout.scoutScore}</Text>
              </View>
            </LinearGradient>
            <Text style={styles.scoutScoreLabel}>
              {scouting ? 'AI SCOUTING SCORE' : 'SCOUTING SCORE'}
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
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Shield size={16} color="#22C55E" />
              <Text style={[styles.sectionTitle, { color: '#22C55E' }]}>
                {scouting ? 'ATTACK PATTERNS' : 'THEIR STRENGTHS'}
              </Text>
            </View>
            {displayStrengths.map((s, i) => (
              <View key={i} style={styles.scoutListItem}>
                <View style={[styles.dot, { backgroundColor: '#22C55E' }]} />
                <Text style={styles.scoutListText}>{s}</Text>
              </View>
            ))}
          </View>

          {/* Attack These / Vulnerabilities */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <AlertTriangle size={16} color="#E91E8C" />
              <Text style={[styles.sectionTitle, { color: '#E91E8C' }]}>
                {scouting ? 'VULNERABILITIES' : 'ATTACK THESE'}
              </Text>
            </View>
            {displayWeaknesses.map((w, i) => (
              <View key={i} style={styles.scoutListItem}>
                <View style={[styles.dot, { backgroundColor: '#E91E8C' }]} />
                <Text style={styles.scoutListText}>{w}</Text>
              </View>
            ))}
          </View>

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

          {/* Recent Results */}
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: '#A1A1AA' }]}>
              RECENT RESULTS
            </Text>
            {selectedScout.recentResults.map((r, i) => (
              <View key={i} style={styles.recentResultItem}>
                <View
                  style={[
                    styles.resultDot,
                    {
                      backgroundColor: r.startsWith('W') ? '#22C55E' : '#EF4444',
                    },
                  ]}
                />
                <Text style={styles.recentResultText}>{r}</Text>
              </View>
            ))}
          </View>

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

        {tab === 'log' ? (
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

            {/* Match List */}
            <View style={styles.section}>
              {filteredMatches.map((match) => (
                <View key={match.id} style={styles.matchCard}>
                  <View style={styles.matchLeft}>
                    <View
                      style={[
                        styles.resultBadge,
                        {
                          backgroundColor:
                            match.result === 'W' ? '#22C55E20' : '#EF444420',
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultText,
                          {
                            color:
                              match.result === 'W' ? '#22C55E' : '#EF4444',
                          },
                        ]}
                      >
                        {match.result}
                      </Text>
                    </View>
                    <View style={styles.matchInfo}>
                      <Text style={styles.matchOpponent}>{match.opponent}</Text>
                      <Text style={styles.matchMethod}>{match.method}</Text>
                      <Text style={styles.matchTournament}>
                        {match.tournament} | {match.date}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.matchRight}>
                    <Text style={styles.matchScore}>{match.techScore}</Text>
                    {match.hasVideo && <Video size={14} color="#2563EB" />}
                  </View>
                </View>
              ))}
            </View>
          </>
        ) : (
          <>
            {/* Scout List */}
            <View style={styles.section}>
              <Text style={styles.weightClassLabel}>126 LBS WEIGHT CLASS</Text>
              {filteredScouts.map((wrestler) => (
                <TouchableOpacity
                  key={wrestler.id}
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
                        {wrestler.school} | {wrestler.record}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.scoutCardRight}>
                    <Text style={styles.scoutCardScore}>{wrestler.avgScore}</Text>
                    <ChevronRight size={16} color="#52525B" />
                  </View>
                </TouchableOpacity>
              ))}
            </View>
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
  matchMethod: { fontSize: 12, color: '#A1A1AA', marginTop: 2 },
  matchTournament: { fontSize: 11, color: '#52525B', marginTop: 2 },
  matchRight: { alignItems: 'flex-end', gap: 6 },
  matchScore: { fontSize: 20, fontWeight: '800', color: '#2563EB' },
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
});

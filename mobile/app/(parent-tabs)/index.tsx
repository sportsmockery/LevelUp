import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import {
  ChevronDown,
  Trophy,
  BarChart3,
  TrendingUp,
  Clock,
  Shield,
  AlertTriangle,
} from 'lucide-react-native';
import { useAuth } from '@/lib/auth';
import { API_BASE } from '@/lib/api';

type Connection = {
  connectionId: string;
  status: string;
  relationship: string;
  requestedAt: string;
  approvedAt: string | null;
  athlete: { id: string; name: string; club: string | null } | null;
  clubName: string | null;
};

type Match = {
  id: string;
  createdAt: string;
  opponentName: string | null;
  matchResult: string | null;
  resultType: string | null;
  overallScore: number;
  standing: number;
  top: number;
  bottom: number;
  competitionName: string | null;
  weightClass: string | null;
};

export default function ParentHomeScreen() {
  const { profile } = useAuth();
  const router = useRouter();

  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(true);
  const [connectionsError, setConnectionsError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [matches, setMatches] = useState<Match[]>([]);
  const [loadingMatches, setLoadingMatches] = useState(false);
  const [matchesError, setMatchesError] = useState<string | null>(null);

  const approvedConnections = connections.filter((c) => c.status === 'approved' && c.athlete);
  const pendingConnections = connections.filter((c) => c.status === 'pending');
  const selectedAthlete = approvedConnections.find((c) => c.athlete?.id === selectedAthleteId);

  const fetchConnections = useCallback(async () => {
    setConnectionsError(null);
    try {
      const res = await fetch(`${API_BASE}/api/family/connections`);
      const data = await res.json();
      setConnections(data.connections || []);

      const firstApproved = (data.connections || []).find(
        (c: Connection) => c.status === 'approved' && c.athlete,
      );
      if (firstApproved?.athlete && !selectedAthleteId) {
        setSelectedAthleteId(firstApproved.athlete.id);
      }
    } catch (err) {
      console.error('[LevelUp] Fetch connections error:', err);
      setConnectionsError('Failed to load athlete data');
    } finally {
      setLoadingConnections(false);
    }
  }, [selectedAthleteId]);

  useEffect(() => {
    fetchConnections();
  }, []);

  const fetchAthleteMatches = useCallback(async () => {
    if (!selectedAthleteId) return;
    setLoadingMatches(true);
    setMatchesError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/match-history?userId=${selectedAthleteId}&limit=10`,
      );
      const data = await res.json();
      setMatches(data.matches || []);
    } catch {
      setMatches([]);
      setMatchesError('Failed to load matches');
    } finally {
      setLoadingMatches(false);
    }
  }, [selectedAthleteId]);

  useEffect(() => {
    fetchAthleteMatches();
  }, [fetchAthleteMatches]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchConnections();
    if (selectedAthleteId) {
      try {
        const res = await fetch(
          `${API_BASE}/api/match-history?userId=${selectedAthleteId}&limit=10`,
        );
        const data = await res.json();
        setMatches(data.matches || []);
      } catch {
        // silent
      }
    }
    setRefreshing(false);
  }, [fetchConnections, selectedAthleteId]);

  const wins = matches.filter((m) => m.matchResult === 'win' || m.matchResult === 'W').length;
  const losses = matches.filter((m) => m.matchResult === 'loss' || m.matchResult === 'L').length;
  const avgScore =
    matches.length > 0
      ? Math.round(matches.reduce((sum, m) => sum + m.overallScore, 0) / matches.length)
      : 0;

  const parentName = profile?.full_name || 'Parent';

  if (loadingConnections) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <ActivityIndicator size="large" color="#2563EB" />
        </View>
      </SafeAreaView>
    );
  }

  if (connectionsError && connections.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerState}>
          <AlertTriangle size={40} color="#EF4444" />
          <Text style={styles.errorTitle}>{connectionsError}</Text>
          <Text style={styles.errorSubtext}>Check your connection and try again.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => { setLoadingConnections(true); fetchConnections(); }}>
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (approvedConnections.length === 0) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
        >
          <View style={styles.headerBar}>
            <Image
              source={require('@/assets/images/logo.png')}
              style={{ width: 120, height: 45 }}
              resizeMode="contain"
            />
          </View>

          <View style={styles.sectionPadded}>
            <Text style={styles.welcomeTitle}>Welcome, {parentName}</Text>
            <Text style={styles.welcomeSub}>
              You don&apos;t have any connected athletes yet.
            </Text>
          </View>

          {pendingConnections.length > 0 && (
            <View style={styles.sectionPadded}>
              <Text style={styles.sectionLabel}>PENDING CONNECTIONS</Text>
              {pendingConnections.map((conn) => (
                <View key={conn.connectionId} style={styles.pendingCard}>
                  <View style={styles.pendingAvatar}>
                    <Clock size={20} color="#71717A" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.pendingName}>
                      {conn.clubName || 'Club Connection'}
                    </Text>
                    <Text style={styles.pendingDate}>
                      Requested {new Date(conn.requestedAt).toLocaleDateString()}
                    </Text>
                  </View>
                  <View style={styles.pendingBadge}>
                    <Text style={styles.pendingBadgeText}>Waiting</Text>
                  </View>
                </View>
              ))}
            </View>
          )}

          {pendingConnections.length === 0 && (
            <View style={styles.emptyCard}>
              <Shield size={48} color="#3F3F46" />
              <Text style={styles.emptyText}>
                Ask your athlete&apos;s coach for an invite link to connect your account.
              </Text>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        {/* Header */}
        <View style={styles.headerBar}>
          <View>
            <Text style={styles.headerTitle}>Parent Dashboard</Text>
            <Text style={styles.headerSub}>{parentName}</Text>
          </View>
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 80, height: 30 }}
            resizeMode="contain"
          />
        </View>

        {/* Athlete Switcher */}
        {approvedConnections.length > 1 && (
          <View style={styles.switcherContainer}>
            <TouchableOpacity
              style={styles.switcherButton}
              onPress={() => setDropdownOpen(!dropdownOpen)}
              activeOpacity={0.7}
            >
              <View style={styles.switcherLeft}>
                <LinearGradient
                  colors={['#2563EB', '#E91E8C']}
                  style={styles.avatarGradient}
                >
                  <View style={styles.avatarInner}>
                    <Text style={styles.avatarText}>
                      {(selectedAthlete?.athlete?.name || '?')[0]}
                    </Text>
                  </View>
                </LinearGradient>
                <Text style={styles.switcherName}>{selectedAthlete?.athlete?.name}</Text>
              </View>
              <ChevronDown
                size={18}
                color="#71717A"
                style={dropdownOpen ? { transform: [{ rotate: '180deg' }] } : undefined}
              />
            </TouchableOpacity>

            {dropdownOpen && (
              <View style={styles.dropdown}>
                {approvedConnections.map((conn) => (
                  <TouchableOpacity
                    key={conn.connectionId}
                    style={[
                      styles.dropdownItem,
                      conn.athlete?.id === selectedAthleteId && styles.dropdownItemActive,
                    ]}
                    onPress={() => {
                      setSelectedAthleteId(conn.athlete!.id);
                      setDropdownOpen(false);
                    }}
                  >
                    <LinearGradient
                      colors={['#2563EB', '#E91E8C']}
                      style={styles.dropdownAvatar}
                    >
                      <View style={styles.dropdownAvatarInner}>
                        <Text style={styles.dropdownAvatarText}>
                          {(conn.athlete?.name || '?')[0]}
                        </Text>
                      </View>
                    </LinearGradient>
                    <Text
                      style={[
                        styles.dropdownName,
                        conn.athlete?.id === selectedAthleteId && { color: '#2563EB' },
                      ]}
                    >
                      {conn.athlete?.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        )}

        {/* Athlete Info Card */}
        <View style={styles.sectionPadded}>
          <View style={styles.athleteCard}>
            <View style={styles.athleteHeader}>
              <LinearGradient
                colors={['#2563EB', '#E91E8C']}
                style={styles.athleteAvatarGradient}
              >
                <View style={styles.athleteAvatarInner}>
                  <Text style={styles.athleteAvatarText}>
                    {(selectedAthlete?.athlete?.name || '?')[0]}
                  </Text>
                </View>
              </LinearGradient>
              <View>
                <Text style={styles.athleteName}>{selectedAthlete?.athlete?.name}</Text>
                {selectedAthlete?.athlete?.club && (
                  <Text style={styles.athleteClub}>{selectedAthlete.athlete.club}</Text>
                )}
              </View>
            </View>

            {/* Quick Stats */}
            <View style={styles.statsGrid}>
              <View style={styles.statCard}>
                <Trophy size={14} color="#EAB308" />
                <Text style={styles.statValue}>
                  {wins}-{losses}
                </Text>
                <Text style={styles.statLabel}>RECORD</Text>
              </View>
              <View style={styles.statCard}>
                <BarChart3 size={14} color="#2563EB" />
                <Text style={styles.statValue}>{avgScore}</Text>
                <Text style={styles.statLabel}>AVG SCORE</Text>
              </View>
              <View style={styles.statCard}>
                <TrendingUp size={14} color="#22C55E" />
                <Text style={styles.statValue}>{matches.length}</Text>
                <Text style={styles.statLabel}>MATCHES</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Recent Matches */}
        <View style={styles.sectionPadded}>
          <Text style={styles.sectionLabel}>RECENT MATCHES</Text>

          {loadingMatches ? (
            <View style={{ paddingVertical: 32, alignItems: 'center' }}>
              <ActivityIndicator size="small" color="#2563EB" />
            </View>
          ) : matchesError ? (
            <View style={styles.emptyMatchCard}>
              <AlertTriangle size={24} color="#EF4444" />
              <Text style={styles.emptyMatchText}>{matchesError}</Text>
              <TouchableOpacity
                style={styles.retryBtnSmall}
                onPress={fetchAthleteMatches}
              >
                <Text style={styles.retryBtnSmallText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.emptyMatchCard}>
              <Text style={styles.emptyMatchText}>No matches recorded yet.</Text>
            </View>
          ) : (
            matches.slice(0, 5).map((match) => {
              const isWin = match.matchResult === 'win' || match.matchResult === 'W';
              const isLoss = match.matchResult === 'loss' || match.matchResult === 'L';
              return (
                <View key={match.id} style={styles.matchCard}>
                  <View style={styles.matchRow}>
                    <View
                      style={[
                        styles.resultBadge,
                        isWin && styles.resultWin,
                        isLoss && styles.resultLoss,
                      ]}
                    >
                      <Text
                        style={[
                          styles.resultText,
                          isWin && { color: '#22C55E' },
                          isLoss && { color: '#EF4444' },
                        ]}
                      >
                        {isWin ? 'W' : isLoss ? 'L' : '—'}
                      </Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.opponentName}>
                        {match.opponentName || 'Unknown Opponent'}
                      </Text>
                      <Text style={styles.matchMeta}>
                        {new Date(match.createdAt).toLocaleDateString()}
                        {match.competitionName ? ` · ${match.competitionName}` : ''}
                      </Text>
                    </View>
                    <View style={styles.scoreBox}>
                      <Text style={styles.scoreValue}>{match.overallScore}</Text>
                      <Text style={styles.scoreLabel}>SCORE</Text>
                    </View>
                  </View>

                  <View style={styles.positionRow}>
                    <View style={styles.positionCard}>
                      <Text style={styles.positionValue}>{match.standing}</Text>
                      <Text style={styles.positionLabel}>STAND</Text>
                    </View>
                    <View style={styles.positionCard}>
                      <Text style={styles.positionValue}>{match.top}</Text>
                      <Text style={styles.positionLabel}>TOP</Text>
                    </View>
                    <View style={styles.positionCard}>
                      <Text style={styles.positionValue}>{match.bottom}</Text>
                      <Text style={styles.positionLabel}>BOTTOM</Text>
                    </View>
                  </View>
                </View>
              );
            })
          )}

          {matches.length > 5 && (
            <TouchableOpacity
              style={styles.viewAllBtn}
              onPress={() => router.push('/(parent-tabs)/matches')}
            >
              <Text style={styles.viewAllText}>View All Matches</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Pending Connections */}
        {pendingConnections.length > 0 && (
          <View style={styles.sectionPadded}>
            <Text style={styles.sectionLabel}>PENDING CONNECTIONS</Text>
            {pendingConnections.map((conn) => (
              <View key={conn.connectionId} style={styles.pendingCard}>
                <View style={styles.pendingAvatar}>
                  <Clock size={20} color="#71717A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.pendingName}>
                    {conn.clubName || 'Club Connection'}
                  </Text>
                  <Text style={styles.pendingDate}>
                    Requested {new Date(conn.requestedAt).toLocaleDateString()}
                  </Text>
                </View>
                <View style={styles.pendingBadge}>
                  <Text style={styles.pendingBadgeText}>Pending</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  centerState: { flex: 1, alignItems: 'center', justifyContent: 'center' },

  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#71717A', marginTop: 2 },

  welcomeTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
  welcomeSub: { fontSize: 14, color: '#71717A' },

  sectionPadded: { paddingHorizontal: 24, marginTop: 20 },
  sectionLabel: { fontSize: 11, fontWeight: '600', color: '#71717A', marginBottom: 12 },

  // Athlete Switcher
  switcherContainer: { paddingHorizontal: 24, marginTop: 16 },
  switcherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  switcherLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatarGradient: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 28, height: 28, borderRadius: 14, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 12, fontWeight: '800', color: '#fff' },
  switcherName: { fontSize: 15, fontWeight: '700', color: '#fff' },

  dropdown: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemActive: { backgroundColor: 'rgba(37, 99, 235, 0.1)' },
  dropdownAvatar: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  dropdownAvatarInner: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  dropdownAvatarText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  dropdownName: { fontSize: 14, fontWeight: '600', color: '#E4E4E7' },

  // Athlete Card
  athleteCard: { backgroundColor: '#18181B', borderRadius: 20, padding: 20 },
  athleteHeader: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 16 },
  athleteAvatarGradient: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  athleteAvatarInner: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  athleteAvatarText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  athleteName: { fontSize: 18, fontWeight: '800', color: '#fff' },
  athleteClub: { fontSize: 13, color: '#71717A', marginTop: 2 },

  // Stats Grid
  statsGrid: { flexDirection: 'row', gap: 10 },
  statCard: {
    flex: 1,
    backgroundColor: '#27272A',
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: 'center',
    gap: 4,
  },
  statValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 9, fontWeight: '600', color: '#71717A' },

  // Match Cards
  matchCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
  },
  matchRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  resultBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultWin: { backgroundColor: 'rgba(34, 197, 94, 0.1)' },
  resultLoss: { backgroundColor: 'rgba(239, 68, 68, 0.1)' },
  resultText: { fontSize: 13, fontWeight: '800', color: '#71717A' },
  opponentName: { fontSize: 14, fontWeight: '700', color: '#fff' },
  matchMeta: { fontSize: 11, color: '#71717A', marginTop: 2 },
  scoreBox: { alignItems: 'center' },
  scoreValue: { fontSize: 18, fontWeight: '800', color: '#fff' },
  scoreLabel: { fontSize: 9, fontWeight: '600', color: '#71717A' },

  positionRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  positionCard: {
    flex: 1,
    backgroundColor: '#27272A',
    borderRadius: 10,
    paddingVertical: 6,
    alignItems: 'center',
  },
  positionValue: { fontSize: 12, fontWeight: '700', color: '#E4E4E7' },
  positionLabel: { fontSize: 8, fontWeight: '600', color: '#71717A', marginTop: 1 },

  viewAllBtn: {
    backgroundColor: '#18181B',
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  viewAllText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },

  // Empty & Pending states
  emptyCard: {
    marginHorizontal: 24,
    marginTop: 32,
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: { fontSize: 14, color: '#71717A', textAlign: 'center', lineHeight: 20 },
  emptyMatchCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyMatchText: { fontSize: 14, color: '#71717A' },

  // Error & retry
  errorTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 12 },
  errorSubtext: { fontSize: 14, color: '#71717A', textAlign: 'center' },
  retryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 8,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
  retryBtnSmall: {
    backgroundColor: '#2563EB',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  retryBtnSmallText: { fontSize: 12, fontWeight: '700', color: '#fff' },

  pendingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 12,
  },
  pendingAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pendingName: { fontSize: 14, fontWeight: '600', color: '#E4E4E7' },
  pendingDate: { fontSize: 11, color: '#71717A', marginTop: 2 },
  pendingBadge: {
    backgroundColor: 'rgba(234, 179, 8, 0.1)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  pendingBadgeText: { fontSize: 11, fontWeight: '600', color: '#EAB308' },
});

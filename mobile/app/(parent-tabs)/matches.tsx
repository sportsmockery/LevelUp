import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ChevronDown, AlertTriangle } from 'lucide-react-native';
import { API_BASE } from '@/lib/api';

type Connection = {
  connectionId: string;
  status: string;
  athlete: { id: string; name: string; club: string | null } | null;
};

type Match = {
  id: string;
  createdAt: string;
  opponentName: string | null;
  opponentSchool: string | null;
  matchResult: string | null;
  resultType: string | null;
  winLossType: string | null;
  overallScore: number;
  standing: number;
  top: number;
  bottom: number;
  competitionName: string | null;
  weightClass: string | null;
  matchScoreDetail: string | null;
};

export default function ParentMatchesScreen() {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [selectedAthleteId, setSelectedAthleteId] = useState<string | null>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const approvedConnections = connections.filter((c) => c.status === 'approved' && c.athlete);
  const selectedAthlete = approvedConnections.find((c) => c.athlete?.id === selectedAthleteId);

  useEffect(() => {
    async function fetchConnections() {
      try {
        const res = await fetch(`${API_BASE}/api/family/connections`);
        const data = await res.json();
        const conns = data.connections || [];
        setConnections(conns);

        const first = conns.find(
          (c: Connection) => c.status === 'approved' && c.athlete,
        );
        if (first?.athlete) {
          setSelectedAthleteId(first.athlete.id);
        }
      } catch (err) {
        console.error('[LevelUp] Fetch connections error:', err);
      }
    }
    fetchConnections();
  }, []);

  const fetchMatches = useCallback(async () => {
    if (!selectedAthleteId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/match-history?userId=${selectedAthleteId}&limit=100`,
      );
      const data = await res.json();
      setMatches(data.matches || []);
    } catch {
      setMatches([]);
      setError('Failed to load matches');
    } finally {
      setLoading(false);
    }
  }, [selectedAthleteId]);

  useEffect(() => {
    if (selectedAthleteId) fetchMatches();
  }, [selectedAthleteId, fetchMatches]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchMatches();
    setRefreshing(false);
  }, [fetchMatches]);

  const wins = matches.filter((m) => m.matchResult === 'win' || m.matchResult === 'W').length;
  const losses = matches.filter((m) => m.matchResult === 'loss' || m.matchResult === 'L').length;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#2563EB" />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Match History</Text>
          {approvedConnections.length > 0 && (
            <Text style={styles.headerSub}>
              {wins}W - {losses}L · {matches.length} matches
            </Text>
          )}
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

        {/* Match List */}
        <View style={styles.sectionPadded}>
          {loading ? (
            <View style={{ paddingVertical: 60, alignItems: 'center' }}>
              <ActivityIndicator size="large" color="#2563EB" />
            </View>
          ) : error ? (
            <View style={styles.errorCard}>
              <AlertTriangle size={32} color="#EF4444" />
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryBtn} onPress={fetchMatches}>
                <Text style={styles.retryBtnText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : matches.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyText}>No matches recorded yet.</Text>
            </View>
          ) : (
            matches.map((match) => {
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
                      {match.opponentSchool && (
                        <Text style={styles.matchMeta}>{match.opponentSchool}</Text>
                      )}
                    </View>
                    <View style={styles.scoreBox}>
                      <Text style={styles.scoreValue}>{match.overallScore}</Text>
                      <Text style={styles.scoreLabel}>SCORE</Text>
                    </View>
                  </View>

                  {/* Result details */}
                  {(match.winLossType || match.matchScoreDetail) && (
                    <View style={styles.detailRow}>
                      {match.winLossType && (
                        <View style={styles.detailChip}>
                          <Text style={styles.detailChipText}>{match.winLossType}</Text>
                        </View>
                      )}
                      {match.matchScoreDetail && (
                        <View style={styles.detailChip}>
                          <Text style={styles.detailChipText}>{match.matchScoreDetail}</Text>
                        </View>
                      )}
                      {match.weightClass && (
                        <View style={styles.detailChip}>
                          <Text style={styles.detailChipText}>{match.weightClass}</Text>
                        </View>
                      )}
                    </View>
                  )}

                  {/* Position breakdown */}
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
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },

  header: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  headerTitle: { fontSize: 20, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: 13, color: '#71717A', marginTop: 4 },

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
  avatarGradient: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  avatarInner: { width: 24, height: 24, borderRadius: 12, backgroundColor: '#0A0A0A', alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 10, fontWeight: '800', color: '#fff' },
  switcherName: { fontSize: 14, fontWeight: '700', color: '#fff' },

  dropdown: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#27272A',
    marginTop: 4,
    overflow: 'hidden',
  },
  dropdownItem: { paddingHorizontal: 16, paddingVertical: 12 },
  dropdownItemActive: { backgroundColor: 'rgba(37, 99, 235, 0.1)' },
  dropdownName: { fontSize: 14, fontWeight: '600', color: '#E4E4E7' },

  sectionPadded: { paddingHorizontal: 24, marginTop: 20 },

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

  detailRow: { flexDirection: 'row', gap: 6, marginTop: 10, flexWrap: 'wrap' },
  detailChip: {
    backgroundColor: '#27272A',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  detailChipText: { fontSize: 10, fontWeight: '600', color: '#A1A1AA' },

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

  emptyCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
  },
  emptyText: { fontSize: 14, color: '#71717A' },
  errorCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    gap: 10,
  },
  errorText: { fontSize: 14, color: '#71717A' },
  retryBtn: {
    backgroundColor: '#2563EB',
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  retryBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});

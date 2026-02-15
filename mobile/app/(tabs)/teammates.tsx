import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  Users,
  Search,
  Shield,
  Trophy,
  ChevronRight,
  Crown,
  Flame,
  Award,
} from 'lucide-react-native';

type Teammate = {
  id: string;
  name: string;
  age: number;
  weight: number;
  level: number;
  xp: number;
  role: 'athlete' | 'coach';
  streak: number;
  record: string;
};

const MOCK_TEAMMATES: Teammate[] = [
  { id: '1', name: 'Marcus Johnson', age: 12, weight: 95, level: 15, xp: 3200, role: 'athlete', streak: 12, record: '18-4' },
  { id: '2', name: 'Tyler Smith', age: 11, weight: 85, level: 11, xp: 2100, role: 'athlete', streak: 5, record: '12-6' },
  { id: '3', name: 'Jake Williams', age: 13, weight: 110, level: 18, xp: 4500, role: 'athlete', streak: 22, record: '24-2' },
  { id: '4', name: 'Ethan Brown', age: 10, weight: 72, level: 8, xp: 1400, role: 'athlete', streak: 3, record: '8-8' },
  { id: '5', name: 'Noah Davis', age: 14, weight: 126, level: 20, xp: 5800, role: 'athlete', streak: 30, record: '28-1' },
  { id: '6', name: 'Coach Mike Rivera', age: 0, weight: 0, level: 0, xp: 0, role: 'coach', streak: 0, record: '' },
  { id: '7', name: 'Liam Garcia', age: 11, weight: 90, level: 9, xp: 1650, role: 'athlete', streak: 7, record: '10-5' },
  { id: '8', name: 'Mason Clark', age: 12, weight: 100, level: 13, xp: 2800, role: 'athlete', streak: 9, record: '15-3' },
];

const CLUB_NAME = 'Ironside Wrestling Club';
const CLUB_CODE = 'IRON-2024';

export default function TeammatesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'roster' | 'leaderboard'>('roster');

  const athletes = MOCK_TEAMMATES.filter(t => t.role === 'athlete');
  const coaches = MOCK_TEAMMATES.filter(t => t.role === 'coach');

  const filteredAthletes = athletes.filter(a =>
    a.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const leaderboard = [...athletes].sort((a, b) => b.xp - a.xp);

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.clubName}>{CLUB_NAME}</Text>
            <Text style={styles.clubMeta}>
              {athletes.length} wrestlers | Code: {CLUB_CODE}
            </Text>
          </View>
          <View style={styles.clubBadge}>
            <Shield size={20} color="#2563EB" />
          </View>
        </View>

        {/* Tabs */}
        <View style={styles.tabBar}>
          {(['roster', 'leaderboard'] as const).map(tab => (
            <TouchableOpacity
              key={tab}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab(tab);
              }}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}
              >
                {tab === 'roster' ? 'Roster' : 'Leaderboard'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {activeTab === 'roster' ? (
          <>
            {/* Search */}
            <View style={styles.searchContainer}>
              <Search size={18} color="#A1A1AA" />
              <TextInput
                style={styles.searchInput}
                placeholder="Search teammates..."
                placeholderTextColor="#71717A"
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>

            {/* Coaches */}
            {coaches.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Coaches</Text>
                {coaches.map(coach => (
                  <View key={coach.id} style={styles.coachCard}>
                    <LinearGradient
                      colors={['#2563EB', '#E91E8C']}
                      style={styles.avatarGradient}
                    >
                      <View style={styles.avatarInner}>
                        <Crown size={20} color="#E91E8C" />
                      </View>
                    </LinearGradient>
                    <View style={styles.memberInfo}>
                      <Text style={styles.memberName}>{coach.name}</Text>
                      <Text style={styles.memberMeta}>Head Coach</Text>
                    </View>
                    <ChevronRight size={18} color="#71717A" />
                  </View>
                ))}
              </View>
            )}

            {/* Athletes */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                Athletes ({filteredAthletes.length})
              </Text>
              {filteredAthletes.map(athlete => (
                <TouchableOpacity
                  key={athlete.id}
                  style={styles.athleteCard}
                  onPress={() =>
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                  }
                  activeOpacity={0.7}
                >
                  <View style={styles.avatarCircle}>
                    <Text style={styles.avatarText}>
                      {getInitials(athlete.name)}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <Text style={styles.memberName}>{athlete.name}</Text>
                    <Text style={styles.memberMeta}>
                      {athlete.age}yo | {athlete.weight} lbs | {athlete.record}
                    </Text>
                  </View>
                  <View style={styles.levelPill}>
                    <Text style={styles.levelPillText}>Lv {athlete.level}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        ) : (
          /* Leaderboard */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>XP Leaderboard</Text>
            {leaderboard.map((athlete, index) => (
              <View key={athlete.id} style={styles.leaderRow}>
                <View style={styles.rankContainer}>
                  {index < 3 ? (
                    <LinearGradient
                      colors={
                        index === 0
                          ? ['#F59E0B', '#EAB308']
                          : index === 1
                          ? ['#94A3B8', '#CBD5E1']
                          : ['#D97706', '#B45309']
                      }
                      style={styles.rankBadge}
                    >
                      <Text style={styles.rankText}>{index + 1}</Text>
                    </LinearGradient>
                  ) : (
                    <View style={styles.rankPlain}>
                      <Text style={styles.rankTextPlain}>{index + 1}</Text>
                    </View>
                  )}
                </View>
                <View style={styles.avatarCircle}>
                  <Text style={styles.avatarText}>
                    {getInitials(athlete.name)}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={styles.memberName}>{athlete.name}</Text>
                  <View style={styles.xpRow}>
                    <Flame size={12} color="#E91E8C" />
                    <Text style={styles.xpText}>
                      {athlete.xp.toLocaleString()} XP
                    </Text>
                    <Text style={styles.streakText}>
                      {athlete.streak}d streak
                    </Text>
                  </View>
                </View>
                <View style={styles.levelPill}>
                  <Text style={styles.levelPillText}>Lv {athlete.level}</Text>
                </View>
              </View>
            ))}

            {/* Team Stats */}
            <View style={styles.teamStatsCard}>
              <Text style={styles.teamStatsTitle}>Team Stats</Text>
              <View style={styles.teamStatsGrid}>
                <View style={styles.teamStat}>
                  <Trophy size={18} color="#F59E0B" />
                  <Text style={styles.teamStatValue}>
                    {athletes.reduce((a, b) => a + b.xp, 0).toLocaleString()}
                  </Text>
                  <Text style={styles.teamStatLabel}>Total XP</Text>
                </View>
                <View style={styles.teamStat}>
                  <Flame size={18} color="#E91E8C" />
                  <Text style={styles.teamStatValue}>
                    {Math.round(
                      athletes.reduce((a, b) => a + b.streak, 0) /
                        athletes.length
                    )}
                  </Text>
                  <Text style={styles.teamStatLabel}>Avg Streak</Text>
                </View>
                <View style={styles.teamStat}>
                  <Award size={18} color="#2563EB" />
                  <Text style={styles.teamStatValue}>
                    Lv{' '}
                    {Math.round(
                      athletes.reduce((a, b) => a + b.level, 0) /
                        athletes.length
                    )}
                  </Text>
                  <Text style={styles.teamStatLabel}>Avg Level</Text>
                </View>
              </View>
            </View>
          </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 8,
  },
  clubName: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  clubMeta: { color: '#A1A1AA', fontSize: 13, marginTop: 4 },
  clubBadge: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabBar: {
    flexDirection: 'row',
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 4,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabActive: { backgroundColor: '#27272A' },
  tabText: { color: '#71717A', fontSize: 14, fontWeight: '600' },
  tabTextActive: { color: '#FFFFFF' },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 16,
    marginHorizontal: 20,
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  searchInput: { flex: 1, color: '#FFFFFF', fontSize: 15 },
  section: { marginTop: 24, paddingHorizontal: 20 },
  sectionTitle: {
    color: '#A1A1AA',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 12,
  },
  coachCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 8,
  },
  avatarGradient: {
    width: 48,
    height: 48,
    borderRadius: 16,
    padding: 2,
  },
  avatarInner: {
    flex: 1,
    backgroundColor: '#18181B',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  memberInfo: { flex: 1, marginLeft: 14 },
  memberName: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  memberMeta: { color: '#A1A1AA', fontSize: 13, marginTop: 2 },
  athleteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 20,
    padding: 14,
    marginBottom: 8,
  },
  levelPill: {
    backgroundColor: '#2563EB20',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  levelPillText: { color: '#2563EB', fontSize: 12, fontWeight: '700' },
  leaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 20,
    padding: 14,
    marginBottom: 8,
  },
  rankContainer: { marginRight: 10 },
  rankBadge: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankText: { color: '#0A0A0A', fontSize: 13, fontWeight: '800' },
  rankPlain: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rankTextPlain: { color: '#A1A1AA', fontSize: 13, fontWeight: '700' },
  xpRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  xpText: { color: '#E91E8C', fontSize: 12, fontWeight: '600' },
  streakText: { color: '#71717A', fontSize: 12, marginLeft: 6 },
  teamStatsCard: {
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    borderRadius: 24,
    padding: 20,
    marginTop: 16,
  },
  teamStatsTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 16,
  },
  teamStatsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  teamStat: { alignItems: 'center', gap: 6 },
  teamStatValue: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  teamStatLabel: { color: '#71717A', fontSize: 11 },
});

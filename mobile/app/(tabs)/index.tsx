import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';

const xp = 1240;
const maxXp = 2000;
const level = 12;
const streak = 7;
const xpPercent = (xp / maxXp) * 100;

export default function HomeScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Image
            source={require('@/assets/images/logo.png')}
            style={{ width: 120, height: 45 }}
            resizeMode="contain"
          />
          <View style={styles.levelBadge}>
            <LinearGradient
              colors={['#2563EB', '#E91E8C']}
              style={styles.levelGradient}
            >
              <View style={styles.levelInner}>
                <Text style={styles.levelText}>{level}</Text>
              </View>
            </LinearGradient>
          </View>
        </View>

        {/* XP Bar */}
        <View style={styles.section}>
          <View style={styles.xpLabels}>
            <Text style={styles.xpLabel}>LEVEL {level}</Text>
            <Text style={styles.xpLabel}>{xp} / {maxXp} XP</Text>
          </View>
          <View style={styles.xpBarBg}>
            <LinearGradient
              colors={['#2563EB', '#E91E8C']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.xpBarFill, { width: `${xpPercent}%` as any }]}
            />
          </View>

          {/* Streak */}
          <View style={styles.streakRow}>
            <Text style={styles.streakEmoji}>🔥</Text>
            <Text style={styles.streakText}>{streak}-day streak</Text>
            <Text style={styles.streakSub}>Keep it going!</Text>
          </View>
        </View>

        {/* Today's Mission */}
        <View style={styles.sectionPadded}>
          <View style={styles.missionCard}>
            <View style={styles.missionContent}>
              <View style={{ flex: 1 }}>
                <Text style={styles.missionTag}>TODAY&apos;S MISSION</Text>
                <Text style={styles.missionTitle}>Upload your last match</Text>
                <Text style={styles.missionXp}>+150 XP • AI Analysis</Text>
              </View>
              <TouchableOpacity
                style={styles.missionBtn}
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  router.push('/(tabs)/upload');
                }}
              >
                <Text style={styles.missionBtnText}>UPLOAD NOW</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsGrid}>
          {[
            { value: '72%', label: 'WIN RATE' },
            { value: '84', label: 'AVG TECH SCORE' },
            { value: '11', label: 'DAYS TO STATE' },
          ].map((stat, i) => (
            <View key={i} style={styles.statCard}>
              <Text style={styles.statValue}>{stat.value}</Text>
              <Text style={styles.statLabel}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 24, paddingVertical: 16,
    borderBottomWidth: 1, borderBottomColor: '#27272A',
  },
  logo: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -1.5 },
  subtitle: { fontSize: 13, color: '#71717A', marginTop: 2 },
  levelBadge: { width: 56, height: 56 },
  levelGradient: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center' },
  levelInner: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#0A0A0A', justifyContent: 'center', alignItems: 'center' },
  levelText: { fontSize: 18, fontWeight: '800', color: '#fff' },
  section: { paddingHorizontal: 24, paddingTop: 20 },
  sectionPadded: { paddingHorizontal: 24, marginTop: 20 },
  xpLabels: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  xpLabel: { fontSize: 11, color: '#A1A1AA', fontWeight: '600' },
  xpBarBg: { height: 12, backgroundColor: '#27272A', borderRadius: 6, overflow: 'hidden' },
  xpBarFill: { height: '100%', borderRadius: 6 },
  streakRow: { flexDirection: 'row', alignItems: 'center', marginTop: 14, gap: 8 },
  streakEmoji: { fontSize: 22 },
  streakText: { fontSize: 16, fontWeight: '800', color: '#fff' },
  streakSub: { fontSize: 13, color: '#71717A', marginLeft: 4 },
  missionCard: { backgroundColor: '#18181B', borderRadius: 24, padding: 20, borderWidth: 1, borderColor: 'rgba(233,30,140,0.3)' },
  missionContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  missionTag: { fontSize: 12, color: '#E91E8C', fontWeight: '600' },
  missionTitle: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 4 },
  missionXp: { fontSize: 13, color: '#71717A', marginTop: 4 },
  missionBtn: { backgroundColor: '#2563EB', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 16 },
  missionBtnText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  statsGrid: { flexDirection: 'row', gap: 12, paddingHorizontal: 24, marginTop: 28 },
  statCard: { flex: 1, backgroundColor: '#18181B', borderRadius: 24, paddingVertical: 20, alignItems: 'center' },
  statValue: { fontSize: 28, fontWeight: '800', color: '#fff' },
  statLabel: { fontSize: 10, color: '#71717A', marginTop: 4, fontWeight: '600' },
});

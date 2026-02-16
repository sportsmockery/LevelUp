import React, { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle,
  Circle,
  Target,
  Calendar,
  Dumbbell,
  AlertTriangle,
  Zap,
} from 'lucide-react-native';
import { DrillAssignment } from '@/lib/types';
import { API_BASE } from '@/lib/api';

const XP_BY_PRIORITY: Record<string, number> = {
  critical: 50,
  high: 35,
  medium: 25,
  maintenance: 15,
};

const PRIORITY_COLORS: Record<string, string> = {
  critical: '#EF4444',
  high: '#F97316',
  medium: '#EAB308',
  maintenance: '#22C55E',
};

const ATHLETE_ID = '00000000-0000-0000-0000-000000000000';

type WeeklyGoal = {
  id: number;
  title: string;
  current: number;
  target: number;
  unit: string;
};

type UpcomingEvent = {
  id: number;
  title: string;
  date: string;
  daysAway: number;
  type: string;
};

const EVENTS: UpcomingEvent[] = [
  { id: 1, title: 'District Tournament', date: 'Feb 15', daysAway: 4, type: 'Tournament' },
  { id: 2, title: 'Weigh-in Deadline', date: 'Feb 14', daysAway: 3, type: 'Deadline' },
  { id: 3, title: 'State Qualifier', date: 'Feb 22', daysAway: 11, type: 'Tournament' },
];

function getWeekStart(): Date {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1; // Monday = 0
  const monday = new Date(now);
  monday.setDate(now.getDate() - diff);
  monday.setHours(0, 0, 0, 0);
  return monday;
}

export default function PlanScreen() {
  const [drills, setDrills] = useState<DrillAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [xpToast, setXpToast] = useState<{ xp: number; name: string } | null>(null);
  const toastOpacity = useRef(new Animated.Value(0)).current;

  const fetchDrills = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/drills?athlete_id=${ATHLETE_ID}`);
      if (res.ok) {
        const data = await res.json();
        setDrills(data.drills || []);
      }
    } catch {
      // Silently fail — empty state will show
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      fetchDrills();
    }, [fetchDrills])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchDrills();
  }, [fetchDrills]);

  const showXpToast = (xp: number, name: string) => {
    setXpToast({ xp, name });
    Animated.sequence([
      Animated.timing(toastOpacity, { toValue: 1, duration: 200, useNativeDriver: true }),
      Animated.delay(2000),
      Animated.timing(toastOpacity, { toValue: 0, duration: 400, useNativeDriver: true }),
    ]).start(() => setXpToast(null));
  };

  const completeDrill = async (drill: DrillAssignment) => {
    if (drill.completed || completingId) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCompletingId(drill.id);

    // Optimistic update
    setDrills((prev) =>
      prev.map((d) =>
        d.id === drill.id ? { ...d, completed: true, completed_at: new Date().toISOString() } : d
      )
    );

    try {
      const res = await fetch(`${API_BASE}/api/drills`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ drillId: drill.id, athleteId: ATHLETE_ID }),
      });

      if (res.ok) {
        const data = await res.json();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showXpToast(data.xp_earned, drill.drill_name);
      } else {
        // Revert on failure
        setDrills((prev) =>
          prev.map((d) =>
            d.id === drill.id ? { ...d, completed: false, completed_at: null } : d
          )
        );
      }
    } catch {
      // Revert on error
      setDrills((prev) =>
        prev.map((d) =>
          d.id === drill.id ? { ...d, completed: false, completed_at: null } : d
        )
      );
    } finally {
      setCompletingId(null);
    }
  };

  // Compute weekly goals from real data
  const weekStart = getWeekStart();
  const thisWeekDrills = drills.filter(
    (d) => d.completed && d.completed_at && new Date(d.completed_at) >= weekStart
  );
  const weeklyXP = thisWeekDrills.reduce(
    (sum, d) => sum + (XP_BY_PRIORITY[d.priority] || 15),
    0
  );

  const goals: WeeklyGoal[] = [
    {
      id: 1,
      title: 'Drill Completions',
      current: thisWeekDrills.length,
      target: Math.max(drills.filter((d) => !d.completed).length, 5),
      unit: 'drills',
    },
    { id: 2, title: 'XP Earned', current: weeklyXP, target: 200, unit: 'XP' },
  ];

  // Group drills by date
  const drillsByDate = new Map<string, DrillAssignment[]>();
  for (const drill of drills) {
    const dateKey = new Date(drill.created_at).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
    if (!drillsByDate.has(dateKey)) drillsByDate.set(dateKey, []);
    drillsByDate.get(dateKey)!.push(drill);
  }

  const pendingDrills = drills.filter((d) => !d.completed);
  const completedDrills = drills.filter((d) => d.completed);

  return (
    <SafeAreaView style={styles.container}>
      {/* XP Toast */}
      {xpToast && (
        <Animated.View style={[styles.xpToast, { opacity: toastOpacity }]}>
          <Zap size={18} color="#EAB308" />
          <Text style={styles.xpToastText}>
            +{xpToast.xp} XP — {xpToast.name}
          </Text>
        </Animated.View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#2563EB"
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TRAINING PLAN</Text>
          <Text style={styles.headerSub}>Your personalized drills from LevelUp</Text>
        </View>

        {loading ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.loadingText}>Loading drills...</Text>
          </View>
        ) : drills.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Target size={48} color="#52525B" />
            <Text style={styles.emptyTitle}>No drills yet</Text>
            <Text style={styles.emptyText}>
              Complete a video analysis to get personalized training drills from LevelUp.
            </Text>
          </View>
        ) : (
          <>
            {/* Pending Drills */}
            {pendingDrills.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  TO DO ({pendingDrills.length})
                </Text>
                {pendingDrills.map((drill) => (
                  <DrillCard
                    key={drill.id}
                    drill={drill}
                    completing={completingId === drill.id}
                    onComplete={() => completeDrill(drill)}
                  />
                ))}
              </View>
            )}

            {/* Completed Drills */}
            {completedDrills.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  COMPLETED ({completedDrills.length})
                </Text>
                {completedDrills.map((drill) => (
                  <DrillCard
                    key={drill.id}
                    drill={drill}
                    completing={false}
                    onComplete={() => {}}
                  />
                ))}
              </View>
            )}
          </>
        )}

        {/* Weekly Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEEKLY GOALS</Text>
          {goals.map((goal) => {
            const pct = goal.target > 0 ? Math.min((goal.current / goal.target) * 100, 100) : 0;
            return (
              <View key={goal.id} style={styles.goalCard}>
                <View style={styles.goalTop}>
                  <Text style={styles.goalTitle}>{goal.title}</Text>
                  <Text style={styles.goalProgress}>
                    {goal.current}/{goal.target} {goal.unit}
                  </Text>
                </View>
                <View style={styles.goalBarBg}>
                  <LinearGradient
                    colors={['#2563EB', '#E91E8C']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={[styles.goalBarFill, { width: `${pct}%` as any }]}
                  />
                </View>
              </View>
            );
          })}
        </View>

        {/* Upcoming Events */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>UPCOMING EVENTS</Text>
          {EVENTS.map((event) => (
            <View key={event.id} style={styles.eventCard}>
              <View style={styles.eventLeft}>
                <Calendar size={18} color="#2563EB" />
                <View>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventDate}>
                    {event.date} | {event.type}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.countdownBadge,
                  event.daysAway <= 3 && styles.countdownUrgent,
                ]}
              >
                <Text
                  style={[
                    styles.countdownText,
                    event.daysAway <= 3 && styles.countdownTextUrgent,
                  ]}
                >
                  {event.daysAway}d
                </Text>
              </View>
            </View>
          ))}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function DrillCard({
  drill,
  completing,
  onComplete,
}: {
  drill: DrillAssignment;
  completing: boolean;
  onComplete: () => void;
}) {
  const priorityColor = PRIORITY_COLORS[drill.priority] || '#71717A';

  return (
    <TouchableOpacity
      style={[styles.drillCard, drill.completed && styles.drillCardDone]}
      onPress={onComplete}
      activeOpacity={drill.completed ? 1 : 0.75}
      disabled={drill.completed || completing}
    >
      <View style={styles.drillTop}>
        <View style={styles.drillIconWrap}>
          {drill.priority === 'critical' ? (
            <AlertTriangle size={20} color={drill.completed ? '#22C55E' : priorityColor} />
          ) : (
            <Dumbbell size={20} color={drill.completed ? '#22C55E' : '#2563EB'} />
          )}
        </View>
        <View style={styles.drillInfo}>
          <Text style={[styles.drillName, drill.completed && styles.drillNameDone]}>
            {drill.drill_name}
          </Text>
          <View style={styles.drillMetaRow}>
            <View style={[styles.priorityBadge, { backgroundColor: priorityColor + '20' }]}>
              <Text style={[styles.priorityText, { color: priorityColor }]}>
                {drill.priority.toUpperCase()}
              </Text>
            </View>
            {drill.reps && (
              <Text style={styles.drillReps}>{drill.reps}</Text>
            )}
          </View>
        </View>
        {completing ? (
          <ActivityIndicator size="small" color="#2563EB" />
        ) : drill.completed ? (
          <CheckCircle size={24} color="#22C55E" />
        ) : (
          <Circle size={24} color="#52525B" />
        )}
      </View>
      {drill.drill_desc ? (
        <Text style={styles.drillDesc}>{drill.drill_desc}</Text>
      ) : null}
      {drill.addresses ? (
        <Text style={styles.drillAddresses}>Addresses: {drill.addresses}</Text>
      ) : null}
    </TouchableOpacity>
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
  loadingWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  loadingText: { color: '#71717A', marginTop: 12, fontSize: 14 },
  emptyWrap: { alignItems: 'center', justifyContent: 'center', paddingTop: 80, paddingHorizontal: 40 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 16 },
  emptyText: { color: '#71717A', fontSize: 14, textAlign: 'center', marginTop: 8, lineHeight: 20 },
  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  drillCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  drillCardDone: {
    borderColor: '#22C55E40',
    opacity: 0.7,
  },
  drillTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  drillIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  drillInfo: { flex: 1 },
  drillName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  drillNameDone: { color: '#71717A', textDecorationLine: 'line-through' },
  drillMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  priorityText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.5 },
  drillReps: { fontSize: 12, color: '#A1A1AA' },
  drillDesc: { fontSize: 13, color: '#A1A1AA', lineHeight: 18, marginTop: 10, paddingLeft: 52 },
  drillAddresses: { fontSize: 12, color: '#71717A', marginTop: 4, paddingLeft: 52, fontStyle: 'italic' },
  xpToast: {
    position: 'absolute',
    top: 60,
    left: 24,
    right: 24,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#EAB30840',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 100,
  },
  xpToastText: { color: '#EAB308', fontSize: 15, fontWeight: '700', flex: 1 },
  goalCard: {
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  goalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  goalTitle: { fontSize: 14, fontWeight: '600', color: '#fff' },
  goalProgress: { fontSize: 13, color: '#71717A', fontWeight: '600' },
  goalBarBg: {
    height: 8,
    backgroundColor: '#27272A',
    borderRadius: 4,
    overflow: 'hidden',
  },
  goalBarFill: { height: '100%', borderRadius: 4 },
  eventCard: {
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
  eventLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  eventTitle: { fontSize: 15, fontWeight: '700', color: '#fff' },
  eventDate: { fontSize: 12, color: '#71717A', marginTop: 2 },
  countdownBadge: {
    backgroundColor: '#2563EB20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  countdownUrgent: {
    backgroundColor: '#EF444420',
  },
  countdownText: { fontSize: 14, fontWeight: '800', color: '#2563EB' },
  countdownTextUrgent: { color: '#EF4444' },
});

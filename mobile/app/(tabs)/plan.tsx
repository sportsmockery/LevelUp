import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import {
  CheckCircle,
  Circle,
  Clock,
  Target,
  Calendar,
  Dumbbell,
  Play,
  Film,
  Flame,
} from 'lucide-react-native';

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

type ScheduleItem = {
  id: number;
  title: string;
  time: string;
  duration: string;
  drills: string[];
  icon: 'stretch' | 'practice' | 'ai' | 'film';
};

const SCHEDULE: ScheduleItem[] = [
  {
    id: 1,
    title: 'Pre-Practice Mobility',
    time: '3:00 PM',
    duration: '20 min',
    drills: ['Hip circles x20', 'Inchworm walkouts x10', 'Band pull-aparts x15'],
    icon: 'stretch',
  },
  {
    id: 2,
    title: 'Team Practice',
    time: '3:30 PM',
    duration: '90 min',
    drills: ['Live wrestling 6x3min', 'Takedown sparring', 'Situation drilling'],
    icon: 'practice',
  },
  {
    id: 3,
    title: 'AI Drill Circuit',
    time: '5:15 PM',
    duration: '30 min',
    drills: ['10x Chain wrestling shots', '5x30s Sprawl reaction drill', '3x8 Tight-waist tilts'],
    icon: 'ai',
  },
  {
    id: 4,
    title: 'Film Review',
    time: '6:00 PM',
    duration: '15 min',
    drills: ['Watch last match highlights', 'Note 3 improvement areas', 'Log in journal'],
    icon: 'film',
  },
];

type WeeklyGoal = {
  id: number;
  title: string;
  current: number;
  target: number;
  unit: string;
};

const GOALS: WeeklyGoal[] = [
  { id: 1, title: 'Practice Sessions', current: 3, target: 5, unit: 'sessions' },
  { id: 2, title: 'Video Uploads', current: 1, target: 2, unit: 'videos' },
  { id: 3, title: 'Drill Completions', current: 8, target: 15, unit: 'drills' },
  { id: 4, title: 'XP Earned', current: 420, target: 750, unit: 'XP' },
];

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

const getIcon = (type: string, color: string) => {
  switch (type) {
    case 'stretch':
      return <Flame size={20} color={color} />;
    case 'practice':
      return <Dumbbell size={20} color={color} />;
    case 'ai':
      return <Target size={20} color={color} />;
    case 'film':
      return <Film size={20} color={color} />;
    default:
      return <Play size={20} color={color} />;
  }
};

export default function PlanScreen() {
  const [selectedDay, setSelectedDay] = useState(2); // Wednesday (0-indexed)
  const [completed, setCompleted] = useState<Set<number>>(new Set());

  const toggleComplete = (id: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setCompleted((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>TRAINING PLAN</Text>
          <Text style={styles.headerSub}>Your weekly roadmap</Text>
        </View>

        {/* Day Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayScroll}
        >
          {DAYS.map((day, i) => (
            <TouchableOpacity
              key={day}
              style={[styles.dayBtn, selectedDay === i && styles.dayBtnActive]}
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setSelectedDay(i);
              }}
            >
              <Text
                style={[
                  styles.dayText,
                  selectedDay === i && styles.dayTextActive,
                ]}
              >
                {day}
              </Text>
              {selectedDay === i && (
                <View style={styles.dayDot} />
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Today's Schedule */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>TODAY&apos;S SCHEDULE</Text>
          {SCHEDULE.map((item) => {
            const isComplete = completed.has(item.id);
            return (
              <TouchableOpacity
                key={item.id}
                style={[
                  styles.scheduleCard,
                  isComplete && styles.scheduleCardDone,
                ]}
                onPress={() => toggleComplete(item.id)}
                activeOpacity={0.75}
              >
                <View style={styles.scheduleTop}>
                  <View style={styles.scheduleIconWrap}>
                    {getIcon(item.icon, isComplete ? '#22C55E' : '#2563EB')}
                  </View>
                  <View style={styles.scheduleInfo}>
                    <Text
                      style={[
                        styles.scheduleTitle,
                        isComplete && styles.scheduleTitleDone,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.scheduleMetaRow}>
                      <Clock size={12} color="#71717A" />
                      <Text style={styles.scheduleMeta}>
                        {item.time} | {item.duration}
                      </Text>
                    </View>
                  </View>
                  {isComplete ? (
                    <CheckCircle size={24} color="#22C55E" />
                  ) : (
                    <Circle size={24} color="#52525B" />
                  )}
                </View>
                <View style={styles.drillList}>
                  {item.drills.map((drill, di) => (
                    <Text key={di} style={styles.drillText}>
                      {'\u2022'} {drill}
                    </Text>
                  ))}
                </View>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Weekly Goals */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>WEEKLY GOALS</Text>
          {GOALS.map((goal) => {
            const pct = Math.min((goal.current / goal.target) * 100, 100);
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
  dayScroll: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    gap: 10,
  },
  dayBtn: {
    width: 52,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#18181B',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#27272A',
  },
  dayBtnActive: {
    backgroundColor: '#2563EB20',
    borderColor: '#2563EB',
  },
  dayText: { fontSize: 14, fontWeight: '700', color: '#71717A' },
  dayTextActive: { color: '#2563EB' },
  dayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#2563EB',
    marginTop: 4,
  },
  section: { paddingHorizontal: 24, marginTop: 24 },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#71717A',
    letterSpacing: 1.5,
    marginBottom: 14,
  },
  scheduleCard: {
    backgroundColor: '#18181B',
    borderRadius: 20,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  scheduleCardDone: {
    borderColor: '#22C55E40',
    opacity: 0.85,
  },
  scheduleTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  scheduleIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#27272A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scheduleInfo: { flex: 1 },
  scheduleTitle: { fontSize: 16, fontWeight: '700', color: '#fff' },
  scheduleTitleDone: { color: '#71717A', textDecorationLine: 'line-through' },
  scheduleMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
  scheduleMeta: { fontSize: 12, color: '#71717A' },
  drillList: { marginTop: 12, paddingLeft: 52, gap: 4 },
  drillText: { fontSize: 13, color: '#A1A1AA', lineHeight: 20 },
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

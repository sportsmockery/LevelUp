import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Switch,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft } from 'lucide-react-native';

const PREFS_KEY = '@levelup/notification_preferences';

type NotificationPrefs = {
  analysisComplete: boolean;
  drillReminders: boolean;
  weeklyProgress: boolean;
  badgeEarned: boolean;
  drillReminderHour: number;
  drillReminderMinute: number;
};

const DEFAULT_PREFS: NotificationPrefs = {
  analysisComplete: true,
  drillReminders: true,
  weeklyProgress: true,
  badgeEarned: true,
  drillReminderHour: 16,
  drillReminderMinute: 0,
};

const HOURS = Array.from({ length: 12 }, (_, i) => i + 1);

export default function NotificationsScreen() {
  const router = useRouter();
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS);

  useEffect(() => {
    AsyncStorage.getItem(PREFS_KEY).then((raw) => {
      if (raw) {
        try { setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) }); } catch {}
      }
    });
  }, []);

  const updatePref = async (key: keyof NotificationPrefs, value: boolean | number) => {
    const updated = { ...prefs, [key]: value };
    setPrefs(updated);
    await AsyncStorage.setItem(PREFS_KEY, JSON.stringify(updated));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const formatTime = (hour: number, minute: number) => {
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  const cycleHour = (direction: 1 | -1) => {
    let newHour = prefs.drillReminderHour + direction;
    if (newHour > 23) newHour = 0;
    if (newHour < 0) newHour = 23;
    updatePref('drillReminderHour', newHour);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={22} color="#A1A1AA" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Notifications</Text>
        </View>

        <View style={s.section}>
          <ToggleRow
            label="Analysis Complete"
            description="Push notification when video analysis finishes"
            value={prefs.analysisComplete}
            onChange={(v) => updatePref('analysisComplete', v)}
          />
          <ToggleRow
            label="Drill Reminders"
            description="Daily reminder to complete assigned drills"
            value={prefs.drillReminders}
            onChange={(v) => updatePref('drillReminders', v)}
          />
          {prefs.drillReminders && (
            <View style={s.timePickerRow}>
              <Text style={s.timeLabel}>Reminder Time</Text>
              <View style={s.timePicker}>
                <TouchableOpacity onPress={() => cycleHour(-1)} style={s.timeArrow}>
                  <Text style={s.timeArrowText}>{'\u25C0'}</Text>
                </TouchableOpacity>
                <Text style={s.timeValue}>
                  {formatTime(prefs.drillReminderHour, prefs.drillReminderMinute)}
                </Text>
                <TouchableOpacity onPress={() => cycleHour(1)} style={s.timeArrow}>
                  <Text style={s.timeArrowText}>{'\u25B6'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
          <ToggleRow
            label="Weekly Progress Summary"
            description="Weekly notification summarizing stats changes"
            value={prefs.weeklyProgress}
            onChange={(v) => updatePref('weeklyProgress', v)}
          />
          <ToggleRow
            label="Badge Earned"
            description="Notification when a new badge is awarded"
            value={prefs.badgeEarned}
            onChange={(v) => updatePref('badgeEarned', v)}
          />
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ToggleRow({ label, description, value, onChange }: {
  label: string;
  description: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <View style={s.toggleRow}>
      <View style={s.toggleInfo}>
        <Text style={s.toggleLabel}>{label}</Text>
        <Text style={s.toggleDesc}>{description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: '#3F3F46', true: '#2563EB' }}
        thumbColor={Platform.OS === 'android' ? '#fff' : undefined}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  section: { paddingHorizontal: 20, marginTop: 20 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#27272A' },
  toggleInfo: { flex: 1, marginRight: 12 },
  toggleLabel: { fontSize: 15, fontWeight: '600', color: '#E4E4E7' },
  toggleDesc: { fontSize: 12, color: '#71717A', marginTop: 3 },
  timePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#18181B', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#27272A' },
  timeLabel: { fontSize: 14, fontWeight: '600', color: '#A1A1AA' },
  timePicker: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  timeArrow: { padding: 6 },
  timeArrowText: { fontSize: 12, color: '#2563EB' },
  timeValue: { fontSize: 16, fontWeight: '700', color: '#fff', minWidth: 80, textAlign: 'center' },
});

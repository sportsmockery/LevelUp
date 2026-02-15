import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Check } from 'lucide-react-native';

const PROFILE_KEY = '@levelup/athlete_profile';

type WeightStyle = 'folkstyle' | 'freestyle_greco';

const FOLKSTYLE_WEIGHTS: Record<string, number[]> = {
  '8U': [40, 43, 45, 49, 53, 56, 62, 70, 85],
  '10U': [49, 53, 56, 59, 63, 67, 71, 77, 84, 93, 105, 120],
  '12U': [58, 63, 67, 70, 74, 78, 82, 86, 92, 98, 108, 117, 135, 160],
  '14U': [75, 80, 84, 88, 92, 96, 100, 105, 110, 115, 120, 126, 132, 140, 155, 175, 225],
  '16U': [88, 94, 100, 106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285],
  'Junior': [100, 106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285],
  'HS (NFHS)': [106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285],
  'College (NCAA)': [125, 133, 141, 149, 157, 165, 174, 184, 197, 285],
};

const FREESTYLE_WEIGHTS: Record<string, number[]> = {
  '8U': [40, 43, 45, 49, 53, 56, 62, 70, 85],
  '10U': [49, 53, 56, 59, 63, 67, 71, 77, 84, 93, 105, 120],
  '12U': [58, 63, 67, 70, 74, 78, 82, 86, 92, 98, 108, 117, 135, 160],
  '14U': [75, 80, 84, 88, 92, 96, 100, 105, 110, 115, 120, 126, 132, 140, 155, 175, 225],
  '16U': [88, 94, 100, 106, 113, 120, 126, 132, 138, 144, 150, 157, 165, 175, 190, 215, 285],
  'Junior': [57, 61, 65, 70, 74, 79, 86, 92, 97, 125],
  'Senior': [57, 61, 65, 70, 74, 79, 86, 92, 97, 125],
};

const DIVISIONS_FOLK = Object.keys(FOLKSTYLE_WEIGHTS);
const DIVISIONS_FREE = Object.keys(FREESTYLE_WEIGHTS);

export default function WeightClassScreen() {
  const router = useRouter();
  const [style, setStyle] = useState<WeightStyle>('folkstyle');
  const [division, setDivision] = useState<string>('');
  const [selectedWeight, setSelectedWeight] = useState<number | null>(null);
  const [savedWeight, setSavedWeight] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((raw) => {
      if (raw) {
        try {
          const profile = JSON.parse(raw);
          if (profile.weightClass) setSavedWeight(profile.weightClass);
          // Auto-select division by birth year
          if (profile.birthYear) {
            const age = new Date().getFullYear() - profile.birthYear;
            if (age <= 8) setDivision('8U');
            else if (age <= 10) setDivision('10U');
            else if (age <= 12) setDivision('12U');
            else if (age <= 14) setDivision('14U');
            else if (age <= 16) setDivision('16U');
            else if (age <= 18) setDivision('HS (NFHS)');
            else setDivision('College (NCAA)');
          }
        } catch {}
      }
    });
  }, []);

  const weights = style === 'folkstyle'
    ? FOLKSTYLE_WEIGHTS[division] || []
    : FREESTYLE_WEIGHTS[division] || [];

  const divisions = style === 'folkstyle' ? DIVISIONS_FOLK : DIVISIONS_FREE;

  const save = async () => {
    if (selectedWeight === null) return;
    const weightStr = `${selectedWeight} lbs`;
    const raw = await AsyncStorage.getItem(PROFILE_KEY);
    const profile = raw ? JSON.parse(raw) : {};
    profile.weightClass = weightStr;
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSavedWeight(weightStr);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Saved', `Weight class set to ${weightStr}`, [
      { text: 'OK', onPress: () => router.back() },
    ]);
  };

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={22} color="#A1A1AA" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Weight Class</Text>
        </View>

        {savedWeight && (
          <View style={s.currentBanner}>
            <Text style={s.currentLabel}>Current: <Text style={s.currentValue}>{savedWeight}</Text></Text>
          </View>
        )}

        {/* Style Selector */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>STYLE</Text>
          <View style={s.pillRow}>
            <TouchableOpacity
              style={[s.pill, style === 'folkstyle' && s.pillActive]}
              onPress={() => { setStyle('folkstyle'); setDivision(''); setSelectedWeight(null); }}
            >
              <Text style={[s.pillText, style === 'folkstyle' && s.pillTextActive]}>Folkstyle</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[s.pill, style === 'freestyle_greco' && s.pillActive]}
              onPress={() => { setStyle('freestyle_greco'); setDivision(''); setSelectedWeight(null); }}
            >
              <Text style={[s.pillText, style === 'freestyle_greco' && s.pillTextActive]}>Freestyle/Greco</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Division Selector */}
        <View style={s.section}>
          <Text style={s.sectionLabel}>AGE DIVISION</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={s.chipRow}>
              {divisions.map((d) => (
                <TouchableOpacity
                  key={d}
                  style={[s.chip, division === d && s.chipActive]}
                  onPress={() => { setDivision(d); setSelectedWeight(null); }}
                >
                  <Text style={[s.chipText, division === d && s.chipTextActive]}>{d}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Weight List */}
        {division && weights.length > 0 && (
          <View style={s.section}>
            <Text style={s.sectionLabel}>WEIGHT CLASSES ({division})</Text>
            <View style={s.weightGrid}>
              {weights.map((w) => (
                <TouchableOpacity
                  key={w}
                  style={[s.weightItem, selectedWeight === w && s.weightItemActive]}
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setSelectedWeight(selectedWeight === w ? null : w);
                  }}
                >
                  <Text style={[s.weightText, selectedWeight === w && s.weightTextActive]}>
                    {w} lbs
                  </Text>
                  {selectedWeight === w && <Check size={16} color="#22C55E" />}
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {selectedWeight !== null && (
          <TouchableOpacity style={s.saveBtn} onPress={save}>
            <Text style={s.saveBtnText}>Save Weight Class</Text>
          </TouchableOpacity>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0A0A0A' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#27272A' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 20, fontWeight: '700', color: '#fff' },
  currentBanner: { backgroundColor: '#18181B', marginHorizontal: 20, marginTop: 16, padding: 12, borderRadius: 12, borderWidth: 1, borderColor: '#27272A' },
  currentLabel: { fontSize: 14, color: '#71717A' },
  currentValue: { fontWeight: '700', color: '#2563EB' },
  section: { paddingHorizontal: 20, marginTop: 20 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#A1A1AA', letterSpacing: 1.5, marginBottom: 10 },
  pillRow: { flexDirection: 'row', gap: 10 },
  pill: { flex: 1, alignItems: 'center', backgroundColor: '#18181B', borderRadius: 14, paddingVertical: 12, borderWidth: 1.5, borderColor: '#27272A' },
  pillActive: { borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)' },
  pillText: { fontSize: 14, fontWeight: '700', color: '#71717A' },
  pillTextActive: { color: '#fff' },
  chipRow: { flexDirection: 'row', gap: 8 },
  chip: { backgroundColor: '#18181B', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#27272A' },
  chipActive: { borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#71717A' },
  chipTextActive: { color: '#fff' },
  weightGrid: { gap: 6 },
  weightItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#18181B', borderRadius: 12, paddingVertical: 14, paddingHorizontal: 16, borderWidth: 1, borderColor: '#27272A' },
  weightItemActive: { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.08)' },
  weightText: { fontSize: 15, fontWeight: '600', color: '#E4E4E7' },
  weightTextActive: { color: '#22C55E' },
  saveBtn: { marginHorizontal: 20, marginTop: 24, backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

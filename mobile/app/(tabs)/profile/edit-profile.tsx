import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, Camera } from 'lucide-react-native';
import { MatchStyle } from '@/lib/types';

const PROFILE_KEY = '@levelup/athlete_profile';

const EXPERIENCE_OPTIONS = ['Beginner (0-1yr)', 'Intermediate (2-4yr)', 'Advanced (5+yr)', 'Elite/Competitor'];
const MATCH_STYLE_OPTIONS: { label: string; value: MatchStyle | '' }[] = [
  { label: 'Auto (by age)', value: '' },
  { label: 'Youth Folk', value: 'youth_folkstyle' },
  { label: 'HS Folk', value: 'hs_folkstyle' },
  { label: 'College', value: 'college_folkstyle' },
  { label: 'Freestyle', value: 'freestyle' },
  { label: 'Greco', value: 'grecoRoman' },
];
const GENDER_OPTIONS = ['Male', 'Female'];
const BIRTH_YEARS = Array.from({ length: 21 }, (_, i) => 2022 - i); // 2022 down to 2002

type Profile = {
  photoUri?: string;
  displayName: string;
  birthYear?: number;
  gender?: string;
  school?: string;
  experience?: string;
  defaultMatchStyle?: MatchStyle | '';
  bio?: string;
};

export default function EditProfileScreen() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile>({ displayName: '' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(PROFILE_KEY).then((raw) => {
      if (raw) {
        try { setProfile(JSON.parse(raw)); } catch {}
      }
    });
  }, []);

  const pickPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.7,
    });
    if (!res.canceled && res.assets.length > 0) {
      setProfile((p) => ({ ...p, photoUri: res.assets[0].uri }));
    }
  };

  const save = async () => {
    if (!profile.displayName.trim()) {
      Alert.alert('Name Required', 'Please enter a display name.');
      return;
    }
    setSaving(true);
    await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
    setSaving(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    Alert.alert('Profile Updated', 'Your profile has been saved.', [
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
          <Text style={s.headerTitle}>Edit Profile</Text>
        </View>

        {/* Photo */}
        <TouchableOpacity style={s.photoSection} onPress={pickPhoto}>
          {profile.photoUri ? (
            <Image source={{ uri: profile.photoUri }} style={s.photo} />
          ) : (
            <View style={s.photoPlaceholder}>
              <Camera size={28} color="#71717A" />
            </View>
          )}
          <Text style={s.photoLabel}>Tap to change photo</Text>
        </TouchableOpacity>

        {/* Fields */}
        <View style={s.fields}>
          <View style={s.field}>
            <Text style={s.label}>Display Name *</Text>
            <TextInput
              style={s.input}
              value={profile.displayName}
              onChangeText={(v) => setProfile((p) => ({ ...p, displayName: v.slice(0, 30) }))}
              placeholder="Your name"
              placeholderTextColor="#52525B"
              maxLength={30}
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Birth Year</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chipScroll}>
              <View style={s.chipRow}>
                {BIRTH_YEARS.map((year) => (
                  <TouchableOpacity
                    key={year}
                    style={[s.chip, profile.birthYear === year && s.chipActive]}
                    onPress={() => setProfile((p) => ({ ...p, birthYear: p.birthYear === year ? undefined : year }))}
                  >
                    <Text style={[s.chipText, profile.birthYear === year && s.chipTextActive]}>{year}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Gender</Text>
            <View style={s.chipRow}>
              {GENDER_OPTIONS.map((g) => (
                <TouchableOpacity
                  key={g}
                  style={[s.chip, profile.gender === g && s.chipActive]}
                  onPress={() => setProfile((p) => ({ ...p, gender: p.gender === g ? undefined : g }))}
                >
                  <Text style={[s.chipText, profile.gender === g && s.chipTextActive]}>{g}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>School / Club Name</Text>
            <TextInput
              style={s.input}
              value={profile.school || ''}
              onChangeText={(v) => setProfile((p) => ({ ...p, school: v }))}
              placeholder="e.g. Riverside Wrestling Club"
              placeholderTextColor="#52525B"
            />
          </View>

          <View style={s.field}>
            <Text style={s.label}>Wrestling Experience</Text>
            <View style={s.chipRow}>
              {EXPERIENCE_OPTIONS.map((exp) => (
                <TouchableOpacity
                  key={exp}
                  style={[s.chip, profile.experience === exp && s.chipActive]}
                  onPress={() => setProfile((p) => ({ ...p, experience: p.experience === exp ? undefined : exp }))}
                >
                  <Text style={[s.chipText, profile.experience === exp && s.chipTextActive]}>{exp}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Default Match Style</Text>
            <View style={s.chipRow}>
              {MATCH_STYLE_OPTIONS.map((ms) => (
                <TouchableOpacity
                  key={ms.label}
                  style={[s.chip, profile.defaultMatchStyle === ms.value && s.chipActive]}
                  onPress={() => setProfile((p) => ({ ...p, defaultMatchStyle: ms.value }))}
                >
                  <Text style={[s.chipText, profile.defaultMatchStyle === ms.value && s.chipTextActive]}>{ms.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={s.field}>
            <Text style={s.label}>Bio</Text>
            <TextInput
              style={[s.input, s.bioInput]}
              value={profile.bio || ''}
              onChangeText={(v) => setProfile((p) => ({ ...p, bio: v.slice(0, 150) }))}
              placeholder="Tell us about yourself..."
              placeholderTextColor="#52525B"
              multiline
              maxLength={150}
            />
            <Text style={s.charCount}>{(profile.bio || '').length}/150</Text>
          </View>
        </View>

        <TouchableOpacity style={s.saveBtn} onPress={save} disabled={saving}>
          <Text style={s.saveBtnText}>{saving ? 'Saving...' : 'Save Profile'}</Text>
        </TouchableOpacity>

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
  photoSection: { alignItems: 'center', marginTop: 24, gap: 8 },
  photo: { width: 90, height: 90, borderRadius: 45 },
  photoPlaceholder: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#18181B', borderWidth: 2, borderColor: '#27272A', borderStyle: 'dashed', justifyContent: 'center', alignItems: 'center' },
  photoLabel: { fontSize: 13, color: '#52525B' },
  fields: { paddingHorizontal: 20, marginTop: 20, gap: 20 },
  field: {},
  label: { fontSize: 12, fontWeight: '700', color: '#A1A1AA', letterSpacing: 1, marginBottom: 8 },
  input: { backgroundColor: '#18181B', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 14, fontSize: 15, color: '#fff', borderWidth: 1, borderColor: '#27272A' },
  bioInput: { minHeight: 80, textAlignVertical: 'top' },
  charCount: { fontSize: 11, color: '#52525B', textAlign: 'right', marginTop: 4 },
  chipScroll: { marginHorizontal: -20 },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 20 },
  chip: { backgroundColor: '#18181B', borderRadius: 10, paddingVertical: 8, paddingHorizontal: 14, borderWidth: 1.5, borderColor: '#27272A' },
  chipActive: { borderColor: '#2563EB', backgroundColor: 'rgba(37,99,235,0.1)' },
  chipText: { fontSize: 13, fontWeight: '600', color: '#71717A' },
  chipTextActive: { color: '#fff' },
  saveBtn: { marginHorizontal: 20, marginTop: 30, backgroundColor: '#2563EB', borderRadius: 14, paddingVertical: 16, alignItems: 'center' },
  saveBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});

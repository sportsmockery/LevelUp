import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, Search, MapPin, Users, LogOut, ExternalLink } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import * as Linking from 'expo-linking';

type Club = {
  id: string;
  name: string;
  location_city: string | null;
  location_state: string | null;
  logo_url: string | null;
  requires_approval: boolean;
  member_count?: number;
};

type Membership = {
  id: string;
  club_id: string;
  status: 'active' | 'pending' | 'inactive';
  role: string;
  club: Club;
};

export default function ClubSettingsScreen() {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [clubs, setClubs] = useState<Club[]>([]);
  const [currentMembership, setCurrentMembership] = useState<Membership | null>(null);
  const [loading, setLoading] = useState(true);
  const [joining, setJoining] = useState<string | null>(null);
  const [leaving, setLeaving] = useState(false);
  const [supabaseAvailable, setSupabaseAvailable] = useState(false);

  useEffect(() => {
    if (supabase && typeof supabase.from === 'function') {
      setSupabaseAvailable(true);
      loadData();
    } else {
      setSupabaseAvailable(false);
      setLoading(false);
    }
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([loadMembership(), loadClubs('')]);
    } catch {} finally {
      setLoading(false);
    }
  };

  const loadMembership = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from('club_members')
      .select('id, club_id, status, role, club:clubs(id, name, location_city, location_state, logo_url, requires_approval)')
      .eq('athlete_id', user.id)
      .in('status', ['active', 'pending'])
      .limit(1)
      .single();

    if (data) {
      setCurrentMembership(data as unknown as Membership);
    } else {
      setCurrentMembership(null);
    }
  };

  const loadClubs = async (query: string) => {
    let q = supabase
      .from('clubs')
      .select('id, name, location_city, location_state, logo_url, requires_approval');

    if (query.trim()) {
      q = q.ilike('name', `%${query.trim()}%`);
    }

    const { data } = await q.order('name').limit(50);
    setClubs(data || []);
  };

  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    if (supabaseAvailable) {
      loadClubs(text);
    }
  }, [supabaseAvailable]);

  const joinClub = async (club: Club) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign In Required', 'Please sign in to join a club.');
      return;
    }

    setJoining(club.id);
    try {
      const status = club.requires_approval ? 'pending' : 'active';
      const { error } = await supabase
        .from('club_members')
        .insert({
          club_id: club.id,
          athlete_id: user.id,
          role: 'athlete',
          status,
        });

      if (error) {
        if (error.code === '23505') {
          Alert.alert('Already a Member', 'You are already a member of this club.');
        } else {
          Alert.alert('Error', 'Could not join club. Please try again.');
        }
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        if (club.requires_approval) {
          Alert.alert('Request Sent', `Your request to join ${club.name} has been sent. The club admin will review it.`);
        } else {
          Alert.alert('Joined!', `You are now a member of ${club.name}.`);
        }
        await loadMembership();
      }
    } catch {
      Alert.alert('Error', 'Could not join club. Please try again.');
    } finally {
      setJoining(null);
    }
  };

  const leaveClub = () => {
    if (!currentMembership) return;
    Alert.alert(
      'Leave Club',
      `Are you sure you want to leave ${currentMembership.club.name}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            setLeaving(true);
            try {
              await supabase
                .from('club_members')
                .delete()
                .eq('id', currentMembership.id);

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setCurrentMembership(null);
            } catch {
              Alert.alert('Error', 'Could not leave club. Please try again.');
            } finally {
              setLeaving(false);
            }
          },
        },
      ],
    );
  };

  const isCurrentClub = (clubId: string) =>
    currentMembership?.club_id === clubId;

  return (
    <SafeAreaView style={s.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
            <ArrowLeft size={22} color="#A1A1AA" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Club Settings</Text>
        </View>

        {/* Current Club */}
        {currentMembership && (
          <View style={s.currentClubCard}>
            <View style={s.currentClubHeader}>
              <Text style={s.currentClubLabel}>YOUR CLUB</Text>
              {currentMembership.status === 'pending' && (
                <View style={s.pendingBadge}>
                  <Text style={s.pendingBadgeText}>Pending Approval</Text>
                </View>
              )}
            </View>
            <Text style={s.currentClubName}>{currentMembership.club.name}</Text>
            {(currentMembership.club.location_city || currentMembership.club.location_state) && (
              <View style={s.locationRow}>
                <MapPin size={14} color="#71717A" />
                <Text style={s.locationText}>
                  {[currentMembership.club.location_city, currentMembership.club.location_state].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}
            <TouchableOpacity style={s.leaveBtn} onPress={leaveClub} disabled={leaving}>
              <LogOut size={16} color="#EF4444" />
              <Text style={s.leaveBtnText}>{leaving ? 'Leaving...' : 'Leave Club'}</Text>
            </TouchableOpacity>
          </View>
        )}

        {!supabaseAvailable ? (
          /* Empty state when Supabase is not configured */
          <View style={s.emptyState}>
            <Users size={48} color="#52525B" />
            <Text style={s.emptyTitle}>No clubs available yet</Text>
            <Text style={s.emptySubtext}>
              Clubs are set up by coaches and admins on the LevelUp website.
            </Text>
            <TouchableOpacity
              style={s.websiteBtn}
              onPress={() => Linking.openURL('https://levelup-wrestling.vercel.app')}
            >
              <ExternalLink size={16} color="#2563EB" />
              <Text style={s.websiteBtnText}>Visit LevelUp Website</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {/* Search */}
            <View style={s.searchSection}>
              <Text style={s.sectionLabel}>FIND A CLUB</Text>
              <View style={s.searchBar}>
                <Search size={18} color="#71717A" />
                <TextInput
                  style={s.searchInput}
                  value={search}
                  onChangeText={handleSearch}
                  placeholder="Search by club name..."
                  placeholderTextColor="#52525B"
                />
              </View>
            </View>

            {/* Club List */}
            {loading ? (
              <View style={s.loadingWrap}>
                <ActivityIndicator color="#2563EB" size="large" />
              </View>
            ) : clubs.length === 0 ? (
              <View style={s.emptyState}>
                <Users size={48} color="#52525B" />
                <Text style={s.emptyTitle}>
                  {search.trim() ? 'No clubs found' : 'No clubs available yet'}
                </Text>
                <Text style={s.emptySubtext}>
                  {search.trim()
                    ? 'Try a different search term.'
                    : 'Clubs are set up by coaches and admins on the LevelUp website.'}
                </Text>
                {!search.trim() && (
                  <TouchableOpacity
                    style={s.websiteBtn}
                    onPress={() => Linking.openURL('https://levelup-wrestling.vercel.app')}
                  >
                    <ExternalLink size={16} color="#2563EB" />
                    <Text style={s.websiteBtnText}>Visit LevelUp Website</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              <View style={s.clubList}>
                {clubs.map((club) => {
                  const isMember = isCurrentClub(club.id);
                  return (
                    <View key={club.id} style={[s.clubRow, isMember && s.clubRowMember]}>
                      <View style={s.clubInfo}>
                        <Text style={s.clubName}>{club.name}</Text>
                        {(club.location_city || club.location_state) && (
                          <View style={s.locationRow}>
                            <MapPin size={12} color="#71717A" />
                            <Text style={s.clubLocation}>
                              {[club.location_city, club.location_state].filter(Boolean).join(', ')}
                            </Text>
                          </View>
                        )}
                      </View>
                      {isMember ? (
                        <View style={s.memberBadge}>
                          <Text style={s.memberBadgeText}>Joined</Text>
                        </View>
                      ) : (
                        <TouchableOpacity
                          style={s.joinBtn}
                          onPress={() => joinClub(club)}
                          disabled={joining === club.id}
                        >
                          {joining === club.id ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <Text style={s.joinBtnText}>
                              {club.requires_approval ? 'Request' : 'Join'}
                            </Text>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </>
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
  currentClubCard: { marginHorizontal: 20, marginTop: 20, backgroundColor: '#18181B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#27272A' },
  currentClubHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  currentClubLabel: { fontSize: 12, fontWeight: '700', color: '#A1A1AA', letterSpacing: 1.5 },
  pendingBadge: { backgroundColor: 'rgba(234,179,8,0.15)', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  pendingBadgeText: { fontSize: 11, fontWeight: '600', color: '#EAB308' },
  currentClubName: { fontSize: 18, fontWeight: '700', color: '#fff', marginBottom: 6 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  locationText: { fontSize: 13, color: '#71717A' },
  leaveBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: '#27272A' },
  leaveBtnText: { fontSize: 14, fontWeight: '600', color: '#EF4444' },
  searchSection: { paddingHorizontal: 20, marginTop: 24 },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#A1A1AA', letterSpacing: 1.5, marginBottom: 10 },
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#27272A', gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: '#fff', padding: 0 },
  loadingWrap: { alignItems: 'center', paddingTop: 60 },
  emptyState: { alignItems: 'center', paddingHorizontal: 40, paddingTop: 60, gap: 10 },
  emptyTitle: { fontSize: 17, fontWeight: '700', color: '#E4E4E7', textAlign: 'center' },
  emptySubtext: { fontSize: 14, color: '#71717A', textAlign: 'center', lineHeight: 20 },
  websiteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, backgroundColor: 'rgba(37,99,235,0.1)', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10 },
  websiteBtnText: { fontSize: 14, fontWeight: '600', color: '#2563EB' },
  clubList: { paddingHorizontal: 20, marginTop: 16, gap: 8 },
  clubRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#18181B', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: '#27272A' },
  clubRowMember: { borderColor: '#22C55E', backgroundColor: 'rgba(34,197,94,0.06)' },
  clubInfo: { flex: 1, marginRight: 12 },
  clubName: { fontSize: 15, fontWeight: '600', color: '#E4E4E7', marginBottom: 4 },
  clubLocation: { fontSize: 12, color: '#71717A' },
  joinBtn: { backgroundColor: '#2563EB', borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, minWidth: 70, alignItems: 'center' },
  joinBtnText: { fontSize: 13, fontWeight: '700', color: '#fff' },
  memberBadge: { backgroundColor: 'rgba(34,197,94,0.15)', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 },
  memberBadgeText: { fontSize: 12, fontWeight: '600', color: '#22C55E' },
});

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as Haptics from 'expo-haptics';
import { ArrowLeft, UserCheck, UserX, Users } from 'lucide-react-native';
import { API_BASE, authHeaders } from '@/lib/api';

type ConnectionRequest = {
  id: string;
  parentUserId: string;
  parentName: string;
  relationship: string;
  requestedAt: string;
};

export default function ConnectionRequestsScreen() {
  const router = useRouter();
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<string | null>(null);

  useEffect(() => {
    fetchRequests();
  }, []);

  const fetchRequests = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/family/requests`, {
        headers: await authHeaders(),
      });
      const data = await res.json();
      setRequests(data.requests || []);
    } catch (err) {
      console.error('[LevelUp] Fetch connection requests error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (req: ConnectionRequest) => {
    setActioningId(req.id);
    try {
      const res = await fetch(`${API_BASE}/api/family/approve`, {
        method: 'PUT',
        headers: await authHeaders(),
        body: JSON.stringify({ connectionId: req.id }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(err.error);
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Approved', `${req.parentName} can now view your matches`);
      setRequests((prev) => prev.filter((r) => r.id !== req.id));
    } catch (err: any) {
      Alert.alert('Error', err?.message || 'Failed to approve');
    } finally {
      setActioningId(null);
    }
  };

  const handleDeny = async (req: ConnectionRequest) => {
    Alert.alert(
      'Deny Request',
      `Deny connection request from ${req.parentName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: async () => {
            setActioningId(req.id);
            try {
              const res = await fetch(`${API_BASE}/api/family/deny`, {
                method: 'PUT',
                headers: await authHeaders(),
                body: JSON.stringify({ connectionId: req.id }),
              });

              if (!res.ok) {
                const err = await res.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(err.error);
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
              setRequests((prev) => prev.filter((r) => r.id !== req.id));
            } catch (err: any) {
              Alert.alert('Error', err?.message || 'Failed to deny');
            } finally {
              setActioningId(null);
            }
          },
        },
      ],
    );
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const capitalizeRelationship = (rel: string) => {
    return rel.charAt(0).toUpperCase() + rel.slice(1);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <ArrowLeft size={22} color="#fff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Connection Requests</Text>
        </View>

        {loading ? (
          <View style={styles.centerState}>
            <ActivityIndicator size="large" color="#2563EB" />
            <Text style={styles.centerText}>Loading requests...</Text>
          </View>
        ) : requests.length === 0 ? (
          <View style={styles.centerState}>
            <Users size={48} color="#3F3F46" />
            <Text style={styles.emptyTitle}>No pending requests</Text>
            <Text style={styles.emptyText}>
              When a parent or guardian requests to connect, it will appear here
            </Text>
          </View>
        ) : (
          <View style={styles.listSection}>
            {requests.map((req) => {
              const isActioning = actioningId === req.id;
              return (
                <View key={req.id} style={styles.requestCard}>
                  <View style={styles.requestAvatar}>
                    <Text style={styles.requestAvatarText}>
                      {req.parentName.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.requestInfo}>
                    <Text style={styles.requestName}>{req.parentName}</Text>
                    <Text style={styles.requestRelationship}>
                      {capitalizeRelationship(req.relationship)}
                    </Text>
                    <Text style={styles.requestDate}>
                      Requested {formatDate(req.requestedAt)}
                    </Text>
                  </View>
                  <View style={styles.requestActions}>
                    <TouchableOpacity
                      style={[styles.approveBtn, isActioning && styles.btnDisabled]}
                      onPress={() => handleApprove(req)}
                      disabled={isActioning}
                    >
                      {isActioning ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <UserCheck size={18} color="#fff" />
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.denyBtn, isActioning && styles.btnDisabled]}
                      onPress={() => handleDeny(req)}
                      disabled={isActioning}
                    >
                      <UserX size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
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
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#27272A',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#18181B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  centerState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
    gap: 12,
  },
  centerText: { fontSize: 14, color: '#71717A' },
  emptyTitle: { fontSize: 18, fontWeight: '700', color: '#A1A1AA' },
  emptyText: { fontSize: 14, color: '#52525B', textAlign: 'center', lineHeight: 20 },
  listSection: { paddingHorizontal: 24, marginTop: 20 },
  requestCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#18181B',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#27272A',
    gap: 14,
  },
  requestAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  requestAvatarText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#fff',
  },
  requestInfo: { flex: 1 },
  requestName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  requestRelationship: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2563EB',
    marginTop: 2,
  },
  requestDate: {
    fontSize: 11,
    color: '#71717A',
    marginTop: 2,
  },
  requestActions: {
    flexDirection: 'row',
    gap: 8,
  },
  approveBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#22C55E',
    alignItems: 'center',
    justifyContent: 'center',
  },
  denyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#EF444420',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#EF444440',
  },
  btnDisabled: { opacity: 0.5 },
});

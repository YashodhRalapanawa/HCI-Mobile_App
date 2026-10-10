import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, RefreshControl, SafeAreaView, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { donorService } from '../services/donorService';
import { exportDonorsPdf } from '../utils/pdf';
import type { BloodGroup, Donor, DonorRequest } from '../types';

export default function MatchingDonorsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ bloodGroup: BloodGroup; radiusKm: string; eligibleOnly: string; availableNow: string }>();
  const { token } = useAuth();
  const [donors, setDonors] = useState<Donor[]>([]);
  const [requests, setRequests] = useState<DonorRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    if (!params.bloodGroup) return;
    setError('');
    const [found, current] = await Promise.all([
      donorService.search(token, {
        bloodGroup: params.bloodGroup,
        radiusKm: Number(params.radiusKm ?? 10),
        eligibleOnly: params.eligibleOnly !== 'false',
        availableNow: params.availableNow !== 'false',
      }),
      donorService.listRequests(token),
    ]);
    setDonors(found);
    setRequests(current);
  }, [params.bloodGroup, params.radiusKm, params.eligibleOnly, params.availableNow, token]);

  useEffect(() => {
    setLoading(true);
    void load()
      .catch(() => setError('Could not load donors. Please try again.'))
      .finally(() => setLoading(false));
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } catch {
      setError('Could not refresh donors. Please try again.');
    } finally {
      setRefreshing(false);
    }
  };

  const requestFor = (donorId?: string) => requests.find((request) => request.donorId === donorId && request.status === 'pending');

  const toggleRequest = async (donor: Donor) => {
    if (!donor.id || processingId) return;
    const existing = requestFor(donor.id);
    setProcessingId(donor.id);
    setError('');
    try {
      if (existing) {
        await donorService.cancelRequest(token, donor.id);
        setRequests((old) => old.filter((request) => request.donorId !== donor.id));
        Alert.alert('Request cancelled', `Your request to ${donor.name} was cancelled.`);
      } else {
        const created = await donorService.request(token, donor.id);
        setRequests((old) => [created, ...old.filter((request) => request.donorId !== donor.id)]);
        Alert.alert('Request sent', `${donor.name} has been notified.`);
      }
    } catch {
      setError('The request could not be updated. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  const renderDonor = (donor: Donor, index: number) => {
    const existing = requestFor(donor.id);
    const processing = processingId === donor.id;
    return (
      <View style={styles.card} key={donor.id ? `donor-${donor.id}` : `donor-${index}-${donor.name}`}>
        <View style={styles.top}>
          <View style={styles.avatar}><Text style={styles.avatarText}>{donor.avatarInitials}</Text></View>
          <View style={styles.nameBlock}>
            <Text style={styles.name}>{donor.name}</Text>
            <Text style={styles.muted}>{donor.distanceKm} km away • {donor.bloodGroup}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: donor.eligible ? colors.successSoft : colors.dangerSoft }]}>
            <Text style={{ color: donor.eligible ? colors.success : colors.danger, fontSize: 11, fontWeight: '800' }}>
              {donor.eligible ? 'Eligible' : 'Not eligible'}
            </Text>
          </View>
        </View>
        <Text style={styles.muted}>{donor.available ? 'Available now' : 'Currently unavailable'}</Text>
        {existing ? <Text style={styles.pending}>Request pending</Text> : null}
        <TouchableOpacity
          style={styles.profileLink}
          onPress={() => router.push({ pathname: '/profile/public-preview', params: { donorName: donor.name, donorBloodGroup: donor.bloodGroup, donorAvailable: String(donor.available), donorEligible: String(donor.eligible), donorDistance: String(donor.distanceKm) } })}
        >
          <Ionicons name="person-circle-outline" size={18} color={colors.primary} />
          <Text style={styles.profileLinkText}>View Profile</Text>
        </TouchableOpacity>
        <View style={styles.actions}>
          <TouchableOpacity
            disabled={processing || (!existing && !donor.eligible)}
            style={[styles.request, existing && styles.cancel, (!existing && !donor.eligible) && styles.disabled]}
            onPress={() => { void toggleRequest(donor); }}
          >
            {processing ? <ActivityIndicator color={existing ? colors.danger : colors.textInverted} /> : <Text style={[styles.requestText, existing && styles.cancelText]}>{existing ? 'Cancel request' : 'Request'}</Text>}
          </TouchableOpacity>
          <TouchableOpacity style={styles.chat} onPress={() => router.push({ pathname: '/chat', params: { donorId: donor.id, donorName: donor.name } })}>
            <Ionicons name="chatbubble-outline" size={18} color={colors.primary} />
            <Text style={styles.chatText}>Chat</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Matching Donors"
        subtitle={`${donors.length} donors found`}
        rightElement={<TouchableOpacity onPress={() => { void exportDonorsPdf(donors); }} accessibilityLabel="Export matching donors PDF"><Ionicons name="document-text-outline" size={24} color={colors.primary} /></TouchableOpacity>}
      />
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh(); }} tintColor={colors.primary} />}
      >
        {loading ? <ActivityIndicator color={colors.primary} size="large" /> : error ? (
          <View style={styles.empty}><Text style={styles.error}>{error}</Text><TouchableOpacity style={styles.retry} onPress={() => { setLoading(true); void load().catch(() => setError('Could not load donors. Please try again.')).finally(() => setLoading(false)); }}><Text style={styles.retryText}>Retry</Text></TouchableOpacity></View>
        ) : donors.length === 0 ? (
          <View style={styles.empty}><Ionicons name="people-outline" size={48} color={colors.textMuted} /><Text style={styles.heading}>No donors within {params.radiusKm ?? 10} km</Text><Text style={styles.muted}>Increase the radius and try again.</Text></View>
        ) : donors.map(renderDonor)}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: 40 },
  card: { backgroundColor: colors.card, padding: spacing.md, borderRadius: borderRadius.md, marginBottom: spacing.md },
  top: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  avatar: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: colors.primaryDark, fontWeight: '800' },
  nameBlock: { flex: 1, minWidth: 0 },
  name: { color: colors.text, fontWeight: '800', fontSize: 16, flexShrink: 1 },
  muted: { color: colors.textMuted, marginTop: 4, flexShrink: 1 },
  pending: { color: colors.warning, fontSize: 12, fontWeight: '800', marginTop: spacing.sm },
  badge: { padding: 6, borderRadius: borderRadius.sm, marginLeft: spacing.xs, flexShrink: 0 },
  profileLink: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, marginTop: spacing.sm },
  profileLinkText: { color: colors.primary, fontWeight: '800' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  request: { flex: 1, minWidth: 140, minHeight: 44, borderRadius: borderRadius.sm, backgroundColor: colors.primary, alignItems: 'center', justifyContent: 'center' },
  requestText: { color: colors.textInverted, fontWeight: '800', textAlign: 'center' },
  cancel: { backgroundColor: colors.dangerSoft, borderWidth: 1, borderColor: colors.danger },
  cancelText: { color: colors.danger },
  chat: { minWidth: 90, minHeight: 44, borderRadius: borderRadius.sm, borderWidth: 1, borderColor: colors.primary, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 4 },
  chatText: { color: colors.primary, fontWeight: '800' },
  disabled: { opacity: 0.45 },
  empty: { alignItems: 'center', paddingTop: 80, gap: spacing.sm },
  heading: { color: colors.text, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  error: { color: colors.danger, textAlign: 'center' },
  retry: { backgroundColor: colors.primary, paddingHorizontal: spacing.lg, paddingVertical: spacing.sm, borderRadius: borderRadius.sm },
  retryText: { color: colors.textInverted, fontWeight: '800' },
});

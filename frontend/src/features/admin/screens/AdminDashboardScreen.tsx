import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';
import { adminApi } from '../services/adminApi';
import type { AdminSummaryCounts } from '../types';

export const SAMPLE_PREVIEW_SUMMARY: AdminSummaryCounts = {
  pendingPatientRequests: 3,
  approvedAwaitingAssignment: 2,
  activeAssignedRequests: 4,
  recordedArrivalConfirmations: 6,
  availableDonationRequests: 5,
  donorOffers: 12,
  registeredDonors: 48,
};

function formatTime(isoStr: string | null): string {
  if (!isoStr) return 'Just now';
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return 'Just now';
    return d.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return 'Just now';
  }
}

interface SummaryCardConfig {
  id: string;
  countKey: keyof AdminSummaryCounts;
  title: string;
  subtitle: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  softColor: string;
}

const SUMMARY_CARDS: SummaryCardConfig[] = [
  {
    id: 'pending',
    countKey: 'pendingPatientRequests',
    title: 'Pending Patient Requests',
    subtitle: 'Awaiting administrative verification',
    icon: 'time-outline',
    accentColor: colors.tertiaryDark,
    softColor: colors.warningSoft,
  },
  {
    id: 'approved',
    countKey: 'approvedAwaitingAssignment',
    title: 'Approved — Awaiting Assignment',
    subtitle: 'Verified requests needing delivery person assignment',
    icon: 'checkmark-circle-outline',
    accentColor: colors.info,
    softColor: colors.infoSoft,
  },
  {
    id: 'assigned',
    countKey: 'activeAssignedRequests',
    title: 'Active Assigned Deliveries',
    subtitle: 'Delivery person assigned; arrival pending',
    icon: 'bicycle-outline',
    accentColor: colors.primary,
    softColor: colors.primarySoft,
  },
  {
    id: 'arrived',
    countKey: 'recordedArrivalConfirmations',
    title: 'Recorded Arrivals',
    subtitle: 'Requester confirmed arrival; not clinical fulfillment',
    icon: 'shield-checkmark-outline',
    accentColor: colors.success,
    softColor: colors.successSoft,
  },
  {
    id: 'donations',
    countKey: 'availableDonationRequests',
    title: 'Available Donation Requests',
    subtitle: 'Published hospital requests seeking donor responses',
    icon: 'water-outline',
    accentColor: colors.primary,
    softColor: colors.primarySoft,
  },
  {
    id: 'offers',
    countKey: 'donorOffers',
    title: 'Donor Offers',
    subtitle: 'Donors expressing willingness; not completed donations',
    icon: 'heart-outline',
    accentColor: colors.primaryDeep,
    softColor: colors.primaryTonal,
  },
  {
    id: 'donors',
    countKey: 'registeredDonors',
    title: 'Registered Donors',
    subtitle: 'Registered blood donor accounts in community',
    icon: 'people-outline',
    accentColor: colors.secondary,
    softColor: colors.secondarySoft,
  },
];

export function AdminDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const { user, token, isLoading: isAuthLoading } = useAuth();
  const { width } = useWindowDimensions();
  const isDesktop = width >= 768;

  const isPreview = Boolean(__DEV__ && params.preview === '1');

  const [summary, setSummary] = useState<AdminSummaryCounts | null>(
    isPreview ? SAMPLE_PREVIEW_SUMMARY : null,
  );
  const [refreshedAt, setRefreshedAt] = useState<string | null>(
    isPreview ? new Date().toISOString() : null,
  );
  const [isLoading, setIsLoading] = useState(!isPreview);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);

  const fetchSummary = useCallback(
    async (isManual = false) => {
      if (isPreview) {
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (!token || !user) {
        setIsSessionExpired(true);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (user.role !== 'admin') {
        setIsForbidden(true);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      if (isManual) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }
      setErrorMessage(null);

      try {
        const response = await adminApi.getSummary(token);
        setSummary(response.summary);
        setRefreshedAt(response.refreshedAt);
        setIsSessionExpired(false);
        setIsForbidden(false);
      } catch (err: any) {
        const status = err?.status;
        if (status === 401) {
          setIsSessionExpired(true);
        } else if (status === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(err?.message || 'Unable to load admin dashboard summary.');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    },
    [isPreview, token, user],
  );

  useFocusEffect(
    useCallback(() => {
      if (isPreview) return;
      if (!isAuthLoading) {
        void fetchSummary();
      }
    }, [isPreview, isAuthLoading, fetchSummary]),
  );

  const handleManualRefresh = () => {
    if (isPreview) {
      setIsRefreshing(true);
      setTimeout(() => {
        setRefreshedAt(new Date().toISOString());
        setIsRefreshing(false);
      }, 300);
      return;
    }
    void fetchSummary(true);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={[
        styles.scrollContent,
        isDesktop && styles.desktopScrollContent,
      ]}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleManualRefresh}
          colors={[colors.primary]}
          tintColor={colors.primary}
        />
      }
    >
      {/* HEADER BAR */}
      <View style={styles.headerBar}>
        <View style={styles.headerTitleGroup}>
          <Text style={styles.screenHeading}>Dashboard Overview</Text>
          <Text style={styles.screenSubheading}>
            Operational metrics across patient requests, deliveries, and donation campaigns.
          </Text>
        </View>

        <View style={styles.headerActions}>
          <ScreenSwitcher currentScreenId={29} />
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={handleManualRefresh}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Refresh summary counts"
          >
            <Ionicons name="refresh" size={16} color={colors.secondary} />
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* REFRESH STATUS BAR */}
      <View style={styles.statusRow}>
        <View style={styles.liveIndicator}>
          <View style={[styles.liveDot, isPreview && styles.previewDot]} />
          <Text style={styles.liveLabel}>
            {isPreview ? 'Preview Data' : 'Live Data'}
          </Text>
        </View>
        <Text style={styles.refreshedAtText}>
          Last updated: {formatTime(refreshedAt)}
        </Text>
      </View>

      {/* STATES */}
      {isLoading ? (
        <View style={styles.centeredState}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.stateMessage}>Loading operational metrics...</Text>
        </View>
      ) : isSessionExpired ? (
        <View style={styles.cardState}>
          <View style={[styles.stateIconCircle, { backgroundColor: colors.warningSoft }]}>
            <Ionicons name="lock-closed" size={28} color={colors.tertiaryDark} />
          </View>
          <Text style={styles.cardStateTitle}>Authentication Required</Text>
          <Text style={styles.cardStateDesc}>
            Your administrator session has expired. Please sign in with your administrator credentials.
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => router.push('/(auth)/login?returnTo=/admin' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Sign In</Text>
          </TouchableOpacity>
        </View>
      ) : isForbidden ? (
        <View style={styles.cardState}>
          <View style={[styles.stateIconCircle, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="shield-outline" size={28} color={colors.danger} />
          </View>
          <Text style={styles.cardStateTitle}>Administrative Access Only</Text>
          <Text style={styles.cardStateDesc}>
            Access to this portal is restricted to system administrators. Your account does not have administrative privileges.
          </Text>
          <TouchableOpacity
            style={styles.actionButtonSecondary}
            onPress={() => router.replace('/dashboard' as any)}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonSecondaryText}>Go to Home Dashboard</Text>
          </TouchableOpacity>
        </View>
      ) : errorMessage ? (
        <View style={styles.cardState}>
          <View style={[styles.stateIconCircle, { backgroundColor: colors.dangerSoft }]}>
            <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
          </View>
          <Text style={styles.cardStateTitle}>Unable to Load Metrics</Text>
          <Text style={styles.cardStateDesc}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => fetchSummary()}
            activeOpacity={0.8}
          >
            <Text style={styles.actionButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : summary ? (
        <View style={[styles.gridContainer, isDesktop && styles.desktopGrid]}>
          {SUMMARY_CARDS.map((card) => {
            const count = summary[card.countKey] ?? 0;
            const isPatientCard = ['pending', 'approved', 'assigned', 'arrived'].includes(card.id);
            const targetStatus =
              card.id === 'pending'
                ? 'pending_verification'
                : card.id === 'approved'
                ? 'verified'
                : card.id === 'assigned'
                ? 'in_progress'
                : 'all';

            return (
              <TouchableOpacity
                key={card.id}
                style={[
                  styles.card,
                  isDesktop && styles.desktopCard,
                ]}
                onPress={() => {
                  if (isPatientCard) {
                    const url = isPreview
                      ? `/admin/patient-requests?status=${targetStatus}&preview=1`
                      : `/admin/patient-requests?status=${targetStatus}`;
                    router.push(url as any);
                  }
                }}
                activeOpacity={isPatientCard ? 0.75 : 1}
              >
                <View style={styles.cardTopRow}>
                  <View
                    style={[
                      styles.cardIconBox,
                      { backgroundColor: card.softColor },
                    ]}
                  >
                    <Ionicons name={card.icon} size={22} color={card.accentColor} />
                  </View>
                  <Text style={[styles.cardCount, { color: card.accentColor }]}>
                    {count}
                  </Text>
                </View>

                <View style={styles.cardBody}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    {isPatientCard && (
                      <Ionicons name="arrow-forward" size={14} color={card.accentColor} />
                    )}
                  </View>
                  <Text style={styles.cardSubtitle}>{card.subtitle}</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 80,
  },
  desktopScrollContent: {
    padding: spacing.xl,
    paddingBottom: 100,
  },
  headerBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  headerTitleGroup: {
    flex: 1,
    minWidth: 260,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: -0.3,
  },
  screenSubheading: {
    fontSize: 13,
    color: colors.secondaryMuted,
    marginTop: 4,
    lineHeight: 18,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  refreshButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    marginBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.success,
  },
  previewDot: {
    backgroundColor: colors.tertiary,
  },
  liveLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryLight,
  },
  refreshedAtText: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  centeredState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateMessage: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.secondaryMuted,
  },
  cardState: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
    marginTop: spacing.md,
  },
  stateIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  cardStateDesc: {
    fontSize: 13,
    color: colors.secondaryMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
    maxWidth: 400,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  actionButtonSecondary: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingHorizontal: spacing.xl,
    borderRadius: borderRadius.md,
  },
  actionButtonSecondaryText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  gridContainer: {
    gap: spacing.md,
  },
  desktopGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  desktopCard: {
    width: '48.5%',
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  cardIconBox: {
    width: 44,
    height: 44,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardCount: {
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  cardBody: {
    gap: 2,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
  },
  cardSubtitle: {
    fontSize: 12,
    color: colors.secondaryMuted,
    lineHeight: 16,
  },
});

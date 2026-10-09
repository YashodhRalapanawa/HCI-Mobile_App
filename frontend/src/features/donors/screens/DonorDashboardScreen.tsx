import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';
import { donationRequestApi } from '../services/donationRequestApi';
import type { DonationRequestItem, DonationRequestsPagination, DonationRequestUrgency } from '../types';

export const SAMPLE_PREVIEW_REQUESTS: DonationRequestItem[] = [
  {
    id: 'preview-req-1',
    bloodGroup: 'O-',
    unitsRequired: 2,
    hospitalId: 'hosp-1',
    hospitalName: 'National Blood Transfusion Service',
    locationDescription: 'Narahenpita, Colombo 05 — Main Blood Bank Donor Center',
    urgency: 'Urgent',
    neededBy: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'preview-req-2',
    bloodGroup: 'A+',
    unitsRequired: 1,
    hospitalId: 'hosp-2',
    hospitalName: 'Colombo National Hospital',
    locationDescription: 'Regent Street, Colombo 08 — Emergency Ward Intake',
    urgency: 'Urgent',
    neededBy: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    publishedAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'preview-req-3',
    bloodGroup: 'B+',
    unitsRequired: 4,
    hospitalId: 'hosp-3',
    hospitalName: 'Lady Ridgeway Hospital for Children',
    locationDescription: 'Borella, Colombo 08 — Pediatric Hematology Unit',
    urgency: 'Scheduled',
    neededBy: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'published',
    publishedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 26 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'preview-req-4',
    bloodGroup: 'AB-',
    unitsRequired: 1,
    hospitalId: 'hosp-4',
    hospitalName: 'Teaching Hospital Karapitiya',
    locationDescription: 'Galle — Blood Bank Counter 2',
    urgency: 'Scheduled',
    neededBy: null,
    status: 'published',
    publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 50 * 60 * 60 * 1000).toISOString(),
  },
];

function formatNeededByDate(dateStr: string | null): string | null {
  if (!dateStr) return null;
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return null;
  }
}

function getUrgencyBadgeConfig(urgency: DonationRequestUrgency | string) {
  if (urgency === 'Urgent') {
    return {
      label: 'Urgent',
      bgColor: colors.dangerSoft,
      textColor: colors.danger,
      borderColor: '#FECACA',
    };
  }
  return {
    label: 'Scheduled',
    bgColor: colors.infoSoft,
    textColor: colors.info,
    borderColor: '#BFDBFE',
  };
}

export function DonorDashboardScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const { user, token, isLoading: isAuthLoading } = useAuth();

  const isPreview = Boolean(__DEV__ && params.preview === '1');

  const [requests, setRequests] = useState<DonationRequestItem[]>(
    isPreview ? SAMPLE_PREVIEW_REQUESTS : [],
  );
  const [pagination, setPagination] = useState<DonationRequestsPagination | null>(
    isPreview
      ? {
          page: 1,
          limit: 10,
          total: SAMPLE_PREVIEW_REQUESTS.length,
          totalPages: 1,
          hasNextPage: false,
        }
      : null,
  );
  const [isLoading, setIsLoading] = useState(!isPreview);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isForbidden, setIsForbidden] = useState(false);

  const fetchRequests = useCallback(
    async (pageToFetch = 1, isRefreshAction = false) => {
      // In isolated dev preview mode, render preview fixtures without API calls
      if (isPreview) {
        return;
      }

      if (isRefreshAction) {
        setIsRefreshing(true);
      } else if (pageToFetch === 1) {
        setIsLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      setErrorMessage(null);

      // Check client-side authentication readiness
      if (!token || token === 'demo-jwt-token') {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        setIsSessionExpired(true);
        return;
      }

      // Check client-side role
      if (user && user.role !== 'donor') {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
        setIsForbidden(true);
        return;
      }

      try {
        const response = await donationRequestApi.getPublishedRequests(token, pageToFetch, 10);
        setIsSessionExpired(false);
        setIsForbidden(false);

        setRequests((prev) => {
          if (pageToFetch === 1) {
            return response.requests;
          }
          // Deduplicate by id when loading more
          const existingIds = new Set(prev.map((r) => r.id));
          const newUnique = response.requests.filter((r) => !existingIds.has(r.id));
          return [...prev, ...newUnique];
        });

        setPagination(response.pagination);
      } catch (err: any) {
        const status = err?.status;
        if (status === 401) {
          setIsSessionExpired(true);
        } else if (status === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(err?.message || 'Unable to load donation requests. Please try again.');
        }
      } finally {
        setIsLoading(false);
        setIsRefreshing(false);
        setIsLoadingMore(false);
      }
    },
    [isPreview, token, user],
  );

  // Refetch when screen gains focus or auth loading finishes
  useFocusEffect(
    useCallback(() => {
      if (isPreview) return;
      if (!isAuthLoading) {
        void fetchRequests(1, false);
      }
    }, [isPreview, isAuthLoading, fetchRequests]),
  );

  const handleManualRefresh = () => {
    void fetchRequests(1, true);
  };

  const handleLoadMore = () => {
    if (pagination && pagination.hasNextPage && !isLoadingMore && !isLoading) {
      void fetchRequests(pagination.page + 1);
    }
  };

  // User greeting
  const greetingName = user?.name?.trim();
  const greetingText = greetingName ? `Hello, ${greetingName}` : 'Welcome';

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* TOP BAR / SCREEN SWITCHER */}
        <View style={styles.topBar}>
          <ScreenSwitcher currentScreenId={26} />
          {user && (
            <TouchableOpacity
              style={styles.profileBadge}
              onPress={() => router.push('/profile' as any)}
              accessibilityRole="button"
              accessibilityLabel="View profile"
              activeOpacity={0.8}
            >
              <Ionicons name="person-circle-outline" size={26} color={colors.secondary} />
            </TouchableOpacity>
          )}
        </View>

        {/* DEV PREVIEW BANNER */}
        {isPreview && (
          <View style={styles.previewBanner}>
            <Ionicons name="construct-outline" size={16} color={colors.tertiaryDark} />
            <Text style={styles.previewBannerText}>
              Development Preview Mode: Showing sample requests. Database is not modified.
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
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
          {/* HEADER SECTION */}
          <View style={styles.headerSection}>
            <Text style={styles.screenHeading}>Donor dashboard</Text>
            <Text style={styles.greetingText}>{greetingText}</Text>
            <Text style={styles.guidanceText}>
              View donation requests from hospitals and blood banks.
            </Text>
          </View>

          {/* LIST TITLE BAR */}
          <View style={styles.listTitleBar}>
            <Text style={styles.listTitle}>Donation requests</Text>
            {!isLoading && !isSessionExpired && !isForbidden && (
              <TouchableOpacity
                onPress={handleManualRefresh}
                style={styles.refreshButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Refresh donation requests"
              >
                <Ionicons name="refresh" size={16} color={colors.secondaryMuted} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CONDITIONAL CONTENT STATES */}
          {isLoading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.stateMessage}>Loading donation requests...</Text>
            </View>
          ) : isSessionExpired ? (
            <View style={styles.cardState}>
              <View style={[styles.stateIconCircle, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="lock-closed" size={28} color={colors.tertiaryDark} />
              </View>
              <Text style={styles.cardStateTitle}>Authentication Required</Text>
              <Text style={styles.cardStateDesc}>
                Your session has expired or authentication is missing. Please sign in with a registered donor account to view available requests.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => router.push('/(auth)/login' as any)}
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
              <Text style={styles.cardStateTitle}>Donor Access Only</Text>
              <Text style={styles.cardStateDesc}>
                Access is restricted to registered blood donors. Your current role does not have permission to view donation requests.
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
              <Text style={styles.cardStateTitle}>Network Error</Text>
              <Text style={styles.cardStateDesc}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => fetchRequests(1)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : requests.length === 0 ? (
            <View style={styles.cardState}>
              <View style={[styles.stateIconCircle, { backgroundColor: colors.secondarySoft }]}>
                <Ionicons name="water-outline" size={28} color={colors.secondaryMuted} />
              </View>
              <Text style={styles.cardStateTitle}>No donation requests available right now.</Text>
              <Text style={styles.cardStateDesc}>
                Check back soon. Hospitals and blood banks publish urgent donation requests when inventory needs support.
              </Text>
              <TouchableOpacity
                style={styles.actionButtonSecondary}
                onPress={handleManualRefresh}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonSecondaryText}>Check Again</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.requestsList}>
              {requests.map((item) => {
                const urgencyBadge = getUrgencyBadgeConfig(item.urgency);
                const neededByFormatted = formatNeededByDate(item.neededBy);
                const unitsText =
                  item.unitsRequired === 1 ? '1 unit required' : `${item.unitsRequired} units required`;

                return (
                  <View key={item.id} style={styles.requestCard}>
                    {/* CARD HEADER: Blood Group + Urgency */}
                    <View style={styles.cardTopRow}>
                      <View style={styles.bloodGroupBadge}>
                        <Ionicons name="water" size={14} color={colors.primary} />
                        <Text style={styles.bloodGroupText}>{item.bloodGroup}</Text>
                      </View>

                      <View
                        style={[
                          styles.urgencyBadge,
                          {
                            backgroundColor: urgencyBadge.bgColor,
                            borderColor: urgencyBadge.borderColor,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.urgencyText,
                            { color: urgencyBadge.textColor },
                          ]}
                        >
                          {urgencyBadge.label}
                        </Text>
                      </View>
                    </View>

                    {/* CARD BODY: Units & Hospital */}
                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <Ionicons name="medical-outline" size={16} color={colors.primary} />
                        <Text style={styles.unitsText}>{unitsText}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={16} color={colors.secondaryLight} />
                        <Text style={styles.hospitalNameText}>{item.hospitalName}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={16} color={colors.secondaryMuted} />
                        <Text style={styles.locationText}>{item.locationDescription}</Text>
                      </View>

                      {neededByFormatted && (
                        <View style={styles.infoRow}>
                          <Ionicons name="calendar-outline" size={16} color={colors.tertiaryDark} />
                          <Text style={styles.neededByText}>Needed by: {neededByFormatted}</Text>
                        </View>
                      )}
                    </View>

                    {/* CARD ACTION: VIEW DETAILS */}
                    <View style={styles.cardActionRow}>
                      <TouchableOpacity
                        style={styles.viewDetailsButton}
                        onPress={() => {
                          const path = `/donor/requests/${item.id}${isPreview ? '?preview=1' : ''}`;
                          router.push(path as any);
                        }}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`View details for ${item.hospitalName}`}
                      >
                        <Text style={styles.viewDetailsText}>VIEW DETAILS</Text>
                        <Ionicons name="arrow-forward" size={13} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}

              {/* PAGINATION / LOAD MORE */}
              {pagination && pagination.hasNextPage && (
                <View style={styles.paginationContainer}>
                  <TouchableOpacity
                    style={styles.loadMoreButton}
                    onPress={handleLoadMore}
                    disabled={isLoadingMore}
                    activeOpacity={0.8}
                  >
                    {isLoadingMore ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : (
                      <>
                        <Text style={styles.loadMoreText}>Load more requests</Text>
                        <Ionicons name="chevron-down" size={16} color={colors.primary} />
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* BOTTOM NAVIGATION */}
        <BottomNavBar activeTab="home" />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: colors.backgroundCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  profileBadge: {
    padding: spacing.xs,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.tertiarySoft,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    gap: spacing.xs,
  },
  previewBannerText: {
    flex: 1,
    fontSize: 12,
    color: colors.tertiaryDark,
    fontWeight: '500',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.md,
    paddingBottom: 90,
  },
  headerSection: {
    marginBottom: spacing.md,
  },
  screenHeading: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: -0.3,
  },
  greetingText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primaryDark,
    marginTop: 2,
  },
  guidanceText: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 20,
  },
  listTitleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    marginTop: spacing.xs,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshButtonText: {
    fontSize: 13,
    color: colors.secondaryMuted,
    fontWeight: '500',
  },
  centeredState: {
    paddingVertical: spacing.xxl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateMessage: {
    marginTop: spacing.sm,
    fontSize: 14,
    color: colors.textSecondary,
  },
  cardState: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginTop: spacing.sm,
    ...shadows.sm,
  },
  stateIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  cardStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  cardStateDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  actionButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  actionButtonSecondary: {
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonSecondaryText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  requestsList: {
    gap: spacing.sm,
  },
  requestCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingBottom: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  bloodGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  bloodGroupText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '600',
  },
  cardBody: {
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
  },
  unitsText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  hospitalNameText: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.secondaryLight,
    flex: 1,
  },
  locationText: {
    fontSize: 13,
    color: colors.textSecondary,
    flex: 1,
  },
  neededByText: {
    fontSize: 12,
    color: colors.tertiaryDark,
    fontWeight: '500',
    flex: 1,
  },
  paginationContainer: {
    marginTop: spacing.sm,
    alignItems: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.md,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.primary,
  },
  cardActionRow: {
    marginTop: spacing.sm,
    paddingTop: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    alignItems: 'flex-end',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primaryTonal,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
  },
});

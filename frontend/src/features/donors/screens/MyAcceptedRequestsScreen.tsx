import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import type {
  DonationRequestAvailability,
  DonationRequestsPagination,
  DonationRequestUrgency,
  MyAcceptedRequestItem,
} from '../types';

export const SAMPLE_PREVIEW_ACCEPTED_REQUESTS: MyAcceptedRequestItem[] = [
  {
    responseId: 'preview-resp-1',
    donationRequestId: 'preview-req-1',
    acceptedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    bloodGroup: 'O-',
    unitsRequired: 2,
    hospitalName: 'National Blood Transfusion Service',
    locationDescription: 'Narahenpita, Colombo 05 — Main Blood Bank Donor Center',
    urgency: 'Urgent',
    neededBy: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
    availability: 'open',
    canViewDetails: true,
  },
  {
    responseId: 'preview-resp-2',
    donationRequestId: 'preview-req-3',
    acceptedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    bloodGroup: 'B+',
    unitsRequired: 4,
    hospitalName: 'Lady Ridgeway Hospital for Children',
    locationDescription: 'Borella, Colombo 08 — Pediatric Hematology Unit',
    urgency: 'Scheduled',
    neededBy: new Date(Date.now() + 6 * 24 * 60 * 60 * 1000).toISOString(),
    availability: 'open',
    canViewDetails: true,
  },
  {
    responseId: 'preview-resp-3',
    donationRequestId: 'preview-req-closed',
    acceptedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    bloodGroup: 'A+',
    unitsRequired: 1,
    hospitalName: 'Colombo National Hospital',
    locationDescription: 'Regent Street, Colombo 08 — Emergency Ward Intake',
    urgency: 'Urgent',
    neededBy: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    availability: 'closed',
    canViewDetails: true,
  },
  {
    responseId: 'preview-resp-4',
    donationRequestId: 'preview-req-expired',
    acceptedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    bloodGroup: 'AB-',
    unitsRequired: 1,
    hospitalName: 'Teaching Hospital Karapitiya',
    locationDescription: 'Galle — Blood Bank Counter 2',
    urgency: 'Scheduled',
    neededBy: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    availability: 'expired',
    canViewDetails: true,
  },
];

function formatAcceptedAt(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return 'Recently';
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return 'Recently';
  }
}

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

function getUrgencyBadgeConfig(urgency: DonationRequestUrgency | null) {
  if (urgency === 'Urgent') {
    return {
      label: 'Urgent',
      bgColor: colors.dangerSoft,
      textColor: colors.danger,
      borderColor: '#FECACA',
    };
  }
  if (urgency === 'Scheduled') {
    return {
      label: 'Scheduled',
      bgColor: colors.infoSoft,
      textColor: colors.info,
      borderColor: '#BFDBFE',
    };
  }
  return null;
}

function getAvailabilityBadgeConfig(availability: DonationRequestAvailability) {
  switch (availability) {
    case 'open':
      return {
        label: 'Open for Donations',
        bgColor: colors.successSoft,
        textColor: colors.success,
        borderColor: '#BBF7D0',
        icon: 'checkmark-circle-outline' as const,
        description: 'This request is actively accepting donor responses.',
      };
    case 'closed':
      return {
        label: 'Closed by Administration',
        bgColor: '#F1F5F9',
        textColor: '#64748B',
        borderColor: '#CBD5E1',
        icon: 'lock-closed-outline' as const,
        description: 'The hospital or admin closed this request. This does not confirm a completed donation.',
      };
    case 'expired':
      return {
        label: 'Deadline Passed',
        bgColor: colors.warningSoft,
        textColor: colors.tertiaryDark,
        borderColor: '#FDE68A',
        icon: 'time-outline' as const,
        description: 'The requested needed-by date has passed.',
      };
    case 'unavailable':
    default:
      return {
        label: 'Details Unavailable',
        bgColor: '#F1F5F9',
        textColor: '#94A3B8',
        borderColor: '#E2E8F0',
        icon: 'alert-circle-outline' as const,
        description: 'Request details are not currently accessible.',
      };
  }
}

export function MyAcceptedRequestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const { user, token, isLoading: isAuthLoading } = useAuth();

  const isPreview = Boolean(__DEV__ && params.preview === '1');

  const [acceptedRequests, setAcceptedRequests] = useState<MyAcceptedRequestItem[]>(
    isPreview ? SAMPLE_PREVIEW_ACCEPTED_REQUESTS : [],
  );
  const [pagination, setPagination] = useState<DonationRequestsPagination | null>(
    isPreview
      ? {
          page: 1,
          limit: 10,
          total: SAMPLE_PREVIEW_ACCEPTED_REQUESTS.length,
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

  // Stale-response guard: ignore out-of-order in-flight requests and clear data on user change
  const currentReqCountRef = useRef(0);
  const [prevUserId, setPrevUserId] = useState(user?.id);

  if (user?.id !== prevUserId) {
    setPrevUserId(user?.id);
    if (!isPreview) {
      setAcceptedRequests([]);
      setPagination(null);
      setErrorMessage(null);
      setIsSessionExpired(false);
      setIsForbidden(false);
    }
  }

  const fetchAcceptedRequests = useCallback(
    async (pageToFetch = 1, isManualRefresh = false) => {
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

      if (user.role !== 'donor') {
        setIsForbidden(true);
        setIsLoading(false);
        setIsRefreshing(false);
        return;
      }

      const reqId = ++currentReqCountRef.current;

      if (pageToFetch === 1) {
        if (isManualRefresh) {
          setIsRefreshing(true);
        } else {
          setIsLoading(true);
        }
      } else {
        setIsLoadingMore(true);
      }

      setErrorMessage(null);

      try {
        const response = await donationRequestApi.getMyAcceptedRequests(token, pageToFetch, 10);

        // Discard out-of-order in-flight responses
        if (reqId !== currentReqCountRef.current) return;

        if (pageToFetch === 1) {
          setAcceptedRequests(response.acceptedRequests);
        } else {
          setAcceptedRequests((prev) => {
            const existingIds = new Set(prev.map((r) => r.responseId));
            const newUnique = response.acceptedRequests.filter((r) => !existingIds.has(r.responseId));
            return [...prev, ...newUnique];
          });
        }

        setPagination(response.pagination);
        setIsSessionExpired(false);
        setIsForbidden(false);
      } catch (err: any) {
        if (reqId !== currentReqCountRef.current) return;

        const status = err?.status;
        if (status === 401) {
          setIsSessionExpired(true);
        } else if (status === 403) {
          setIsForbidden(true);
        } else {
          setErrorMessage(err?.message || 'Unable to load your accepted donation requests.');
        }
      } finally {
        if (reqId === currentReqCountRef.current) {
          setIsLoading(false);
          setIsRefreshing(false);
          setIsLoadingMore(false);
        }
      }
    },
    [isPreview, token, user],
  );

  useFocusEffect(
    useCallback(() => {
      if (isPreview) return;
      if (!isAuthLoading) {
        void fetchAcceptedRequests(1);
      }
    }, [isPreview, isAuthLoading, fetchAcceptedRequests]),
  );

  const handleManualRefresh = () => {
    if (isPreview) {
      setIsRefreshing(true);
      setTimeout(() => {
        setAcceptedRequests(SAMPLE_PREVIEW_ACCEPTED_REQUESTS);
        setIsRefreshing(false);
      }, 300);
      return;
    }
    void fetchAcceptedRequests(1, true);
  };

  const handleLoadMore = () => {
    if (isPreview || !pagination?.hasNextPage || isLoadingMore || isLoading) return;
    void fetchAcceptedRequests(pagination.page + 1);
  };

  const handleCancelResponse = (item: MyAcceptedRequestItem) => {
    if (isPreview || !token) return;

    Alert.alert(
      'Cancel donation response?',
      `You will no longer be listed as a donor for ${item.hospitalName}.`,
      [
        { text: 'Keep response', style: 'cancel' },
        {
          text: 'Cancel response',
          style: 'destructive',
          onPress: async () => {
            try {
              await donationRequestApi.cancelDonationResponse(token, item.donationRequestId);
              setAcceptedRequests((current) =>
                current.filter((request) => request.responseId !== item.responseId),
              );
              setPagination((current) =>
                current
                  ? { ...current, total: Math.max(0, current.total - 1) }
                  : current,
              );
              Alert.alert('Response cancelled', 'Your donation response was cancelled successfully.');
            } catch (error: any) {
              Alert.alert(
                'Unable to cancel response',
                error?.message || 'Please try again.',
              );
            }
          },
        },
      ],
    );
  };

  const handleBackToDashboard = () => {
    if (isPreview) {
      router.replace('/donor/dashboard?preview=1' as any);
    } else {
      router.replace('/donor/dashboard' as any);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToDashboard}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to Donor Dashboard"
          >
            <Ionicons name="arrow-back" size={22} color={colors.secondary} />
            <Text style={styles.backButtonText}>Dashboard</Text>
          </TouchableOpacity>
          <ScreenSwitcher currentScreenId={28} />
        </View>

        {/* DEV PREVIEW BANNER */}
        {isPreview && (
          <View style={styles.previewBanner}>
            <Ionicons name="construct-outline" size={16} color={colors.tertiaryDark} />
            <Text style={styles.previewBannerText}>
              Development Preview Mode: Showing sample accepted requests. Database is not modified.
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
            <Text style={styles.screenHeading}>My accepted requests</Text>
            <Text style={styles.guidanceText}>Requests you have offered to donate for.</Text>
          </View>

          {/* LIST TITLE BAR */}
          <View style={styles.listTitleBar}>
            <Text style={styles.listTitle}>Your responses</Text>
            {!isLoading && !isSessionExpired && !isForbidden && (
              <TouchableOpacity
                onPress={handleManualRefresh}
                style={styles.refreshButton}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Refresh accepted requests"
              >
                <Ionicons name="refresh" size={16} color={colors.secondaryMuted} />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* CONDITIONAL STATES */}
          {isLoading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.stateMessage}>Loading your accepted requests...</Text>
            </View>
          ) : isSessionExpired ? (
            <View style={styles.cardState}>
              <View style={[styles.stateIconCircle, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="lock-closed" size={28} color={colors.tertiaryDark} />
              </View>
              <Text style={styles.cardStateTitle}>Authentication Required</Text>
              <Text style={styles.cardStateDesc}>
                Your session has expired or authentication is missing. Please sign in with your registered donor account.
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
                Access is restricted to registered blood donors.
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
              <Text style={styles.cardStateTitle}>Unable to Load Requests</Text>
              <Text style={styles.cardStateDesc}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => fetchAcceptedRequests(1)}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : acceptedRequests.length === 0 ? (
            <View style={styles.cardState}>
              <View style={[styles.stateIconCircle, { backgroundColor: colors.secondarySoft }]}>
                <Ionicons name="clipboard-outline" size={28} color={colors.secondaryMuted} />
              </View>
              <Text style={styles.cardStateTitle}>No accepted donation requests yet.</Text>
              <Text style={styles.cardStateDesc}>
                When you express willingness to donate for an open hospital request, it will appear here so you can review details.
              </Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleBackToDashboard}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Browse donation requests</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.cardsContainer}>
              {acceptedRequests.map((item) => {
                const urgencyBadge = getUrgencyBadgeConfig(item.urgency);
                const availabilityBadge = getAvailabilityBadgeConfig(item.availability);
                const neededByFormatted = formatNeededByDate(item.neededBy);
                const acceptedFormatted = formatAcceptedAt(item.acceptedAt);
                const unitsText = item.unitsRequired
                  ? item.unitsRequired === 1
                    ? '1 unit requested'
                    : `${item.unitsRequired} units requested`
                  : 'Units: Information unavailable';

                return (
                  <View key={item.responseId} style={styles.card}>
                    {/* CARD HEADER: Blood Group & Urgency */}
                    <View style={styles.cardHeader}>
                      <View style={styles.bloodGroupBadge}>
                        <Ionicons name="water" size={16} color={colors.primary} />
                        <Text style={styles.bloodGroupText}>
                          {item.bloodGroup || '--'}
                        </Text>
                      </View>

                      {urgencyBadge && (
                        <View
                          style={[
                            styles.urgencyBadge,
                            {
                              backgroundColor: urgencyBadge.bgColor,
                              borderColor: urgencyBadge.borderColor,
                            },
                          ]}
                        >
                          <Text style={[styles.urgencyText, { color: urgencyBadge.textColor }]}>
                            {urgencyBadge.label}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* YOU OFFERED TO DONATE BANNER */}
                    <View style={styles.offeredBanner}>
                      <View style={styles.offeredLeft}>
                        <Ionicons name="checkmark-circle" size={18} color={colors.success} />
                        <Text style={styles.offeredTitle}>You offered to donate</Text>
                      </View>
                      <Text style={styles.offeredDate}>Offered {acceptedFormatted}</Text>
                    </View>

                    {/* CARD BODY: Hospital, Location, Units */}
                    <View style={styles.cardBody}>
                      <View style={styles.infoRow}>
                        <Ionicons name="medical-outline" size={16} color={colors.primary} />
                        <Text style={styles.unitsText}>{unitsText}</Text>
                      </View>

                      <View style={styles.infoRow}>
                        <Ionicons name="business-outline" size={16} color={colors.secondaryLight} />
                        <Text style={styles.hospitalNameText}>{item.hospitalName}</Text>
                      </View>

                      {item.locationDescription && (
                        <View style={styles.infoRow}>
                          <Ionicons name="location-outline" size={16} color={colors.secondaryMuted} />
                          <Text style={styles.locationText}>{item.locationDescription}</Text>
                        </View>
                      )}

                      {neededByFormatted && (
                        <View style={styles.infoRow}>
                          <Ionicons name="calendar-outline" size={16} color={colors.tertiaryDark} />
                          <Text style={styles.neededByText}>Needed by: {neededByFormatted}</Text>
                        </View>
                      )}
                    </View>

                    {/* AVAILABILITY STATUS NOTICE */}
                    <View
                      style={[
                        styles.availabilityNotice,
                        {
                          backgroundColor: availabilityBadge.bgColor,
                          borderColor: availabilityBadge.borderColor,
                        },
                      ]}
                    >
                      <View style={styles.availabilityHeaderRow}>
                        <Ionicons
                          name={availabilityBadge.icon}
                          size={16}
                          color={availabilityBadge.textColor}
                        />
                        <Text
                          style={[
                            styles.availabilityBadgeText,
                            { color: availabilityBadge.textColor },
                          ]}
                        >
                          {availabilityBadge.label}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.availabilityDescText,
                          { color: availabilityBadge.textColor },
                        ]}
                      >
                        {availabilityBadge.description}
                      </Text>
                    </View>

                    {/* ACTION ROW: VIEW DETAILS AND CANCEL RESPONSE */}
                    {(item.canViewDetails || item.availability === 'open') && (
                      <View style={styles.cardActionRow}>
                        {item.canViewDetails && (
                          <TouchableOpacity
                            style={styles.viewDetailsButton}
                            onPress={() => {
                              const path = `/donor/requests/${item.donationRequestId}?origin=accepted${
                                isPreview ? '&preview=1' : ''
                              }`;
                              router.push(path as any);
                            }}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`View details for donation request at ${item.hospitalName}`}
                          >
                            <Text style={styles.viewDetailsText}>VIEW DETAILS</Text>
                            <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                          </TouchableOpacity>
                        )}
                        {item.availability === 'open' && (
                          <TouchableOpacity
                            style={styles.cancelResponseButton}
                            onPress={() => handleCancelResponse(item)}
                            activeOpacity={0.7}
                            accessibilityRole="button"
                            accessibilityLabel={`Cancel donation response for ${item.hospitalName}`}
                          >
                            <Ionicons name="close-circle-outline" size={15} color={colors.danger} />
                            <Text style={styles.cancelResponseText}>CANCEL RESPONSE</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              {/* PAGINATION LOAD MORE */}
              {pagination?.hasNextPage && (
                <View style={styles.loadMoreContainer}>
                  {isLoadingMore ? (
                    <ActivityIndicator size="small" color={colors.primary} />
                  ) : (
                    <TouchableOpacity
                      style={styles.loadMoreButton}
                      onPress={handleLoadMore}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.loadMoreText}>Load More</Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </View>
          )}
        </ScrollView>

        <BottomNavBar activeTab="profile" />
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
    backgroundColor: colors.background,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs,
    paddingRight: spacing.sm,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    marginLeft: 4,
  },
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warningSoft,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: '#FDE68A',
  },
  previewBannerText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.tertiaryDark,
    marginLeft: spacing.xs,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 100,
  },
  headerSection: {
    marginBottom: spacing.md,
  },
  screenHeading: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.secondary,
    letterSpacing: -0.3,
  },
  guidanceText: {
    fontSize: 14,
    color: colors.secondaryMuted,
    marginTop: 4,
  },
  listTitleBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.secondary,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  refreshButtonText: {
    fontSize: 13,
    color: colors.secondaryMuted,
    marginLeft: 4,
    fontWeight: '500',
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
  cardsContainer: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  bloodGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primarySoft,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  bloodGroupText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.primary,
    marginLeft: 4,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  offeredBanner: {
    backgroundColor: colors.successSoft,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  offeredLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offeredTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.success,
    marginLeft: 6,
  },
  offeredDate: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 2,
    marginLeft: 24,
  },
  cardBody: {
    marginBottom: spacing.sm,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 4,
  },
  unitsText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
    marginLeft: 8,
    flex: 1,
  },
  hospitalNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondaryLight,
    marginLeft: 8,
    flex: 1,
  },
  locationText: {
    fontSize: 12,
    color: colors.secondaryMuted,
    marginLeft: 8,
    flex: 1,
    lineHeight: 16,
  },
  neededByText: {
    fontSize: 12,
    color: colors.tertiaryDark,
    marginLeft: 8,
    flex: 1,
    fontWeight: '500',
  },
  availabilityNotice: {
    borderRadius: borderRadius.md,
    padding: spacing.sm,
    borderWidth: 1,
    marginBottom: spacing.sm,
  },
  availabilityHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    marginLeft: 6,
  },
  availabilityDescText: {
    fontSize: 11,
    marginTop: 3,
    lineHeight: 15,
  },
  cardActionRow: {
    borderTopWidth: 1,
    borderTopColor: colors.borderLight,
    paddingTop: spacing.sm,
    alignItems: 'flex-end',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  viewDetailsText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: 0.5,
    marginRight: 4,
  },
  cancelResponseButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  cancelResponseText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.danger,
    letterSpacing: 0.5,
    marginLeft: 4,
  },
  loadMoreContainer: {
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  loadMoreButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 8,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    backgroundColor: colors.card,
  },
  loadMoreText: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.secondary,
  },
});

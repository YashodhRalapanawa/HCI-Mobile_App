import React, { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
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
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';
import { donationRequestApi } from '../services/donationRequestApi';
import { SAMPLE_PREVIEW_REQUESTS } from './DonorDashboardScreen';
import type {
  DonationRequestDetailItem,
  DonationRequestUrgency,
  DonationResponseDto,
} from '../types';

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

function formatAcceptedAt(dateStr: string | null): string {
  if (!dateStr) return 'Recently';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
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

export function DonationRequestDetailScreen() {
  const router = useRouter();
  const { id, preview } = useLocalSearchParams<{ id?: string; preview?: string }>();
  const { token, user, isLoading: isAuthLoading } = useAuth();

  const isPreview = Boolean(
    __DEV__ && (preview === '1' || (typeof id === 'string' && id.startsWith('preview-'))),
  );

  const initialPreviewRequest: DonationRequestDetailItem | null = isPreview
    ? (() => {
        const match = SAMPLE_PREVIEW_REQUESTS.find((r) => r.id === id) || SAMPLE_PREVIEW_REQUESTS[0];
        return match ? { ...match, isAvailable: true, donorResponse: null } : null;
      })()
    : null;

  const [request, setRequest] = useState<DonationRequestDetailItem | null>(initialPreviewRequest);
  const [donorResponse, setDonorResponse] = useState<DonationResponseDto | null>(null);
  const [isLoading, setIsLoading] = useState(!isPreview);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSessionExpired, setIsSessionExpired] = useState(false);
  const [isNotFound, setIsNotFound] = useState(Boolean(isPreview && !initialPreviewRequest));
  const [isForbidden, setIsForbidden] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const fetchDetails = useCallback(async () => {
    if (isPreview || !id) return;

    if (!token || token === 'demo-jwt-token') {
      setIsSessionExpired(true);
      setIsLoading(false);
      return;
    }

    if (user && user.role !== 'donor') {
      setIsForbidden(true);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const response = await donationRequestApi.getRequestDetails(token, id);
      setRequest(response.request);
      setDonorResponse(response.request.donorResponse);
      setIsSessionExpired(false);
      setIsForbidden(false);
      setIsNotFound(false);
    } catch (err: any) {
      const status = err?.status;
      if (status === 401) {
        setIsSessionExpired(true);
      } else if (status === 403) {
        setIsForbidden(true);
      } else if (status === 404 || status === 400) {
        setIsNotFound(true);
      } else {
        setErrorMessage(err?.message || 'Unable to load donation request details.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [isPreview, id, token, user]);

  useFocusEffect(
    useCallback(() => {
      if (isPreview) return;
      if (!isAuthLoading) {
        void fetchDetails();
      }
    }, [isPreview, isAuthLoading, fetchDetails]),
  );

  // Handle "I CAN DONATE" action
  const handleConfirmDonate = async () => {
    setShowConfirmModal(false);

    // If in preview mode, simulate acceptance locally without making API call
    if (isPreview) {
      const mockResponse: DonationResponseDto = {
        status: 'accepted',
        acceptedAt: new Date().toISOString(),
      };
      setDonorResponse(mockResponse);
      if (request) {
        setRequest({
          ...request,
          donorResponse: mockResponse,
        });
      }
      return;
    }

    if (!id || !token) return;

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const response = await donationRequestApi.acceptDonationRequest(token, id);
      setDonorResponse(response.donorResponse);
      if (request) {
        setRequest({
          ...request,
          donorResponse: response.donorResponse,
        });
      }
    } catch (err: any) {
      const status = err?.status;
      if (status === 401) {
        setIsSessionExpired(true);
      } else if (status === 403) {
        setIsForbidden(true);
      } else {
        setErrorMessage(
          err?.message || 'Unable to record your willingness to donate. Please try again.',
        );
        // Refresh request availability in case it was closed/expired
        void fetchDetails();
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleBackToDashboard = () => {
    if (isPreview) {
      router.replace('/donor/dashboard?preview=1' as any);
    } else {
      router.replace('/donor/dashboard' as any);
    }
  };

  const urgencyBadge = request ? getUrgencyBadgeConfig(request.urgency) : null;
  const neededByFormatted = request ? formatNeededByDate(request.neededBy) : null;
  const unitsText = request
    ? request.unitsRequired === 1
      ? '1 unit required'
      : `${request.unitsRequired} units required`
    : '';

  const isAccepted = Boolean(donorResponse || request?.donorResponse);
  const acceptedTimestamp = donorResponse?.acceptedAt || request?.donorResponse?.acceptedAt || null;

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
            accessibilityLabel="Back to donation requests"
          >
            <Ionicons name="arrow-back" size={22} color={colors.secondary} />
            <Text style={styles.backButtonText}>Requests</Text>
          </TouchableOpacity>
          <ScreenSwitcher currentScreenId={27} />
        </View>

        {/* DEV PREVIEW BANNER */}
        {isPreview && (
          <View style={styles.previewBanner}>
            <Ionicons name="construct-outline" size={16} color={colors.tertiaryDark} />
            <Text style={styles.previewBannerText}>
              Development Preview Mode: Showing sample request details. Database is not modified.
            </Text>
          </View>
        )}

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER TITLE */}
          <View style={styles.headerSection}>
            <Text style={styles.screenHeading}>Donation request</Text>
            {request && (
              <Text style={styles.requestReferenceText}>
                Reference: #{request.id.slice(-8).toUpperCase()}
              </Text>
            )}
          </View>

          {/* CONDITIONAL CONTENT STATES */}
          {isLoading ? (
            <View style={styles.centeredState}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.stateMessage}>Loading donation request details...</Text>
            </View>
          ) : isSessionExpired ? (
            <View style={styles.cardState}>
              <View style={[styles.stateIconCircle, { backgroundColor: colors.warningSoft }]}>
                <Ionicons name="lock-closed" size={28} color={colors.tertiaryDark} />
              </View>
              <Text style={styles.cardStateTitle}>Authentication Required</Text>
              <Text style={styles.cardStateDesc}>
                Your session has expired or authentication is missing. Please sign in with a registered donor account to view this request.
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
                onPress={handleBackToDashboard}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonSecondaryText}>Back to Dashboard</Text>
              </TouchableOpacity>
            </View>
          ) : isNotFound ? (
            <View style={styles.cardState}>
              <View style={[styles.stateIconCircle, { backgroundColor: colors.secondarySoft }]}>
                <Ionicons name="search-outline" size={28} color={colors.secondaryMuted} />
              </View>
              <Text style={styles.cardStateTitle}>Donation Request Not Found</Text>
              <Text style={styles.cardStateDesc}>
                This donation request could not be found or is not currently published.
              </Text>
              <TouchableOpacity
                style={styles.actionButtonSecondary}
                onPress={handleBackToDashboard}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonSecondaryText}>Back to Requests</Text>
              </TouchableOpacity>
            </View>
          ) : errorMessage && !request ? (
            <View style={styles.cardState}>
              <View style={[styles.stateIconCircle, { backgroundColor: colors.dangerSoft }]}>
                <Ionicons name="alert-circle-outline" size={28} color={colors.danger} />
              </View>
              <Text style={styles.cardStateTitle}>Error Loading Request</Text>
              <Text style={styles.cardStateDesc}>{errorMessage}</Text>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={fetchDetails}
                activeOpacity={0.8}
              >
                <Text style={styles.actionButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          ) : request && (
            <View style={styles.detailsContent}>
              {/* SUBMISSION ERROR ALERT (IF ANY) */}
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <Ionicons name="alert-circle" size={18} color={colors.danger} />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {/* CARD: CORE DETAILS */}
              <View style={styles.detailsCard}>
                {/* TOP ROW: BLOOD GROUP & URGENCY */}
                <View style={styles.cardTopRow}>
                  <View style={styles.bloodGroupBadge}>
                    <Ionicons name="water" size={18} color={colors.primary} />
                    <Text style={styles.bloodGroupText}>{request.bloodGroup}</Text>
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

                {/* DETAILS FIELDS */}
                <View style={styles.fieldList}>
                  <View style={styles.fieldRow}>
                    <Ionicons name="medical-outline" size={18} color={colors.primary} />
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>Requested Units</Text>
                      <Text style={styles.fieldValue}>{unitsText}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <Ionicons name="business-outline" size={18} color={colors.secondaryLight} />
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>Hospital / Blood Bank</Text>
                      <Text style={styles.fieldValue}>{request.hospitalName}</Text>
                    </View>
                  </View>

                  <View style={styles.fieldRow}>
                    <Ionicons name="location-outline" size={18} color={colors.secondaryMuted} />
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>Location & Destination</Text>
                      <Text style={styles.fieldValue}>{request.locationDescription}</Text>
                    </View>
                  </View>

                  {neededByFormatted && (
                    <View style={styles.fieldRow}>
                      <Ionicons name="calendar-outline" size={18} color={colors.tertiaryDark} />
                      <View style={styles.fieldContent}>
                        <Text style={styles.fieldLabel}>Needed By</Text>
                        <Text style={styles.fieldValue}>{neededByFormatted}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.fieldRow}>
                    <Ionicons
                      name={request.isAvailable ? 'checkmark-circle-outline' : 'close-circle-outline'}
                      size={18}
                      color={request.isAvailable ? colors.success : colors.secondaryMuted}
                    />
                    <View style={styles.fieldContent}>
                      <Text style={styles.fieldLabel}>Availability Status</Text>
                      <Text
                        style={[
                          styles.fieldValue,
                          { color: request.isAvailable ? colors.success : colors.secondaryMuted },
                        ]}
                      >
                        {request.isAvailable
                          ? 'Available for donations'
                          : 'Closed or past deadline'}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* POST-ACCEPTANCE SUCCESS STATE */}
              {isAccepted ? (
                <View style={styles.acceptedCard}>
                  <View style={styles.acceptedHeader}>
                    <View style={styles.acceptedIconCircle}>
                      <Ionicons name="checkmark" size={24} color="#FFFFFF" />
                    </View>
                    <View style={styles.acceptedHeaderTextContainer}>
                      <Text style={styles.acceptedTitle}>You offered to donate</Text>
                      <Text style={styles.acceptedDate}>
                        Offered: {formatAcceptedAt(acceptedTimestamp)}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.acceptedDescription}>
                    Your willingness to donate has been recorded. The hospital or blood bank has been notified of your response.
                  </Text>

                  {/* NON-INTERACTIVE ACCEPTED STATE BADGE */}
                  <View style={styles.recordedBadge}>
                    <Ionicons name="shield-checkmark" size={16} color={colors.success} />
                    <Text style={styles.recordedBadgeText}>Willingness Recorded</Text>
                  </View>

                  <TouchableOpacity
                    style={styles.backToRequestsButton}
                    onPress={handleBackToDashboard}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="arrow-back" size={16} color={colors.secondary} />
                    <Text style={styles.backToRequestsButtonText}>Back to donation requests</Text>
                  </TouchableOpacity>
                </View>
              ) : !request.isAvailable ? (
                /* UNAVAILABLE STATE (EXPIRED OR CLOSED) */
                <View style={styles.unavailableCard}>
                  <Ionicons name="time-outline" size={24} color={colors.secondaryMuted} />
                  <Text style={styles.unavailableTitle}>Request No Longer Available</Text>
                  <Text style={styles.unavailableDesc}>
                    This donation request has closed or its needed-by deadline has passed. New donation offers cannot be accepted at this time.
                  </Text>
                  <TouchableOpacity
                    style={styles.actionButtonSecondary}
                    onPress={handleBackToDashboard}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.actionButtonSecondaryText}>Back to donation requests</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                /* ACTION SECTION: GUIDANCE & "I CAN DONATE" BUTTON */
                <View style={styles.actionSection}>
                  <View style={styles.guidanceNotice}>
                    <Ionicons name="information-circle-outline" size={18} color={colors.secondaryLight} />
                    <Text style={styles.guidanceNoticeText}>
                      Accepting lets the hospital or blood bank know you are willing to donate. It does not confirm an appointment or a completed donation.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={[styles.donateButton, isSubmitting && styles.donateButtonDisabled]}
                    onPress={() => setShowConfirmModal(true)}
                    disabled={isSubmitting}
                    activeOpacity={0.8}
                    accessibilityRole="button"
                    accessibilityLabel="I can donate"
                  >
                    {isSubmitting ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="heart" size={18} color="#FFFFFF" />
                        <Text style={styles.donateButtonText}>I CAN DONATE</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </ScrollView>

        {/* CONFIRMATION MODAL */}
        <Modal
          visible={showConfirmModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowConfirmModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalDialog}>
              <View style={styles.modalIconCircle}>
                <Ionicons name="water" size={28} color={colors.primary} />
              </View>

              <Text style={styles.modalTitle}>Confirm your willingness to donate?</Text>

              <Text style={styles.modalMessage}>
                Accepting lets the hospital or blood bank know you are willing to donate. It does not confirm an appointment or completed donation.
              </Text>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.modalCancelButton}
                  onPress={() => setShowConfirmModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCancelText}>Not now</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.modalConfirmButton}
                  onPress={handleConfirmDonate}
                  activeOpacity={0.8}
                >
                  <Text style={styles.modalConfirmText}>I can donate</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: spacing.xs,
    paddingHorizontal: 4,
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
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
    paddingBottom: 40,
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
  requestReferenceText: {
    fontSize: 13,
    color: colors.textSecondary,
    fontWeight: '500',
    marginTop: 2,
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
    marginTop: spacing.sm,
  },
  actionButtonSecondaryText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 14,
  },
  detailsContent: {
    gap: spacing.md,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBannerText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
    fontWeight: '500',
  },
  detailsCard: {
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
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.sm,
  },
  bloodGroupBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  bloodGroupText: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.primaryDark,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '600',
  },
  fieldList: {
    gap: spacing.sm,
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
  },
  fieldContent: {
    flex: 1,
  },
  fieldLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  fieldValue: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '600',
    marginTop: 1,
  },
  actionSection: {
    gap: spacing.sm,
  },
  guidanceNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.xs,
    backgroundColor: colors.secondarySoft,
    padding: spacing.sm,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  guidanceNoticeText: {
    flex: 1,
    fontSize: 12,
    color: colors.secondaryLight,
    lineHeight: 18,
  },
  donateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  donateButtonDisabled: {
    opacity: 0.7,
  },
  donateButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  acceptedCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#A7F3D0',
    gap: spacing.sm,
    ...shadows.sm,
  },
  acceptedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  acceptedIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptedHeaderTextContainer: {
    flex: 1,
  },
  acceptedTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  acceptedDate: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 1,
  },
  acceptedDescription: {
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
  },
  recordedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  recordedBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.success,
  },
  backToRequestsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.secondarySoft,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginTop: spacing.xs,
  },
  backToRequestsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  unavailableCard: {
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.borderLight,
    gap: spacing.xs,
    ...shadows.sm,
  },
  unavailableTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
  },
  unavailableDesc: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalDialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.backgroundCard,
    borderRadius: borderRadius.xl,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.md,
  },
  modalIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  modalMessage: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    width: '100%',
    gap: spacing.sm,
  },
  modalCancelButton: {
    flex: 1,
    backgroundColor: colors.secondarySoft,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  modalConfirmButton: {
    flex: 1,
    backgroundColor: colors.primary,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  modalConfirmText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

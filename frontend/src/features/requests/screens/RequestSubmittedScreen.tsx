import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { requestApi } from '../services/requestApi';
import type { CreatedRequestResponse } from '../types';

export function RequestSubmittedScreen() {
  const router = useRouter();
  const { id, mode } = useLocalSearchParams<{ id: string; mode?: string }>();
  const isDetailsMode = mode === 'details';
  const { token } = useAuth();

  const [request, setRequest] = useState<CreatedRequestResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<
    'unauthenticated' | 'not_found' | 'forbidden' | 'network' | 'preview_guidance' | null
  >(null);
  const [copiedRef, setCopiedRef] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadRequest() {
      setLoading(true);
      setErrorMessage(null);
      setErrorType(null);

      // Resolve effective request ID (support preview route or AsyncStorage fallback)
      let targetId = id;
      if (!targetId || targetId === 'preview' || targetId === 'latest') {
        try {
          const storedId = await AsyncStorage.getItem('latest_submitted_request_id');
          if (storedId) {
            targetId = storedId;
          }
        } catch {
          // ignore storage read failure
        }
      }

      if (!targetId || targetId === 'preview' || targetId === 'latest') {
        if (isMounted) {
          setErrorType('preview_guidance');
          setErrorMessage(
            'No recent blood request found in this session. Please submit a blood request from Member 2.1 first to view its confirmation.',
          );
          setLoading(false);
        }
        return;
      }

      const isRealSession = Boolean(
        token &&
        token !== 'demo-jwt-token' &&
        token !== 'dev-fallback-token' &&
        token.split('.').length === 3,
      );

      if (!isRealSession || !token) {
        if (isMounted) {
          setErrorType('unauthenticated');
          setErrorMessage(
            'Authentication required: Please sign in with an authenticated account to view this request confirmation.',
          );
          setLoading(false);
        }
        return;
      }

      try {
        const fetched = await requestApi.getRequestById(token, targetId);
        if (isMounted) {
          setRequest(fetched);
          setLoading(false);
        }
      } catch (err: any) {
        if (!isMounted) return;

        const status = err?.status;
        const msg = err?.message || 'Failed to load request details.';

        if (status === 401 || msg.includes('401') || msg.toLowerCase().includes('session')) {
          setErrorType('unauthenticated');
          setErrorMessage('Your session has expired. Please sign in to view this request.');
        } else if (status === 403 || msg.toLowerCase().includes('permission')) {
          setErrorType('forbidden');
          setErrorMessage('You do not have permission to view this blood request.');
        } else if (status === 404 || msg.toLowerCase().includes('not found')) {
          setErrorType('not_found');
          setErrorMessage('The requested blood request could not be found or has expired.');
        } else {
          setErrorType('network');
          setErrorMessage(msg);
        }
        setLoading(false);
      }
    }

    void loadRequest();

    return () => {
      isMounted = false;
    };
  }, [id, token]);

  const handleCopyReference = async (refText: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(refText);
        setCopiedRef(true);
        setTimeout(() => setCopiedRef(false), 2200);
      } catch {
        // ignore clipboard error
      }
    }
  };

  const getReferenceDisplay = () => {
    return request?.id || '';
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.titleContainer}>
              {isDetailsMode && (
                <TouchableOpacity
                  style={styles.detailsBackBtn}
                  onPress={() => (router.canGoBack() ? router.back() : router.replace('/requests/my'))}
                  activeOpacity={0.7}
                  accessibilityRole="button"
                  accessibilityLabel="Return to My Requests"
                >
                  <Ionicons name="arrow-back" size={22} color="#0F172A" />
                </TouchableOpacity>
              )}
              <Text style={styles.headerTitle}>
                {isDetailsMode ? 'Request details' : 'Request submitted'}
              </Text>
            </View>

            {__DEV__ && (
              <View style={styles.devSwitcherWrapper}>
                <ScreenSwitcher currentScreenId={20} />
              </View>
            )}
          </View>

          {/* Loading State */}
          {loading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading request confirmation...</Text>
            </View>
          )}

          {/* Error / Inaccessible / Preview Guidance State */}
          {!loading && errorMessage && (
            <View style={styles.errorCard}>
              <View style={styles.errorIconCircle}>
                <Ionicons
                  name={
                    errorType === 'unauthenticated'
                      ? 'lock-closed'
                      : errorType === 'forbidden'
                      ? 'shield-half'
                      : errorType === 'preview_guidance'
                      ? 'information-circle'
                      : 'alert-circle'
                  }
                  size={32}
                  color={errorType === 'unauthenticated' ? colors.primary : '#D97706'}
                />
              </View>
              <Text style={styles.errorCardTitle}>
                {errorType === 'unauthenticated'
                  ? 'Sign In Required'
                  : errorType === 'forbidden'
                  ? 'Access Restricted'
                  : errorType === 'preview_guidance'
                  ? 'No Request Submitted'
                  : errorType === 'not_found'
                  ? 'Request Not Found'
                  : 'Unable to Load Request'}
              </Text>
              <Text style={styles.errorCardBody}>{errorMessage}</Text>

              {errorType === 'unauthenticated' ? (
                <TouchableOpacity
                  style={styles.errorPrimaryBtn}
                  onPress={() =>
                    router.push({
                      pathname: '/(auth)/login',
                      params: { returnTo: `/requests/${id || 'latest'}/submitted` },
                    })
                  }
                  activeOpacity={0.85}
                >
                  <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.errorPrimaryBtnText}>Sign In to Continue</Text>
                </TouchableOpacity>
              ) : errorType === 'preview_guidance' ? (
                <TouchableOpacity
                  style={styles.errorPrimaryBtn}
                  onPress={() => router.push('/requests/new')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="add-circle-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.errorPrimaryBtnText}>Create New Blood Request</Text>
                </TouchableOpacity>
              ) : errorType === 'not_found' ? (
                <TouchableOpacity
                  style={styles.errorPrimaryBtn}
                  onPress={() => router.replace('/requests/my')}
                  activeOpacity={0.85}
                >
                  <Ionicons name="arrow-back" size={18} color="#FFFFFF" />
                  <Text style={styles.errorPrimaryBtnText}>Back to My Requests</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.errorSecondaryBtn}
                  onPress={() => router.replace('/dashboard')}
                  activeOpacity={0.85}
                >
                  <Text style={styles.errorSecondaryBtnText}>Return to Dashboard</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Success Content (Matches Figma Screenshot Exactly) */}
          {!loading && request && (
            <>
              {/* Hero Section */}
              <View style={styles.heroSection}>
                <View
                  style={[
                    styles.successIconCircle,
                    isDetailsMode && styles.detailsIconCircle,
                  ]}
                >
                  <Ionicons
                    name={isDetailsMode ? 'document-text-outline' : 'checkmark'}
                    size={38}
                    color={isDetailsMode ? colors.primary : '#16A34A'}
                  />
                </View>

                <Text style={styles.heroTitle}>
                  {isDetailsMode ? 'Request details' : 'Request sent successfully'}
                </Text>
                <Text style={styles.heroSubtitle}>
                  {isDetailsMode
                    ? 'Review hospital verification and request progress.'
                    : 'Your request has been sent for hospital review.'}
                </Text>
              </View>

              {/* Card 1: Request Summary Card */}
              <View style={styles.summaryCard}>
                {/* Header row: REQUEST SUMMARY & Ref */}
                <View style={styles.summaryHeaderRow}>
                  <Text style={styles.summaryHeading}>REQUEST SUMMARY</Text>

                  <TouchableOpacity
                    style={styles.referenceBadge}
                    onPress={() => handleCopyReference(getReferenceDisplay())}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Saved Request ID: ${getReferenceDisplay()}. Tap to copy.`}
                    accessibilityHint="Copies saved request ID to clipboard"
                  >
                    <Text
                      style={styles.referenceText}
                      numberOfLines={1}
                      ellipsizeMode="middle"
                      selectable
                    >
                      {getReferenceDisplay()}
                    </Text>
                    {copiedRef ? (
                      <Ionicons name="checkmark-done" size={14} color="#16A34A" style={styles.refIcon} />
                    ) : (
                      <Ionicons name="copy-outline" size={13} color="#94A3B8" style={styles.refIcon} />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.divider} />

                {/* Blood Group & Units Row */}
                <View style={styles.bloodDetailRow}>
                  <View style={styles.bloodGroupBadge}>
                    <Text style={styles.bloodGroupText}>{request.bloodGroup}</Text>
                  </View>

                  <View style={styles.bloodTextCol}>
                    <Text style={styles.unitsNeededText}>
                      {request.unitsRequired} {request.unitsRequired === 1 ? 'unit' : 'units'} needed
                    </Text>
                    <Text style={styles.urgencySubText}>
                      {request.urgency === 'Urgent' ? 'Urgent blood request' : 'Scheduled blood request'}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                {/* Hospital Section */}
                <View style={styles.hospitalRow}>
                  <View style={styles.hospitalIconCircle}>
                    <Ionicons name="location-outline" size={20} color="#DC2626" />
                  </View>

                  <View style={styles.hospitalTextCol}>
                    <Text style={styles.hospitalLabel}>HOSPITAL</Text>
                    <Text style={styles.hospitalName} numberOfLines={2}>
                      {request.hospitalName}
                    </Text>
                    {request.hospitalReferenceAndWard ? (
                      <View style={styles.hospitalRefBlock}>
                        <Text style={styles.hospitalRefLabel}>HOSPITAL REF / WARD</Text>
                        <Text style={styles.hospitalWardText} numberOfLines={2}>
                          {request.hospitalReferenceAndWard}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                </View>
              </View>

              {/* Card 2: Status / Verification Notice Card */}
              <View
                style={[
                  styles.statusNoticeCard,
                  request.status === 'verified' && styles.statusNoticeCardVerified,
                  request.status === 'fulfilled' && styles.statusNoticeCardFulfilled,
                ]}
              >
                <View style={styles.statusNoticeHeader}>
                  <Ionicons
                    name={
                      request.status === 'verified'
                        ? 'shield-checkmark'
                        : request.status === 'fulfilled'
                        ? 'checkmark-done-circle'
                        : 'time-outline'
                    }
                    size={20}
                    color={
                      request.status === 'verified'
                        ? '#059669'
                        : request.status === 'fulfilled'
                        ? '#0D9488'
                        : '#B45309'
                    }
                  />
                  <Text
                    style={[
                      styles.statusNoticeTitle,
                      request.status === 'verified' && styles.statusNoticeTitleVerified,
                      request.status === 'fulfilled' && styles.statusNoticeTitleFulfilled,
                    ]}
                  >
                    {request.status === 'pending_verification'
                      ? 'Awaiting hospital verification'
                      : request.status === 'verified'
                      ? 'Hospital Verified'
                      : request.status === 'in_progress'
                      ? 'Donation In Progress'
                      : request.status === 'fulfilled'
                      ? 'Request Fulfilled'
                      : 'Request Status Updated'}
                  </Text>
                </View>

                <Text style={styles.statusNoticeBody}>
                  {request.status === 'pending_verification'
                    ? 'Matching donors will be notified after hospital approval. Follow updates in My Requests.'
                    : request.status === 'verified'
                    ? 'The hospital has verified this request. Nearby eligible donors are being alerted.'
                    : request.status === 'fulfilled'
                    ? 'All required blood units have been successfully donated and fulfilled.'
                    : 'Your blood request is saved in the database. Follow updates in My Requests.'}
                </Text>
              </View>

              {/* Action Button: VIEW MY REQUESTS / RETURN TO MY REQUESTS */}
              <View style={styles.actionContainer}>
                <TouchableOpacity
                  style={styles.primaryCtaBtn}
                  onPress={() => router.push('/requests/my')}
                  activeOpacity={0.85}
                  accessibilityRole="button"
                  accessibilityLabel={isDetailsMode ? 'Return to My Requests' : 'View My Requests'}
                >
                  <Text style={styles.primaryCtaText}>
                    {isDetailsMode ? 'RETURN TO MY REQUESTS' : 'VIEW MY REQUESTS'}
                  </Text>
                </TouchableOpacity>

                <Text style={styles.savedCaptionText}>
                  {isDetailsMode
                    ? 'Tracking updates and hospital approvals are reflected in real time.'
                    : 'Your request is saved. No need to submit it again.'}
                </Text>
              </View>
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Shared Bottom Navigation Bar */}
      <BottomNavBar activeTab="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  titleContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailsBackBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  devSwitcherWrapper: {
    marginLeft: 8,
  },

  // Loading
  loadingContainer: {
    paddingVertical: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },

  // Error Card
  errorCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.xl,
    gap: 8,
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  errorCardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  errorCardBody: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
  },
  errorPrimaryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 46,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  errorPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  errorSecondaryBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    height: 46,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  errorSecondaryBtnText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
  },

  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginVertical: spacing.lg,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DCFCE7',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  detailsIconCircle: {
    backgroundColor: '#EFF6FF',
    borderColor: '#BFDBFE',
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
  },

  // Summary Card
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  summaryHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryHeading: {
    fontSize: 11,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
  },
  referenceBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '65%',
  },
  referenceText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#0F172A',
    letterSpacing: 0.2,
    fontVariant: ['tabular-nums'],
  },
  refIcon: {
    marginLeft: 5,
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },

  // Blood Detail Row
  bloodDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  bloodGroupBadge: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bloodGroupText: {
    fontSize: 20,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: -0.5,
  },
  bloodTextCol: {
    flex: 1,
  },
  unitsNeededText: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
  },
  urgencySubText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },

  // Hospital Row
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  hospitalIconCircle: {
    marginTop: 2,
  },
  hospitalTextCol: {
    flex: 1,
  },
  hospitalLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  hospitalName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
    lineHeight: 20,
  },
  hospitalRefBlock: {
    marginTop: 6,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  hospitalRefLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
  },
  hospitalWardText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginTop: 2,
    lineHeight: 16,
  },

  // Status / Verification Notice Card
  statusNoticeCard: {
    backgroundColor: '#FFFBEB',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: 16,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  statusNoticeCardVerified: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
  },
  statusNoticeCardFulfilled: {
    backgroundColor: '#F0FDFA',
    borderColor: '#99F6E4',
  },
  statusNoticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  statusNoticeTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
  },
  statusNoticeTitleVerified: {
    color: '#065F46',
  },
  statusNoticeTitleFulfilled: {
    color: '#115E59',
  },
  statusNoticeBody: {
    fontSize: 13,
    color: '#78350F',
    lineHeight: 19,
  },

  // Action Container
  actionContainer: {
    marginTop: spacing.xs,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  primaryCtaBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: 12,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryCtaDisabled: {
    opacity: 0.88,
  },
  primaryCtaText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.6,
  },
  hintBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1F5F9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 10,
  },
  hintText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500',
  },
  savedCaptionText: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 12,
    lineHeight: 16,
  },
});

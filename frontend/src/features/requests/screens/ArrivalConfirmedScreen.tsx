import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { requestApi } from '../services/requestApi';
import type { DeliveryAssignmentInfo, RequestStatus } from '../types';

function formatConfirmationTimestamp(isoString: string): string {
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return isoString;
  }
}

function getStatusBadgeDetails(status?: RequestStatus | null): { label: string; bg: string; text: string; icon: any } {
  switch (status) {
    case 'verified':
      return { label: 'Verified & Active', bg: '#DCFCE7', text: '#166534', icon: 'checkmark-circle' };
    case 'in_progress':
      return { label: 'In Progress', bg: '#EFF6FF', text: '#1D4ED8', icon: 'sync-circle' };
    case 'fulfilled':
      return { label: 'Fulfilled', bg: '#F0FDF4', text: '#15803D', icon: 'shield-checkmark' };
    case 'cancelled':
      return { label: 'Cancelled', bg: '#FEE2E2', text: '#B91C1C', icon: 'close-circle' };
    case 'pending_verification':
      return { label: 'Pending Verification', bg: '#FEF3C7', text: '#B45309', icon: 'time' };
    default:
      return { label: 'Active Request', bg: '#F1F5F9', text: '#475569', icon: 'ellipse' };
  }
}

export function ArrivalConfirmedScreen() {
  const router = useRouter();
  const { id, assignmentId: expectedAssignmentId } = useLocalSearchParams<{
    id: string;
    assignmentId?: string;
  }>();
  const { token } = useAuth();

  const isPreview = id === 'preview' || id === 'sample-preview';

  // Request & Assignment data
  const [assignment, setAssignment] = useState<DeliveryAssignmentInfo | null>(null);
  const [hospitalName, setHospitalName] = useState<string>('');
  const [hospitalWard, setHospitalWard] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');
  const [requestStatus, setRequestStatus] = useState<RequestStatus | null>(null);

  // States
  const [loading, setLoading] = useState(!isPreview);
  const [errorType, setErrorType] = useState<
    'unauthenticated' | 'not_found' | 'forbidden' | 'unassigned' | 'not_confirmed' | 'reassigned' | 'network' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedRef, setCopiedRef] = useState(false);

  const fetchSeqRef = useRef(0);

  // Read saved delivery assignment on screen focus (READ-ONLY)
  const loadDeliveryAssignment = useCallback(async () => {
    if (isPreview) {
      setLoading(false);
      setErrorType(null);
      setErrorMessage(null);
      return;
    }

    const currentSeq = ++fetchSeqRef.current;

    const isRealSession = Boolean(
      token &&
      token !== 'demo-jwt-token' &&
      token !== 'dev-fallback-token' &&
      token.split('.').length === 3,
    );

    if (!isRealSession || !token) {
      setAssignment(null);
      setRequestStatus(null);
      setLoading(false);
      setErrorType('unauthenticated');
      setErrorMessage('Please sign in to view arrival confirmation details.');
      return;
    }

    if (!id || id === 'undefined') {
      setAssignment(null);
      setRequestStatus(null);
      setLoading(false);
      setErrorType('not_found');
      setErrorMessage('Blood request reference is missing.');
      return;
    }

    setLoading(true);
    setErrorType(null);
    setErrorMessage(null);

    try {
      const response = await requestApi.getDeliveryAssignment(token, id);

      if (currentSeq !== fetchSeqRef.current) return;

      setRequestStatus(response.status || null);
      setHospitalName(response.hospitalName || '');
      setHospitalWard(response.hospitalReferenceAndWard || '');
      setRequestId(response.requestId || id);
      setBloodGroup(response.bloodGroup || '');

      const currentAssignment = response.deliveryAssignment;

      if (!currentAssignment) {
        setAssignment(null);
        setErrorType('unassigned');
        setErrorMessage('No delivery staff has been assigned to this blood request.');
        return;
      }

      // Reassignment check: if an expected assignmentId was passed, verify it matches
      if (expectedAssignmentId && currentAssignment.assignmentId !== expectedAssignmentId) {
        setAssignment(currentAssignment);
        setErrorType('reassigned');
        setErrorMessage(
          'The delivery assignment for this request has been updated. A replacement delivery person was assigned.',
        );
        return;
      }

      // Check whether arrival was actually confirmed
      const hasArrivalConfirmation = Boolean(
        currentAssignment.arrivalConfirmedAt || currentAssignment.isArrivalConfirmed,
      );

      if (!hasArrivalConfirmation) {
        setAssignment(currentAssignment);
        setErrorType('not_confirmed');
        setErrorMessage(
          'Arrival of the assigned delivery person has not been confirmed yet.',
        );
        return;
      }

      // Valid confirmed state
      setAssignment(currentAssignment);
      setErrorType(null);
      setErrorMessage(null);
    } catch (err: any) {
      if (currentSeq !== fetchSeqRef.current) return;

      const status = err?.status;
      const msg = err?.message || 'Failed to load arrival confirmation details.';

      setAssignment(null);
      if (status === 401 || msg.includes('401') || msg.toLowerCase().includes('session') || msg.toLowerCase().includes('token')) {
        setErrorType('unauthenticated');
        setErrorMessage('Your session has expired. Please sign in again.');
      } else if (status === 403 || msg.includes('403') || msg.toLowerCase().includes('permission')) {
        setErrorType('forbidden');
        setErrorMessage('You do not have permission to view confirmation details for this request.');
      } else if (status === 404 || msg.includes('404')) {
        setErrorType('not_found');
        setErrorMessage('The requested blood request was not found.');
      } else {
        setErrorType('network');
        setErrorMessage(msg);
      }
    } finally {
      if (currentSeq === fetchSeqRef.current) {
        setLoading(false);
      }
    }
  }, [id, expectedAssignmentId, isPreview, token]);

  useFocusEffect(
    useCallback(() => {
      void loadDeliveryAssignment();
    }, [loadDeliveryAssignment]),
  );

  const handleBackToRequests = () => {
    router.replace('/requests/my');
  };

  const handleCopyRef = async (refText: string) => {
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

  // Preview or live values
  const displayPersonName = isPreview
    ? 'Sunil Perera (Blood Bank Courier)'
    : assignment?.deliveryPersonName || 'Delivery Staff';

  const displayHospital = isPreview
    ? 'National Blood Center / City Hospital'
    : hospitalName || 'Hospital Blood Bank';

  const displayWard = isPreview ? 'Ward 4B · Bed 12' : hospitalWard;
  const displayRequestId = isPreview ? 'BR-SAMPLE-024' : requestId || id;
  const displayBloodGroup = isPreview ? 'B-' : bloodGroup;
  const displayStatus = isPreview ? 'verified' : requestStatus;

  // Format confirmation timestamp
  const displayConfirmedAt = isPreview
    ? new Date().toISOString()
    : assignment?.arrivalConfirmedAt;

  const formattedTimestamp = displayConfirmedAt
    ? formatConfirmationTimestamp(displayConfirmedAt)
    : null;

  const statusBadge = getStatusBadgeDetails(displayStatus);

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching saved arrival confirmation...</Text>
        </View>
      );
    }

    if (errorType === 'unauthenticated') {
      return (
        <View style={styles.emptyCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="lock-closed" size={32} color={colors.primary} />
          </View>
          <Text style={styles.cardTitle}>Sign In Required</Text>
          <Text style={styles.cardBody}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() =>
              router.push({
                pathname: '/(auth)/login',
                params: { returnTo: `/requests/${id}/arrival-confirmed` },
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Sign In to Account</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (errorType === 'reassigned') {
      return (
        <View style={styles.emptyCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="swap-horizontal" size={32} color="#D97706" />
          </View>
          <Text style={styles.cardTitle}>Delivery Assignment Updated</Text>
          <Text style={styles.cardBody}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.replace(`/requests/${id}/delivery`)}
            activeOpacity={0.85}
          >
            <Ionicons name="information-circle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>View Current Delivery Details</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (errorType === 'not_confirmed') {
      return (
        <View style={styles.emptyCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time-outline" size={32} color="#D97706" />
          </View>
          <Text style={styles.cardTitle}>Arrival Not Yet Confirmed</Text>
          <Text style={styles.cardBody}>
            The delivery person has been assigned, but their arrival has not been confirmed yet for this blood request.
          </Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() => router.replace(`/requests/${id}/delivery`)}
            activeOpacity={0.85}
          >
            <Ionicons name="bicycle-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Go to Delivery Contact</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (errorType && errorMessage) {
      return (
        <View style={styles.emptyCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="alert-circle-outline" size={32} color="#DC2626" />
          </View>
          <Text style={styles.cardTitle}>
            {errorType === 'forbidden'
              ? 'Access Denied'
              : errorType === 'not_found'
              ? 'Request Not Found'
              : errorType === 'unassigned'
              ? 'No Delivery Assignment'
              : 'Error Loading Confirmation'}
          </Text>
          <Text style={styles.cardBody}>{errorMessage}</Text>
          {errorType === 'network' ? (
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => void loadDeliveryAssignment()}
              activeOpacity={0.85}
            >
              <Ionicons name="refresh" size={16} color="#FFFFFF" />
              <Text style={styles.primaryActionBtnText}>Retry</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.secondaryActionBtn}
              onPress={handleBackToRequests}
              activeOpacity={0.85}
            >
              <Text style={styles.secondaryActionBtnText}>Back to My Requests</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    }

    return (
      <View style={styles.contentContainer}>
        {/* Dev Preview Mode Notice */}
        {isPreview && (
          <View style={styles.devBanner}>
            <Ionicons name="construct-outline" size={14} color="#92400E" style={{ marginRight: 6 }} />
            <Text style={styles.devBannerText}>
              Sample Preview · Dev Mode (Sample data only)
            </Text>
          </View>
        )}

        {/* Hero Success Section */}
        <View style={styles.heroSection}>
          <View style={styles.successIconCircle}>
            <Ionicons name="checkmark" size={40} color="#16A34A" />
          </View>

          <Text style={styles.heroTitle}>Delivery person’s arrival confirmed</Text>
          <Text style={styles.heroSubtitle}>
            You confirmed that the assigned delivery person arrived.
          </Text>
        </View>

        {/* Main Details Card */}
        <View style={styles.detailsCard}>
          {/* Header Row: REQUEST REFERENCE & BLOOD GROUP */}
          <View style={styles.cardHeaderRow}>
            <View style={styles.refCol}>
              <Text style={styles.fieldSectionLabel}>REQUEST REFERENCE</Text>
              <TouchableOpacity
                style={styles.copyableIdRow}
                onPress={() => handleCopyRef(displayRequestId)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Request Reference: ${displayRequestId}. Double tap to copy.`}
              >
                <Text style={styles.referenceText} numberOfLines={1}>
                  {displayRequestId}
                </Text>
                <Ionicons
                  name={copiedRef ? 'checkmark-done' : 'copy-outline'}
                  size={13}
                  color={copiedRef ? '#16A34A' : '#94A3B8'}
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            </View>

            {displayBloodGroup ? (
              <View style={styles.bloodBadge}>
                <Text style={styles.bloodBadgeText}>{displayBloodGroup}</Text>
              </View>
            ) : null}
          </View>

          <View style={styles.divider} />

          {/* Delivery Person Information */}
          <View style={styles.infoRow}>
            <View style={styles.iconWrapper}>
              <Ionicons name="bicycle" size={18} color="#16A34A" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>ASSIGNED DELIVERY PERSON</Text>
              <Text style={styles.infoValueBold}>{displayPersonName}</Text>
            </View>
          </View>

          {/* Hospital & Ward Location */}
          <View style={styles.infoRow}>
            <View style={styles.iconWrapper}>
              <Ionicons name="business-outline" size={18} color="#2563EB" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>DESTINATION HOSPITAL</Text>
              <Text style={styles.infoValue}>{displayHospital}</Text>
              {displayWard ? <Text style={styles.infoSubvalue}>{displayWard}</Text> : null}
            </View>
          </View>

          {/* Arrival Confirmed Timestamp */}
          <View style={styles.infoRow}>
            <View style={styles.iconWrapper}>
              <Ionicons name="calendar-outline" size={18} color="#D97706" />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>
                {isPreview ? 'SAMPLE CONFIRMATION TIME' : 'CONFIRMATION RECORDED'}
              </Text>
              <Text style={styles.infoValueBold}>
                {formattedTimestamp || 'Confirmed by requester'}
              </Text>
              <Text style={styles.infoSubvalue}>Recorded via patient mobile application</Text>
            </View>
          </View>

          {/* Current Request Status */}
          <View style={styles.infoRow}>
            <View style={styles.iconWrapper}>
              <Ionicons name={statusBadge.icon} size={18} color={statusBadge.text} />
            </View>
            <View style={styles.infoTextCol}>
              <Text style={styles.infoLabel}>CURRENT REQUEST STATUS</Text>
              <View style={[styles.statusPill, { backgroundColor: statusBadge.bg }]}>
                <Text style={[styles.statusPillText, { color: statusBadge.text }]}>
                  {statusBadge.label}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Procedural Notice */}
        <View style={styles.noticeCard} accessible={true}>
          <View style={styles.noticeHeader}>
            <Ionicons name="information-circle" size={18} color="#1E293B" style={{ marginRight: 6 }} />
            <Text style={styles.noticeTitle}>Arrival confirmation notice</Text>
          </View>
          <Text style={styles.noticeText}>
            You confirmed that the assigned delivery person arrived. This does not confirm blood receipt or mark your blood request as completed.
          </Text>
        </View>

        {/* Primary Action: BACK TO MY REQUESTS */}
        <TouchableOpacity
          style={styles.primaryBtn}
          onPress={handleBackToRequests}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Back to My Requests"
        >
          <Ionicons name="arrow-back" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
          <Text style={styles.primaryBtnText}>BACK TO MY REQUESTS</Text>
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      {/* Top Header */}
      <View style={styles.topBar}>
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackToRequests}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Back to My Requests"
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Arrival confirmed</Text>
        </View>

        {__DEV__ && (
          <View style={styles.devSwitcherWrapper}>
            <ScreenSwitcher currentScreenId={25} />
          </View>
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {renderContent()}
      </ScrollView>

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
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  screenTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  devSwitcherWrapper: {
    marginLeft: 8,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: Platform.OS === 'web' ? 100 : 110,
  },
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
  contentContainer: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  devBannerText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
    flex: 1,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.md,
    marginBottom: spacing.sm,
  },
  successIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.5,
    marginBottom: 6,
  },
  heroSubtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: spacing.md,
  },
  detailsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: spacing.lg,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  refCol: {
    flex: 1,
  },
  fieldSectionLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.8,
    marginBottom: 4,
  },
  copyableIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
  },
  referenceText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
    maxWidth: 180,
  },
  bloodBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  bloodBadgeText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#DC2626',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  iconWrapper: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  infoTextCol: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#94A3B8',
    letterSpacing: 0.6,
    marginBottom: 2,
  },
  infoValueBold: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 20,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 19,
  },
  infoSubvalue: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  statusPill: {
    alignSelf: 'flex-start',
    paddingVertical: 3,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginTop: 3,
  },
  statusPillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  noticeCard: {
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 14,
    marginBottom: spacing.lg,
  },
  noticeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  noticeTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  noticeText: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 18,
  },
  primaryBtn: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    borderRadius: 14,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
    marginBottom: spacing.md,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 8,
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
  },
  cardBody: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  secondaryActionBtnText: {
    color: '#0F172A',
    fontSize: 14,
    fontWeight: '700',
  },
});

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
import type { DeliveryAssignmentInfo } from '../types';
import {
  copyPhoneNumber,
  openPhoneDialer,
  openSmsComposer,
  sanitizePhoneNumber,
} from '@/utils/phone';

export function DeliveryContactScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  const isPreview = id === 'preview' || id === 'sample-preview';

  // Request & Assignment data
  const [assignment, setAssignment] = useState<DeliveryAssignmentInfo | null>(null);
  const [hospitalName, setHospitalName] = useState<string>('');
  const [hospitalWard, setHospitalWard] = useState<string>('');
  const [requestId, setRequestId] = useState<string>('');
  const [bloodGroup, setBloodGroup] = useState<string>('');

  // States
  const [loading, setLoading] = useState(!isPreview);
  const [errorType, setErrorType] = useState<
    'unauthenticated' | 'not_found' | 'forbidden' | 'unassigned' | 'network' | null
  >(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const fetchSeqRef = useRef(0);

  // Load live delivery assignment on screen focus
  const loadDeliveryAssignment = useCallback(async () => {
    if (isPreview) {
      setLoading(false);
      setErrorType(null);
      setErrorMessage(null);
      return;
    }

    const currentSeq = ++fetchSeqRef.current;
    setActionError(null);

    const isRealSession = Boolean(
      token &&
      token !== 'demo-jwt-token' &&
      token !== 'dev-fallback-token' &&
      token.split('.').length === 3,
    );

    if (!isRealSession || !token) {
      setAssignment(null);
      setLoading(false);
      setErrorType('unauthenticated');
      setErrorMessage('Please sign in to view delivery contact details.');
      return;
    }

    if (!id || id === 'undefined') {
      setAssignment(null);
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

      if (!response.deliveryAssignment) {
        setAssignment(null);
        setErrorType('unassigned');
        setErrorMessage(
          response.message || 'Awaiting delivery staff assignment from the hospital blood bank.',
        );
        setHospitalName(response.hospitalName || '');
        setHospitalWard(response.hospitalReferenceAndWard || '');
        setRequestId(response.requestId || id);
        setBloodGroup(response.bloodGroup || '');
      } else {
        setAssignment(response.deliveryAssignment);
        setHospitalName(response.hospitalName || '');
        setHospitalWard(response.hospitalReferenceAndWard || '');
        setRequestId(response.requestId || id);
        setBloodGroup(response.bloodGroup || '');
        setErrorType(null);
        setErrorMessage(null);
      }
    } catch (err: any) {
      if (currentSeq !== fetchSeqRef.current) return;

      const status = err?.status;
      const msg = err?.message || 'Failed to load delivery assignment details.';

      setAssignment(null);
      if (status === 401 || msg.includes('401') || msg.toLowerCase().includes('session') || msg.toLowerCase().includes('token')) {
        setErrorType('unauthenticated');
        setErrorMessage('Your session has expired. Please sign in again.');
      } else if (status === 403 || msg.includes('403') || msg.toLowerCase().includes('permission')) {
        setErrorType('forbidden');
        setErrorMessage('You do not have permission to view contact details for this request.');
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
  }, [id, isPreview, token]);

  useFocusEffect(
    useCallback(() => {
      void loadDeliveryAssignment();
    }, [loadDeliveryAssignment]),
  );

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/requests/my');
    }
  };

  // Preview or live values
  const displayPersonName = isPreview
    ? 'Sunil Perera (Blood Bank Courier)'
    : assignment?.deliveryPersonName || 'Delivery Staff';

  const rawPhone = isPreview ? '+94 77 123 4567' : assignment?.contactPhone || '';
  const displayHospital = isPreview
    ? 'National Blood Center / City Hospital'
    : hospitalName || 'Hospital Blood Bank';
  const displayWard = isPreview
    ? 'Ward 4B · Bed 12'
    : hospitalWard;
  const displayRequestId = isPreview
    ? 'BR-SAMPLE-024'
    : requestId || id;
  const displayBloodGroup = isPreview ? 'B-' : bloodGroup;

  const validPhone = sanitizePhoneNumber(rawPhone);

  const handleCopyPhone = async () => {
    if (!rawPhone) return;
    const ok = await copyPhoneNumber(rawPhone);
    if (ok) {
      setCopiedPhone(true);
      setFeedbackNotice('Phone number copied to clipboard.');
      setTimeout(() => setCopiedPhone(false), 2500);
      setTimeout(() => setFeedbackNotice(null), 3500);
    }
  };

  const handleCopyRef = async () => {
    if (!displayRequestId) return;
    const ok = await copyPhoneNumber(displayRequestId);
    if (ok) {
      setCopiedRef(true);
      setTimeout(() => setCopiedRef(false), 2000);
    }
  };

  const handleCall = async () => {
    setActionError(null);
    if (!rawPhone) {
      setActionError('No phone number is available for this contact.');
      return;
    }

    const res = await openPhoneDialer(rawPhone, {
      isPreview,
      onPreviewFeedback: (msg) => {
        setFeedbackNotice(msg);
        setTimeout(() => setFeedbackNotice(null), 4000);
      },
    });

    if (!res.success) {
      setActionError(res.error || 'Could not launch device dialer.');
    }
  };

  const handleSms = async () => {
    setActionError(null);
    if (!rawPhone) {
      setActionError('No phone number is available for this contact.');
      return;
    }

    const res = await openSmsComposer(rawPhone, {
      isPreview,
      onPreviewFeedback: (msg) => {
        setFeedbackNotice(msg);
        setTimeout(() => setFeedbackNotice(null), 4000);
      },
    });

    if (!res.success) {
      setActionError(res.error || 'Could not launch SMS app.');
    }
  };

  const renderContent = () => {
    if (loading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fetching delivery contact details...</Text>
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
                params: { returnTo: `/requests/${id}/delivery` },
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

    if (errorType === 'unassigned') {
      return (
        <View style={styles.emptyCard}>
          <View style={[styles.iconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="time-outline" size={32} color="#D97706" />
          </View>
          <Text style={styles.cardTitle}>Delivery Assignment Pending</Text>
          <Text style={styles.cardBody}>
            The hospital or blood bank has not assigned a delivery person for this blood request yet. Once assigned, their contact details will appear here.
          </Text>
          <TouchableOpacity
            style={styles.secondaryActionBtn}
            onPress={() => router.replace('/requests/my')}
            activeOpacity={0.85}
          >
            <Ionicons name="arrow-back" size={16} color="#0F172A" />
            <Text style={styles.secondaryActionBtnText}>Back to My Requests</Text>
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
              : 'Error Loading Details'}
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
              onPress={() => router.replace('/requests/my')}
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
              Sample Preview · Dev Mode (Actions simulated)
            </Text>
          </View>
        )}

        {/* Transient Feedback Notice */}
        {feedbackNotice && (
          <View style={styles.feedbackBanner} accessible={true} accessibilityRole="alert">
            <Ionicons name="checkmark-circle" size={16} color="#166534" style={{ marginRight: 6 }} />
            <Text style={styles.feedbackBannerText}>{feedbackNotice}</Text>
          </View>
        )}

        {/* Action Error Alert */}
        {actionError && (
          <View style={styles.actionErrorBanner} accessible={true} accessibilityRole="alert">
            <Ionicons name="alert-circle" size={16} color="#B91C1C" style={{ marginRight: 6 }} />
            <Text style={styles.actionErrorBannerText}>{actionError}</Text>
            <TouchableOpacity onPress={() => setActionError(null)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={16} color="#B91C1C" />
            </TouchableOpacity>
          </View>
        )}

        {/* Request Context Card */}
        <View style={styles.contextCard}>
          <View style={styles.contextHeader}>
            {displayBloodGroup ? (
              <View style={styles.bloodBadge}>
                <Text style={styles.bloodBadgeText}>{displayBloodGroup}</Text>
              </View>
            ) : null}
            <View style={styles.refInfoCol}>
              <TouchableOpacity
                style={styles.copyableIdRow}
                onPress={handleCopyRef}
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
              <Text style={styles.contextHospitalText} numberOfLines={1}>
                {displayHospital}
              </Text>
              {displayWard ? (
                <Text style={styles.contextWardText} numberOfLines={1}>
                  {displayWard}
                </Text>
              ) : null}
            </View>
          </View>
        </View>

        {/* Assigned Person Profile Card */}
        <View style={styles.courierCard}>
          <View style={styles.courierAvatarCircle}>
            <Ionicons name="bicycle" size={32} color="#16A34A" />
          </View>

          <View style={styles.statusPill}>
            <Ionicons name="checkmark-circle" size={13} color="#166534" style={{ marginRight: 4 }} />
            <Text style={styles.statusPillText}>Assigned Hospital Delivery Staff</Text>
          </View>

          <Text style={styles.courierName}>{displayPersonName}</Text>
          <Text style={styles.courierSubtext}>
            Designated courier responsible for transferring blood units to {displayHospital}.
          </Text>

          {/* Contact Phone Box */}
          <View style={styles.phoneBox}>
            <View style={styles.phoneLeft}>
              <Ionicons name="call" size={18} color="#0F172A" style={{ marginRight: 8 }} />
              <View>
                <Text style={styles.phoneLabel}>PHONE NUMBER</Text>
                <Text style={styles.phoneNumberText} selectable={true}>
                  {rawPhone || 'Not available'}
                </Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.copyPhoneBtn}
              onPress={handleCopyPhone}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Copy phone number"
            >
              <Ionicons
                name={copiedPhone ? 'checkmark-done' : 'copy-outline'}
                size={16}
                color={copiedPhone ? '#16A34A' : '#2563EB'}
                style={{ marginRight: 4 }}
              />
              <Text style={[styles.copyPhoneBtnText, copiedPhone && { color: '#16A34A' }]}>
                {copiedPhone ? 'Copied' : 'Copy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Call & Message Action Buttons */}
        <View style={styles.actionButtonGroup}>
          {/* Call Button */}
          <TouchableOpacity
            style={[styles.callBtn, !validPhone && styles.disabledBtn]}
            onPress={handleCall}
            disabled={!validPhone}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Call ${displayPersonName} at ${rawPhone}`}
          >
            <Ionicons name="call" size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.callBtnText}>Call Delivery Person</Text>
          </TouchableOpacity>

          {/* SMS Button */}
          <TouchableOpacity
            style={[styles.smsBtn, !validPhone && styles.disabledBtn]}
            onPress={handleSms}
            disabled={!validPhone}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Send SMS message to ${displayPersonName} at ${rawPhone}`}
          >
            <Ionicons name="chatbubble-outline" size={18} color="#2563EB" style={{ marginRight: 8 }} />
            <Text style={styles.smsBtnText}>Message (SMS)</Text>
          </TouchableOpacity>
        </View>

        {/* Short Guidance Note */}
        <View style={styles.guidanceBox}>
          <Ionicons name="information-circle-outline" size={16} color="#64748B" style={styles.guidanceIcon} />
          <Text style={styles.guidanceText}>
            Message opens your device&apos;s SMS composer with an empty draft. No patient medical details are automatically attached.
          </Text>
        </View>
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
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>Delivery contact</Text>
        </View>

        {__DEV__ && (
          <View style={styles.devSwitcherWrapper}>
            <ScreenSwitcher currentScreenId={23} />
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
  feedbackBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  feedbackBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#166534',
    flex: 1,
  },
  actionErrorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: spacing.md,
  },
  actionErrorBannerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#B91C1C',
    flex: 1,
  },
  contextCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  contextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bloodBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bloodBadgeText: {
    fontSize: 17,
    fontWeight: '800',
    color: '#DC2626',
  },
  refInfoCol: {
    flex: 1,
  },
  copyableIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
    marginBottom: 4,
  },
  referenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
    maxWidth: 150,
  },
  contextHospitalText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  contextWardText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  courierCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  courierAvatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#166534',
  },
  courierName: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    marginBottom: 4,
  },
  courierSubtext: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  phoneBox: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 14,
    padding: 12,
  },
  phoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  phoneLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.6,
  },
  phoneNumberText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginTop: 2,
  },
  copyPhoneBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
  },
  copyPhoneBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#2563EB',
  },
  actionButtonGroup: {
    width: '100%',
    gap: 10,
    marginBottom: spacing.md,
  },
  callBtn: {
    width: '100%',
    backgroundColor: '#16A34A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  callBtnText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  smsBtn: {
    width: '100%',
    backgroundColor: '#EFF6FF',
    borderWidth: 1.2,
    borderColor: '#BFDBFE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 13,
    borderRadius: 14,
  },
  smsBtnText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#2563EB',
    letterSpacing: 0.3,
  },
  disabledBtn: {
    opacity: 0.5,
  },
  guidanceBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 12,
  },
  guidanceIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  guidanceText: {
    flex: 1,
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
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

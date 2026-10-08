import React, { useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing } from '@/theme';

export interface DeliveryAssignedModalProps {
  visible: boolean;
  onClose: () => void;
  // Request context
  requestId?: string;
  patientName?: string;
  bloodGroup?: string;
  hospitalName?: string;
  hospitalReferenceAndWard?: string;
  // Assignment details
  deliveryPersonName?: string;
  contactPhone?: string;
  assignedAt?: string;
  loading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  onPressViewContact?: () => void;
  // Dev preview flag
  isDevPreview?: boolean;
}

export function DeliveryAssignedModal({
  visible,
  onClose,
  requestId,
  patientName,
  bloodGroup,
  hospitalName,
  hospitalReferenceAndWard,
  deliveryPersonName,
  contactPhone,
  assignedAt,
  loading = false,
  errorMessage = null,
  onRetry,
  onPressViewContact,
  isDevPreview = false,
}: DeliveryAssignedModalProps) {
  const openerRef = useRef<any>(null);

  // Handle Android hardware back button
  useEffect(() => {
    if (!visible) return;

    const backAction = () => {
      onClose();
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [visible, onClose]);

  // Web keyboard handling (Escape key) and focus restoration
  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;

    if (visible) {
      if (typeof document !== 'undefined' && document.activeElement) {
        openerRef.current = document.activeElement;
      }

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
        window.removeEventListener('keydown', handleKeyDown);
        if (openerRef.current && typeof openerRef.current.focus === 'function') {
          openerRef.current.focus();
        }
      };
    }
  }, [visible, onClose]);

  if (!visible) return null;

  // Safe display fallbacks
  const displayPersonName =
    deliveryPersonName ||
    (isDevPreview ? 'Sunil Perera (Courier Staff)' : 'Delivery Staff Member');

  const displayRequestId = requestId
    ? requestId.length > 8
      ? `Request ...${requestId.slice(-6)}`
      : `Request ${requestId}`
    : isDevPreview
    ? 'Request BR-024'
    : 'Blood Request';

  const displayBloodGroup = bloodGroup || (isDevPreview ? 'B-' : '');
  const displayHospital =
    hospitalName || (isDevPreview ? 'National Blood Center / City Hospital' : 'Designated Hospital');
  const displayWard =
    hospitalReferenceAndWard || (isDevPreview ? 'Ward 4B · Bed 12' : undefined);

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
      accessibilityRole="alert"
      accessibilityViewIsModal={true}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          {/* Top Close Icon Button */}
          <TouchableOpacity
            style={styles.closeIconButton}
            onPress={onClose}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Close delivery assignment modal"
          >
            <Ionicons name="close" size={18} color="#64748B" />
          </TouchableOpacity>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            {/* Dev Preview Notice */}
            {isDevPreview && (
              <View style={styles.devBanner}>
                <Ionicons name="construct-outline" size={13} color="#92400E" style={{ marginRight: 4 }} />
                <Text style={styles.devBannerText}>Sample Preview · Dev Mode</Text>
              </View>
            )}

            {/* Green Check Badge */}
            <View style={styles.badgeWrapper}>
              <View style={styles.checkmarkBadge}>
                <Ionicons name="checkmark" size={32} color="#16A34A" />
              </View>
            </View>

            {/* Modal Heading */}
            <Text style={styles.heading}>Delivery person assigned</Text>

            {/* Short Supporting Text */}
            <Text style={styles.subtitle}>
              A hospital or blood bank delivery person has been assigned to transfer the blood units.
            </Text>

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching delivery assignment details...</Text>
              </View>
            )}

            {/* Error State */}
            {!loading && errorMessage && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={20} color="#DC2626" />
                <Text style={styles.errorText}>{errorMessage}</Text>
                {onRetry && (
                  <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
                    <Text style={styles.retryBtnText}>Retry</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* Unassigned Warning (if live request has no assignment) */}
            {!loading && !errorMessage && !deliveryPersonName && !isDevPreview && (
              <View style={styles.emptyBox}>
                <Ionicons name="time-outline" size={24} color="#D97706" />
                <Text style={styles.emptyText}>
                  Awaiting delivery staff assignment from the hospital blood bank.
                </Text>
              </View>
            )}

            {/* Assignment Details */}
            {(!loading && !errorMessage && (deliveryPersonName || isDevPreview)) && (
              <>
                {/* Delivery Person Summary Card */}
                <View style={styles.personCard}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="bicycle" size={24} color="#16A34A" />
                  </View>
                  <View style={styles.personInfoCol}>
                    <Text style={styles.personNameText}>{displayPersonName}</Text>
                    <Text style={styles.personSubtext}>
                      {displayRequestId}
                      {displayBloodGroup ? ` · ${displayBloodGroup} blood` : ''}
                    </Text>
                  </View>
                </View>

                {/* Delivery Hospital Location Section */}
                <View style={styles.locationSection}>
                  <Ionicons
                    name="location-outline"
                    size={22}
                    color="#DC2626"
                    style={styles.locationIcon}
                  />
                  <View style={styles.locationInfoCol}>
                    <Text style={styles.locationLabel}>DESTINATION HOSPITAL</Text>
                    <Text style={styles.locationNameText}>{displayHospital}</Text>
                    {displayWard ? (
                      <Text style={styles.locationWardText}>{displayWard}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Status Guidance Note */}
                <Text style={styles.guidanceText}>
                  Staff assignment confirmed. You can now view courier contact details and get in touch directly.
                </Text>

                {/* Member 2.5 Action Button */}
                {onPressViewContact ? (
                  <TouchableOpacity
                    style={styles.enabledActionButton}
                    onPress={onPressViewContact}
                    activeOpacity={0.85}
                    accessibilityRole="button"
                    accessibilityLabel="View delivery contact details"
                  >
                    <Ionicons name="call" size={16} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.enabledActionText}>VIEW CONTACT DETAILS</Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={styles.disabledActionButton}
                    disabled={true}
                    activeOpacity={1}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: true }}
                    accessibilityLabel="Contact details unavailable"
                  >
                    <Ionicons name="call-outline" size={16} color="#94A3B8" style={{ marginRight: 6 }} />
                    <Text style={styles.disabledActionText}>Contact details unavailable</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {/* Secondary Action: Close */}
            <TouchableOpacity
              style={styles.closeTextButton}
              onPress={onClose}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Close dialog"
            >
              <Text style={styles.closeText}>Close</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.md,
  },
  modalCard: {
    width: '100%',
    maxWidth: 360,
    maxHeight: '90%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingTop: 24,
    paddingBottom: 20,
    paddingHorizontal: 22,
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 20,
    elevation: 12,
  },
  closeIconButton: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 6,
  },
  devBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  devBannerText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#92400E',
  },
  badgeWrapper: {
    marginTop: 6,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkmarkBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#DCFCE7',
    borderWidth: 2,
    borderColor: '#BBF7D0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heading: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
    paddingHorizontal: 8,
    lineHeight: 20,
  },
  loadingBox: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 8,
  },
  errorBox: {
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  errorText: {
    fontSize: 13,
    color: '#DC2626',
    textAlign: 'center',
    marginTop: 4,
  },
  retryBtn: {
    marginTop: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: '#DC2626',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyBox: {
    padding: 18,
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#92400E',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  personCard: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#F1F5F9',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  avatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  personInfoCol: {
    flex: 1,
  },
  personNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  personSubtext: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 3,
  },
  locationSection: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 14,
    paddingHorizontal: 4,
  },
  locationIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  locationInfoCol: {
    flex: 1,
  },
  locationLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.8,
  },
  locationNameText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 2,
  },
  locationWardText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 1,
  },
  guidanceText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginBottom: 18,
    paddingHorizontal: 12,
    lineHeight: 18,
  },
  disabledActionButton: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  enabledActionButton: {
    width: '100%',
    backgroundColor: '#16A34A',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  enabledActionText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  disabledActionText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.3,
  },
  closeTextButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  closeText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
});

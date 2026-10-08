import React, { useEffect, useRef, useState } from 'react';
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
import type { DonorAcceptanceSummary } from '../types';

export interface DonorAcceptedModalProps {
  visible: boolean;
  onClose: () => void;
  // Live request details
  requestId?: string;
  patientName?: string;
  bloodGroup?: string;
  hospitalName?: string;
  hospitalReferenceAndWard?: string;
  acceptances?: DonorAcceptanceSummary[];
  loading?: boolean;
  errorMessage?: string | null;
  onRetry?: () => void;
  // Dev-only visual preview flag
  isDevPreview?: boolean;
}

export function DonorAcceptedModal({
  visible,
  onClose,
  requestId,
  patientName,
  bloodGroup,
  hospitalName,
  hospitalReferenceAndWard,
  acceptances = [],
  loading = false,
  errorMessage = null,
  onRetry,
  isDevPreview = false,
}: DonorAcceptedModalProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const openerRef = useRef<any>(null);

  // Derive in-bounds selected index deterministically without cascading effect
  const safeIndex = selectedIndex < acceptances.length ? selectedIndex : 0;

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

  // Selected donor acceptance record
  const currentAcceptance = acceptances[safeIndex] ?? null;

  // Safe display labels
  const donorCode = currentAcceptance?.safeDonorCode || (isDevPreview ? 'Donor D-017' : 'Donor');
  const displayRequestId = requestId
    ? requestId.length > 8
      ? `Request ...${requestId.slice(-6)}`
      : `Request ${requestId}`
    : isDevPreview
    ? 'Request BR-024'
    : 'Blood Request';
  const displayBloodGroup = bloodGroup || (isDevPreview ? 'B-' : '');
  const displayHospital = hospitalName || (isDevPreview ? 'City Hospital, Colombo' : 'Designated Hospital');

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
            accessibilityLabel="Close donor acceptance modal"
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

            {/* Success Checkmark Badge */}
            <View style={styles.badgeWrapper}>
              <View style={styles.checkmarkBadge}>
                <Ionicons name="checkmark" size={32} color="#16A34A" />
              </View>
            </View>

            {/* Modal Heading */}
            <Text style={styles.heading}>A donor accepted!</Text>

            {/* Supporting Subtitle */}
            <Text style={styles.subtitle}>
              A donor has responded to your blood request.
            </Text>

            {/* Loading State */}
            {loading && (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color={colors.primary} />
                <Text style={styles.loadingText}>Fetching donor response details...</Text>
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

            {/* No Active Acceptances (e.g. withdrawn) */}
            {!loading && !errorMessage && acceptances.length === 0 && !isDevPreview && (
              <View style={styles.emptyBox}>
                <Ionicons name="information-circle-outline" size={24} color="#64748B" />
                <Text style={styles.emptyText}>
                  No active donor acceptance is currently recorded for this request.
                </Text>
              </View>
            )}

            {/* Active Content */}
            {(!loading && !errorMessage && (acceptances.length > 0 || isDevPreview)) && (
              <>
                {/* Multiple Donors Selector (if more than 1 donor accepted) */}
                {acceptances.length > 1 && (
                  <View style={styles.selectorContainer}>
                    <Text style={styles.selectorLabel}>
                      Accepted Donors ({acceptances.length}):
                    </Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.donorPillRow}>
                      {acceptances.map((acc, idx) => (
                        <TouchableOpacity
                          key={acc.id}
                          style={[
                            styles.donorPill,
                            selectedIndex === idx && styles.donorPillActive,
                          ]}
                          onPress={() => setSelectedIndex(idx)}
                          accessibilityRole="button"
                          accessibilityLabel={`Select ${acc.safeDonorCode}`}
                        >
                          <Text
                            style={[
                              styles.donorPillText,
                              selectedIndex === idx && styles.donorPillTextActive,
                            ]}
                          >
                            {acc.safeDonorCode}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Donor Summary Card */}
                <View style={styles.donorCard}>
                  <View style={styles.avatarCircle}>
                    <Ionicons name="person-outline" size={24} color="#DC2626" />
                  </View>
                  <View style={styles.donorInfoCol}>
                    <Text style={styles.donorNameText}>{donorCode}</Text>
                    <Text style={styles.donorSubtext}>
                      {displayRequestId}
                      {displayBloodGroup ? ` · ${displayBloodGroup} blood` : ''}
                    </Text>
                  </View>
                </View>

                {/* Donation Location Section */}
                <View style={styles.locationSection}>
                  <Ionicons
                    name="location-outline"
                    size={22}
                    color="#DC2626"
                    style={styles.locationIcon}
                  />
                  <View style={styles.locationInfoCol}>
                    <Text style={styles.locationLabel}>DONATION LOCATION</Text>
                    <Text style={styles.locationNameText}>{displayHospital}</Text>
                    {hospitalReferenceAndWard ? (
                      <Text style={styles.locationWardText}>{hospitalReferenceAndWard}</Text>
                    ) : null}
                  </View>
                </View>

                {/* Supporting Guidance */}
                <Text style={styles.guidanceText}>
                  Follow the donor&apos;s status and travel updates.
                </Text>

                {/* Action Button: Visibly and accessibly disabled until tracking destination exists */}
                <TouchableOpacity
                  style={styles.disabledTrackingButton}
                  disabled={true}
                  activeOpacity={1}
                  accessibilityRole="button"
                  accessibilityState={{ disabled: true }}
                  accessibilityLabel="Tracking unavailable"
                >
                  <Text style={styles.disabledTrackingText}>Tracking unavailable</Text>
                </TouchableOpacity>
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
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    alignItems: 'center',
    width: '100%',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    marginTop: 6,
    lineHeight: 18,
  },
  selectorContainer: {
    width: '100%',
    marginBottom: 12,
  },
  selectorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 6,
  },
  donorPillRow: {
    flexDirection: 'row',
  },
  donorPill: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  donorPillActive: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FECACA',
  },
  donorPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
  },
  donorPillTextActive: {
    color: '#DC2626',
  },
  donorCard: {
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
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  donorInfoCol: {
    flex: 1,
  },
  donorNameText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
  },
  donorSubtext: {
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
    marginBottom: 20,
    paddingHorizontal: 12,
  },
  disabledTrackingButton: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  disabledTrackingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#94A3B8',
    letterSpacing: 0.5,
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

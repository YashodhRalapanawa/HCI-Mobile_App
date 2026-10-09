import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { BloodGroupDropdown } from '../components/BloodGroupDropdown';
import { UnitsStepper } from '../components/UnitsStepper';
import { HospitalPicker } from '../components/HospitalPickerModal';
import { UrgencySelector } from '../components/UrgencySelector';
import { DocumentUploadBox } from '../components/DocumentUploadBox';
import { requestApi } from '../services/requestApi';
import type {
  BloodGroupType,
  UrgencyType,
  SelectedDocument,
  HospitalOption,
} from '../types';

const DRAFT_STORAGE_KEY = 'lifeline_request_draft_v1';

const FALLBACK_HOSPITALS: HospitalOption[] = [
  { id: 'hosp-colombo-city', name: 'City Hospital, Colombo', district: 'Colombo' },
  { id: 'hosp-nbts-narahenpita', name: 'National Blood Transfusion Service, Narahenpita', district: 'Colombo' },
  { id: 'hosp-cnh-colombo', name: 'Colombo National Hospital Blood Bank', district: 'Colombo' },
  { id: 'hosp-sjh-kotte', name: 'Sri Jayewardenepura General Hospital', district: 'Colombo' },
  { id: 'hosp-kandy-gen', name: 'Kandy National Hospital', district: 'Kandy' },
  { id: 'hosp-karapitiya-galle', name: 'Karapitiya Teaching Hospital, Galle', district: 'Galle' },
];

export function NewRequestScreen() {
  const router = useRouter();
  const { token } = useAuth();

  // Form State
  const [patientName, setPatientName] = useState('N. Perera');
  const [bloodGroup, setBloodGroup] = useState<BloodGroupType>('B-');
  const [unitsRequired, setUnitsRequired] = useState<number>(3);
  const [hospitals, setHospitals] = useState<HospitalOption[]>(FALLBACK_HOSPITALS);
  const [hospitalId, setHospitalId] = useState<string>('hosp-colombo-city');
  const [urgency, setUrgency] = useState<UrgencyType>('Urgent');
  const [hospitalReferenceAndWard, setHospitalReferenceAndWard] = useState('REQ-2026-024 / Ward 05');
  const [document, setDocument] = useState<SelectedDocument | null>(null);

  // Status, Modal & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const isRealSession = Boolean(
    token &&
    token !== 'demo-jwt-token' &&
    token !== 'dev-fallback-token' &&
    token.split('.').length === 3,
  );
  const isDemoAuth = !isRealSession;

  // Load saved draft on mount
  useEffect(() => {
    async function loadDraft() {
      try {
        const saved = await AsyncStorage.getItem(DRAFT_STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.patientName) setPatientName(parsed.patientName);
          if (parsed.bloodGroup) setBloodGroup(parsed.bloodGroup);
          if (parsed.unitsRequired) setUnitsRequired(Number(parsed.unitsRequired));
          if (parsed.hospitalId) setHospitalId(parsed.hospitalId);
          if (parsed.hospitalReferenceAndWard) setHospitalReferenceAndWard(parsed.hospitalReferenceAndWard);
          if (parsed.urgency) setUrgency(parsed.urgency);
        }
      } catch {
        // ignore draft load error
      }
    }
    void loadDraft();
  }, []);

  const saveDraft = async () => {
    try {
      await AsyncStorage.setItem(
        DRAFT_STORAGE_KEY,
        JSON.stringify({
          patientName,
          bloodGroup,
          unitsRequired,
          hospitalId,
          hospitalReferenceAndWard,
          urgency,
        }),
      );
    } catch {
      // ignore draft save error
    }
  };

  const clearDraft = async () => {
    try {
      await AsyncStorage.removeItem(DRAFT_STORAGE_KEY);
    } catch {
      // ignore draft clear error
    }
  };

  // Fetch live hospitals from backend on mount
  useEffect(() => {
    let isMounted = true;
    requestApi
      .getHospitals()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setHospitals(data);
          setHospitalId((prev) =>
            prev && data.some((h) => h.id === prev) ? prev : data[0].id,
          );
        }
      })
      .catch((err) => {
        // Fallback already preloaded
        console.log('[requests] Using fallback hospitals due to network/server:', err?.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!patientName.trim()) {
      newErrors.patientName = 'Patient name is required';
    } else if (patientName.trim().length < 2) {
      newErrors.patientName = 'Patient name must be at least 2 characters';
    }

    if (!hospitalId) {
      newErrors.hospitalId = 'Hospital location is required';
    }

    if (!hospitalReferenceAndWard.trim()) {
      newErrors.hospitalReferenceAndWard = 'Hospital reference / ward is required';
    } else if (hospitalReferenceAndWard.trim().length < 2) {
      newErrors.hospitalReferenceAndWard = 'Hospital reference / ward must be at least 2 characters';
    }

    if (!document) {
      newErrors.document = 'Please attach a hospital request document (PDF, JPG, or PNG)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    setSubmitError(null);

    if (!validateForm()) {
      setSubmitError('Please complete all required fields and upload the hospital request document.');
      return;
    }

    // If running in demo mode without real backend JWT session
    if (isDemoAuth || !token) {
      await saveDraft();
      setSubmitError('Authentication required: Sign in with an authenticated account to submit to the live database.');
      setShowAuthModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await requestApi.createRequest(token, {
        patientName,
        bloodGroup,
        unitsRequired,
        hospitalId,
        hospitalReferenceAndWard,
        urgency,
        document,
      });

      await clearDraft();
      try {
        await AsyncStorage.setItem('latest_submitted_request_id', response.request.id);
      } catch {
        // ignore storage error
      }

      // Replace navigation so Back does not reopen the submitted form
      router.replace(`/requests/${response.request.id}/submitted` as any);
    } catch (err: any) {
      const isAuthError =
        err?.status === 401 ||
        err?.message?.includes('401') ||
        err?.message?.toLowerCase().includes('token') ||
        err?.message?.toLowerCase().includes('authentication') ||
        err?.message?.toLowerCase().includes('session') ||
        err?.message?.toLowerCase().includes('unauthorized');

      if (isAuthError) {
        await saveDraft();
        const sessionMsg = 'Your session has expired or is invalid. Please sign in to submit this request.';
        setSubmitError(sessionMsg);
        setShowAuthModal(true);
      } else {
        const msg = err?.message || 'Failed to submit blood request. Please try again.';
        setSubmitError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header matching screenshot */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/profile'))}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="chevron-back" size={22} color="#1E293B" />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>New blood request</Text>
              <Text style={styles.headerSubtitle}>
                Find eligible donors for an urgent blood need.
              </Text>
            </View>

            {__DEV__ && (
              <View style={styles.devSwitcherWrapper}>
                <ScreenSwitcher currentScreenId={19} />
              </View>
            )}
          </View>

          {/* Demo Auth Banner */}
          {isDemoAuth && (
            <View style={styles.demoBanner}>
              <Ionicons name="information-circle" size={18} color="#B45309" />
              <Text style={styles.demoBannerText}>
                Preview Mode: Sign in to submit requests to the live database.
              </Text>
              <TouchableOpacity
                onPress={async () => {
                  await saveDraft();
                  router.push({
                    pathname: '/(auth)/login',
                    params: { returnTo: '/requests/new' },
                  });
                }}
                style={styles.demoLoginBtn}
              >
                <Text style={styles.demoLoginBtnText}>Sign In</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Main Member 2.1 Request Form */}
          {/* CARD 1: PATIENT AND BLOOD DETAILS */}
              <View style={styles.card}>
                <Text style={styles.cardHeader}>PATIENT AND BLOOD DETAILS</Text>

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Patient name</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      Boolean(errors.patientName) && styles.inputError,
                    ]}
                    value={patientName}
                    onChangeText={(val) => {
                      setPatientName(val);
                      if (errors.patientName) setErrors((prev) => ({ ...prev, patientName: '' }));
                    }}
                    placeholder="N. Perera"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="words"
                    editable={!isSubmitting}
                  />
                  {errors.patientName ? (
                    <Text style={styles.errorText}>{errors.patientName}</Text>
                  ) : null}
                </View>

                <View style={styles.sideBySideRow}>
                  <View style={styles.halfCol}>
                    <BloodGroupDropdown
                      selectedGroup={bloodGroup}
                      onSelectGroup={setBloodGroup}
                      disabled={isSubmitting}
                    />
                  </View>
                  <View style={styles.halfCol}>
                    <UnitsStepper
                      value={unitsRequired}
                      onChange={setUnitsRequired}
                      min={1}
                      max={10}
                      disabled={isSubmitting}
                    />
                  </View>
                </View>
              </View>

              {/* CARD 2: HOSPITAL AND URGENCY */}
              <View style={styles.card}>
                <Text style={styles.cardHeader}>HOSPITAL AND URGENCY</Text>

                <HospitalPicker
                  hospitals={hospitals}
                  selectedHospitalId={hospitalId}
                  onSelectHospital={(h) => {
                    setHospitalId(h.id);
                    if (errors.hospitalId) setErrors((prev) => ({ ...prev, hospitalId: '' }));
                  }}
                  error={errors.hospitalId}
                  disabled={isSubmitting}
                />

                <UrgencySelector
                  value={urgency}
                  onChange={setUrgency}
                  disabled={isSubmitting}
                />

                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Hospital reference / ward</Text>
                  <TextInput
                    style={[
                      styles.textInput,
                      Boolean(errors.hospitalReferenceAndWard) && styles.inputError,
                    ]}
                    value={hospitalReferenceAndWard}
                    onChangeText={(val) => {
                      setHospitalReferenceAndWard(val);
                      if (errors.hospitalReferenceAndWard) {
                        setErrors((prev) => ({ ...prev, hospitalReferenceAndWard: '' }));
                      }
                    }}
                    placeholder="REQ-2026-024 / Ward 05"
                    placeholderTextColor="#9CA3AF"
                    autoCapitalize="characters"
                    editable={!isSubmitting}
                  />
                  {errors.hospitalReferenceAndWard ? (
                    <Text style={styles.errorText}>{errors.hospitalReferenceAndWard}</Text>
                  ) : null}
                </View>
              </View>

              {/* CARD 3: DOCUMENT UPLOAD */}
              <DocumentUploadBox
                document={document}
                onSelectDocument={(doc) => {
                  setDocument(doc);
                  if (errors.document) setErrors((prev) => ({ ...prev, document: '' }));
                }}
                error={errors.document}
                disabled={isSubmitting}
              />

              {/* Caption */}
              <Text style={styles.captionText}>
                Donors are alerted after hospital approval.
              </Text>

              {/* Error banner if submission failed */}
              {submitError ? (
                <View style={styles.submitErrorBanner}>
                  <View style={styles.submitErrorHeader}>
                    <Ionicons name="alert-circle" size={18} color={colors.danger} />
                    <Text style={styles.submitErrorText}>{submitError}</Text>
                  </View>
                  {(isDemoAuth ||
                    !token ||
                    submitError.toLowerCase().includes('sign in') ||
                    submitError.toLowerCase().includes('session') ||
                    submitError.toLowerCase().includes('auth')) ? (
                    <TouchableOpacity
                      style={styles.errorSignInBtn}
                      onPress={async () => {
                        await saveDraft();
                        router.push({
                          pathname: '/(auth)/login',
                          params: { returnTo: '/requests/new' },
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Ionicons name="log-in-outline" size={16} color="#FFFFFF" />
                      <Text style={styles.errorSignInBtnText}>Sign In to Submit</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}

              {/* Submit CTA */}
              <TouchableOpacity
                style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Text style={styles.submitButtonText}>SUBMIT REQUEST</Text>
                )}
              </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Shared Bottom Navigation Bar */}
      <BottomNavBar activeTab="home" />

      {/* Authentication Required Modal (Expo Web & Mobile Compatible) */}
      <Modal
        visible={showAuthModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAuthModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalIconCircle}>
              <Ionicons name="lock-closed" size={28} color={colors.primary} />
            </View>

            <Text style={styles.modalTitle}>Sign In Required</Text>
            <Text style={styles.modalSubtitle}>
              Submitting a blood request to the live database requires an authenticated session.
              Your entered form information has been safely preserved as a draft.
            </Text>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              onPress={async () => {
                await saveDraft();
                setShowAuthModal(false);
                router.push({
                  pathname: '/(auth)/login',
                  params: { returnTo: '/requests/new' },
                });
              }}
              activeOpacity={0.85}
            >
              <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
              <Text style={styles.modalPrimaryBtnText}>Sign In Now</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelBtn}
              onPress={() => setShowAuthModal(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCancelBtnText}>Keep Editing Draft</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: spacing.md,
    paddingTop: spacing.xs,
    paddingBottom: spacing.xl,
  },
  headerRow: {
    marginBottom: spacing.md,
    marginTop: spacing.xs,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  titleContainer: {
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.5,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 4,
    lineHeight: 18,
  },
  devSwitcherWrapper: {
    position: 'absolute',
    top: 4,
    right: 0,
  },
  demoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    borderWidth: 1,
    borderColor: '#FDE68A',
    borderRadius: borderRadius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: spacing.md,
    gap: 8,
  },
  demoBannerText: {
    flex: 1,
    fontSize: 12,
    color: '#92400E',
    fontWeight: '500',
    lineHeight: 16,
  },
  demoLoginBtn: {
    backgroundColor: '#B45309',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.sm,
  },
  demoLoginBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1E293B',
    letterSpacing: 0.6,
    marginBottom: spacing.sm,
  },
  fieldGroup: {
    marginBottom: spacing.sm,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    height: 52,
    paddingHorizontal: 14,
    fontSize: 15,
    color: colors.text,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: 12,
  },
  halfCol: {
    flex: 1,
  },
  captionText: {
    textAlign: 'center',
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    marginTop: 4,
  },
  submitErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.2,
    borderColor: '#FCA5A5',
    borderRadius: borderRadius.md,
    padding: 12,
    marginBottom: 14,
    gap: 8,
  },
  submitErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitErrorText: {
    flex: 1,
    fontSize: 12,
    color: '#991B1B',
    fontWeight: '600',
    lineHeight: 17,
  },
  errorSignInBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 6,
    alignSelf: 'flex-start',
  },
  errorSignInBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 14,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    marginBottom: spacing.lg,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Inline Success Card Styles
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: spacing.lg,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  successIconBox: {
    marginBottom: spacing.sm,
  },
  successTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  successSubtitle: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  successDetailBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 10,
    marginBottom: spacing.lg,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '500',
    width: 110,
  },
  detailValue: {
    flex: 1,
    fontSize: 13,
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right',
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: borderRadius.full,
  },
  urgencyBadgeUrgent: {
    backgroundColor: '#FEE2E2',
  },
  urgencyBadgeScheduled: {
    backgroundColor: '#E2E8F0',
  },
  urgencyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  urgencyBadgeTextUrgent: {
    color: colors.primary,
  },
  urgencyBadgeTextScheduled: {
    color: colors.textSecondary,
  },
  successActions: {
    width: '100%',
    gap: 10,
  },
  newRequestBtn: {
    backgroundColor: colors.primary,
    height: 48,
    borderRadius: borderRadius.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  newRequestBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  profileBtn: {
    backgroundColor: '#F1F5F9',
    height: 48,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileBtnText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  // Modal styles for Authentication prompt
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 8,
  },
  modalIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: spacing.lg,
  },
  modalPrimaryBtn: {
    width: '100%',
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 48,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  modalPrimaryBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  modalCancelBtn: {
    width: '100%',
    backgroundColor: '#F1F5F9',
    borderRadius: borderRadius.md,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600',
  },
});

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
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BottomNavBar } from '@/components/BottomNavBar';
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
  CreatedRequestResponse,
} from '../types';

const FALLBACK_HOSPITALS: HospitalOption[] = [
  { id: 'hosp-colombo-city', name: 'City Hospital, Colombo', district: 'Colombo' },
  { id: 'hosp-nbts-narahenpita', name: 'National Blood Transfusion Service, Narahenpita', district: 'Colombo' },
  { id: 'hosp-cnh-colombo', name: 'Colombo National Hospital Blood Bank', district: 'Colombo' },
  { id: 'hosp-sjh-kotte', name: 'Sri Jayewardenepura General Hospital', district: 'Colombo' },
  { id: 'hosp-kandy-gen', name: 'Kandy National Hospital', district: 'Kandy' },
  { id: 'hosp-karapitiya-galle', name: 'Karapitiya Teaching Hospital, Galle', district: 'Galle' },
];

export function EditRequestScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token } = useAuth();

  // Loading & Request Meta State
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isNotEditable, setIsNotEditable] = useState(false);
  const [hospitals, setHospitals] = useState<HospitalOption[]>(FALLBACK_HOSPITALS);

  // Form Field State
  const [patientName, setPatientName] = useState('');
  const [bloodGroup, setBloodGroup] = useState<BloodGroupType>('A+');
  const [unitsRequired, setUnitsRequired] = useState<number>(1);
  const [hospitalId, setHospitalId] = useState<string>('');
  const [urgency, setUrgency] = useState<UrgencyType>('Urgent');
  const [hospitalReferenceAndWard, setHospitalReferenceAndWard] = useState('');
  const [document, setDocument] = useState<SelectedDocument | null>(null);
  const [existingDocumentName, setExistingDocumentName] = useState<string>('');

  // Initial Snapshot to detect dirty / unsaved changes
  const [initialValues, setInitialValues] = useState<{
    patientName: string;
    bloodGroup: BloodGroupType;
    unitsRequired: number;
    hospitalId: string;
    urgency: UrgencyType;
    hospitalReferenceAndWard: string;
  } | null>(null);

  // Submission & Validation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [showDiscardModal, setShowDiscardModal] = useState(false);

  // Compute if form has unsaved modifications
  const isDirty = Boolean(
    initialValues &&
      (patientName !== initialValues.patientName ||
        bloodGroup !== initialValues.bloodGroup ||
        unitsRequired !== initialValues.unitsRequired ||
        hospitalId !== initialValues.hospitalId ||
        urgency !== initialValues.urgency ||
        hospitalReferenceAndWard !== initialValues.hospitalReferenceAndWard ||
        document !== null),
  );

  // Fetch Hospitals catalogue
  useEffect(() => {
    let isMounted = true;
    requestApi
      .getHospitals()
      .then((data) => {
        if (isMounted && data && data.length > 0) {
          setHospitals(data);
        }
      })
      .catch((err) => {
        console.log('[edit-request] Using fallback hospitals:', err?.message);
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch initial request details
  useEffect(() => {
    let isMounted = true;

    async function loadRequest() {
      if (!id) {
        if (isMounted) {
          setLoadError('Invalid request ID.');
          setLoading(false);
        }
        return;
      }

      if (!token) {
        if (isMounted) {
          setLoadError('Please sign in to edit your blood request.');
          setLoading(false);
        }
        return;
      }

      if (isMounted) {
        setLoading(true);
        setLoadError(null);
        setIsNotEditable(false);
      }

      try {
        const data: CreatedRequestResponse = await requestApi.getRequestById(token, id);
        if (!isMounted) return;

        if (data.status !== 'pending_verification') {
          setIsNotEditable(true);
          setLoadError('This request can no longer be edited as it has already been processed by the hospital.');
          setLoading(false);
          return;
        }

        setPatientName(data.patientName);
        setBloodGroup(data.bloodGroup as BloodGroupType);
        setUnitsRequired(data.unitsRequired);
        setHospitalId(data.hospitalId);
        setUrgency(data.urgency);
        setHospitalReferenceAndWard(data.hospitalReferenceAndWard);
        setExistingDocumentName(data.document?.originalName || 'hospital-document');

        setInitialValues({
          patientName: data.patientName,
          bloodGroup: data.bloodGroup as BloodGroupType,
          unitsRequired: data.unitsRequired,
          hospitalId: data.hospitalId,
          urgency: data.urgency,
          hospitalReferenceAndWard: data.hospitalReferenceAndWard,
        });
      } catch (err: any) {
        if (!isMounted) return;
        const status = err?.status;
        const msg = err?.message || 'Failed to load request details.';
        if (status === 403 || msg.includes('permission')) {
          setLoadError('You do not have permission to edit this request.');
        } else if (status === 404 || msg.includes('not found')) {
          setLoadError('Blood request not found.');
        } else {
          setLoadError(msg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void loadRequest();

    return () => {
      isMounted = false;
    };
  }, [id, token]);

  const handleBack = () => {
    if (isDirty) {
      setShowDiscardModal(true);
    } else {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/requests/my');
      }
    }
  };

  const handleConfirmDiscard = () => {
    setShowDiscardModal(false);
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/requests/my');
    }
  };

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

    if (!document && !existingDocumentName) {
      newErrors.document = 'Please attach a hospital request document (PDF, JPG, or PNG)';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async () => {
    setSubmitError(null);

    if (!validateForm()) {
      setSubmitError('Please complete all required fields and verify the hospital request document.');
      return;
    }

    if (!token || !id) {
      setSubmitError('Authentication required to save changes.');
      return;
    }

    setIsSubmitting(true);
    try {
      await requestApi.updateRequest(
        token,
        id,
        {
          patientName,
          bloodGroup,
          unitsRequired,
          hospitalId,
          hospitalReferenceAndWard,
          urgency,
          document,
        },
      );

      setSubmitSuccess(true);
      // Return to My Requests and refresh the list
      setTimeout(() => {
        router.replace('/requests/my');
      }, 500);
    } catch (err: any) {
      const status = err?.status;
      const msg = err?.message || 'Failed to update blood request. Please try again.';

      if (status === 409 || msg.includes('no longer editable') || msg.includes('already been processed')) {
        setIsNotEditable(true);
        setSubmitError('This request can no longer be edited as it has already been processed by the hospital.');
      } else if (status === 403) {
        setSubmitError('You do not have permission to edit this request.');
      } else {
        setSubmitError(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render Loading State
  if (loading) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Edit blood request</Text>
          </View>
        </View>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading request details...</Text>
        </View>
        <BottomNavBar activeTab="home" />
      </SafeAreaView>
    );
  }

  // Render Non-Editable or Load Error State
  if (loadError || isNotEditable) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.headerRow}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="chevron-back" size={22} color="#1E293B" />
          </TouchableOpacity>
          <View style={styles.titleContainer}>
            <Text style={styles.headerTitle}>Edit blood request</Text>
          </View>
        </View>

        <View style={styles.centerContainer}>
          <View style={[styles.errorIconCircle, isNotEditable && styles.warningIconCircle]}>
            <Ionicons
              name={isNotEditable ? 'alert-circle' : 'close-circle'}
              size={36}
              color={isNotEditable ? '#D97706' : colors.danger}
            />
          </View>
          <Text style={styles.errorTitle}>
            {isNotEditable ? 'Editing Unavailable' : 'Unable to Load Request'}
          </Text>
          <Text style={styles.errorDescription}>
            {loadError || 'This request cannot be modified.'}
          </Text>

          <View style={styles.errorActionsRow}>
            {id && loadError !== 'Blood request not found.' ? (
              <TouchableOpacity
                style={styles.secondaryActionBtn}
                onPress={() =>
                  router.push({
                    pathname: `/requests/${id}/submitted`,
                    params: { mode: 'details' },
                  } as any)
                }
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryActionBtnText}>View Request Details</Text>
              </TouchableOpacity>
            ) : null}

            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={() => router.replace('/requests/my')}
              activeOpacity={0.85}
            >
              <Text style={styles.primaryActionBtnText}>Back to My Requests</Text>
            </TouchableOpacity>
          </View>
        </View>
        <BottomNavBar activeTab="home" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.headerRow}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              accessibilityRole="button"
              accessibilityLabel="Cancel editing and go back"
            >
              <Ionicons name="chevron-back" size={22} color="#1E293B" />
            </TouchableOpacity>

            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Edit blood request</Text>
              <Text style={styles.headerSubtitle}>
                Update details for this pending hospital request.
              </Text>
            </View>
          </View>

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

          {/* CARD 3: HOSPITAL DOCUMENT (WITH OPTIONAL REPLACEMENT) */}
          <View style={styles.card}>
            <Text style={styles.cardHeader}>HOSPITAL DOCUMENT</Text>
            <DocumentUploadBox
              document={document}
              existingDocumentName={existingDocumentName}
              onSelectDocument={(doc) => {
                setDocument(doc);
                if (errors.document) setErrors((prev) => ({ ...prev, document: '' }));
              }}
              error={errors.document}
              disabled={isSubmitting}
            />
          </View>

          {/* Success Banner */}
          {submitSuccess ? (
            <View style={styles.submitSuccessBanner}>
              <Ionicons name="checkmark-circle" size={18} color="#166534" />
              <Text style={styles.submitSuccessText}>Changes saved successfully. Returning to list...</Text>
            </View>
          ) : null}

          {/* Error Banner */}
          {submitError ? (
            <View style={styles.submitErrorBanner}>
              <View style={styles.submitErrorHeader}>
                <Ionicons name="alert-circle" size={18} color={colors.danger} />
                <Text style={styles.submitErrorText}>{submitError}</Text>
              </View>
              {isNotEditable ? (
                <TouchableOpacity
                  style={styles.errorNavBtn}
                  onPress={() => router.replace('/requests/my')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.errorNavBtnText}>Return to My Requests</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          ) : null}

          {/* Save Action CTA */}
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSave}
            activeOpacity={0.85}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="SAVE CHANGES"
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <Text style={styles.submitButtonText}>SAVE CHANGES</Text>
            )}
          </TouchableOpacity>

          {/* Cancel button */}
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleBack}
            activeOpacity={0.7}
            disabled={isSubmitting}
            accessibilityRole="button"
            accessibilityLabel="Cancel editing"
          >
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Discard Changes Warning Modal (Cross-platform Expo Web & Native) */}
      <Modal
        visible={showDiscardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDiscardModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="warning-outline" size={28} color="#D97706" />
            </View>
            <Text style={styles.modalTitle}>Discard Changes?</Text>
            <Text style={styles.modalBody}>
              You have unsaved edits in this blood request. Are you sure you want to discard them?
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setShowDiscardModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelBtnText}>Keep Editing</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalDiscardBtn}
                onPress={handleConfirmDiscard}
                activeOpacity={0.85}
              >
                <Text style={styles.modalDiscardBtnText}>Discard Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 110,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginRight: spacing.md,
  },
  titleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.3,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeader: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
    letterSpacing: 0.8,
    marginBottom: spacing.md,
  },
  fieldGroup: {
    marginBottom: spacing.md,
  },
  fieldLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 6,
  },
  textInput: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 15,
    color: '#0F172A',
  },
  inputError: {
    borderColor: colors.danger,
    backgroundColor: '#FEF2F2',
  },
  sideBySideRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  halfCol: {
    flex: 1,
  },
  errorText: {
    fontSize: 12,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 3,
  },
  submitButtonDisabled: {
    opacity: 0.65,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  cancelButton: {
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.xs,
  },
  cancelButtonText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  submitErrorBanner: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECDD3',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  submitErrorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitErrorText: {
    flex: 1,
    fontSize: 13,
    color: colors.danger,
    fontWeight: '600',
  },
  errorNavBtn: {
    marginTop: 8,
    alignSelf: 'flex-start',
    backgroundColor: '#DC2626',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.sm,
  },
  errorNavBtnText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '700',
  },
  submitSuccessBanner: {
    backgroundColor: '#DCFCE7',
    borderWidth: 1,
    borderColor: '#86EFAC',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  submitSuccessText: {
    fontSize: 13,
    color: '#166534',
    fontWeight: '600',
    flex: 1,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    marginTop: spacing.md,
    fontWeight: '500',
  },
  errorIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  warningIconCircle: {
    backgroundColor: '#FEF3C7',
  },
  errorTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 6,
    textAlign: 'center',
  },
  errorDescription: {
    fontSize: 14,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  errorActionsRow: {
    gap: spacing.sm,
    width: '100%',
    maxWidth: 280,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  secondaryActionBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#CBD5E1',
    paddingVertical: 12,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  secondaryActionBtnText: {
    color: '#1E293B',
    fontSize: 14,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 380,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 6,
  },
  modalHeaderIcon: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 14,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: spacing.md,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#475569',
  },
  modalDiscardBtn: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: borderRadius.md,
    backgroundColor: '#DC2626',
    alignItems: 'center',
  },
  modalDiscardBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
});

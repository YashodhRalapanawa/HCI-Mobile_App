import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import type { HospitalOption } from '../types';

interface HospitalPickerProps {
  hospitals: HospitalOption[];
  selectedHospitalId: string;
  onSelectHospital: (hospital: HospitalOption) => void;
  error?: string;
  disabled?: boolean;
}

export function HospitalPicker({
  hospitals,
  selectedHospitalId,
  onSelectHospital,
  error,
  disabled = false,
}: HospitalPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);

  const selectedHospital = hospitals.find((h) => h.id === selectedHospitalId);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Hospital location</Text>

      <TouchableOpacity
        style={[
          styles.selectorBox,
          Boolean(error) && styles.selectorError,
          disabled && styles.disabled,
        ]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text
          style={[styles.selectedText, !selectedHospital && styles.placeholderText]}
          numberOfLines={1}
        >
          {selectedHospital ? selectedHospital.name : 'Select hospital...'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={colors.textMuted} />
      </TouchableOpacity>

      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Hospital</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} style={styles.closeBtn}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.hospitalList} showsVerticalScrollIndicator={false}>
              {hospitals.map((hospital) => {
                const isSelected = hospital.id === selectedHospitalId;
                return (
                  <TouchableOpacity
                    key={hospital.id}
                    style={[styles.hospitalItem, isSelected && styles.hospitalItemSelected]}
                    onPress={() => {
                      onSelectHospital(hospital);
                      setModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.hospitalItemText}>
                      <Text style={[styles.hospitalName, isSelected && styles.hospitalNameSelected]}>
                        {hospital.name}
                      </Text>
                      <Text style={styles.hospitalDistrict}>{hospital.district}</Text>
                    </View>
                    {isSelected ? (
                      <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  selectorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 52,
  },
  selectorError: {
    borderColor: colors.danger,
  },
  selectedText: {
    fontSize: 15,
    color: colors.text,
    fontWeight: '500',
    flex: 1,
    marginRight: 8,
  },
  placeholderText: {
    color: '#9CA3AF',
  },
  disabled: {
    opacity: 0.6,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    width: '100%',
    maxHeight: '75%',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    marginBottom: spacing.xs,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  closeBtn: {
    padding: 4,
  },
  hospitalList: {
    marginTop: spacing.xs,
  },
  hospitalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  hospitalItemSelected: {
    backgroundColor: '#FFF1F2',
  },
  hospitalItemText: {
    flex: 1,
    marginRight: 8,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 2,
  },
  hospitalNameSelected: {
    color: colors.primary,
  },
  hospitalDistrict: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

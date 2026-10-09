import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import type { BloodGroupType } from '../types';

const BLOOD_GROUPS: BloodGroupType[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

interface BloodGroupDropdownProps {
  selectedGroup: BloodGroupType;
  onSelectGroup: (group: BloodGroupType) => void;
  disabled?: boolean;
}

export function BloodGroupDropdown({
  selectedGroup,
  onSelectGroup,
  disabled = false,
}: BloodGroupDropdownProps) {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Blood group</Text>

      <TouchableOpacity
        style={[styles.box, disabled && styles.disabled]}
        onPress={() => !disabled && setModalVisible(true)}
        activeOpacity={0.7}
      >
        <Text style={styles.selectedText}>{selectedGroup}</Text>
        <Ionicons name="chevron-down" size={18} color={colors.textMuted} />
      </TouchableOpacity>

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
              <Text style={styles.modalTitle}>Select Blood Group</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.textMuted} />
              </TouchableOpacity>
            </View>

            <View style={styles.grid}>
              {BLOOD_GROUPS.map((group) => {
                const isSelected = group === selectedGroup;
                return (
                  <TouchableOpacity
                    key={group}
                    style={[styles.pill, isSelected && styles.pillSelected]}
                    onPress={() => {
                      onSelectGroup(group);
                      setModalVisible(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.pillText, isSelected && styles.pillTextSelected]}>
                      {group}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.textSecondary,
    marginBottom: 6,
  },
  box: {
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
  selectedText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  disabled: {
    opacity: 0.6,
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
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    width: '22.5%',
    height: 48,
    borderRadius: borderRadius.sm,
    borderWidth: 1.2,
    borderColor: colors.border,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillSelected: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  pillText: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
});

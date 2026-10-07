import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import type { UrgencyType } from '../types';

interface UrgencySelectorProps {
  value: UrgencyType;
  onChange: (value: UrgencyType) => void;
  disabled?: boolean;
}

export function UrgencySelector({ value, onChange, disabled = false }: UrgencySelectorProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.label}>Urgency level</Text>

      <View style={styles.row}>
        {/* Urgent Option */}
        <TouchableOpacity
          style={[
            styles.option,
            value === 'Urgent' && styles.optionUrgentSelected,
            disabled && styles.disabled,
          ]}
          onPress={() => !disabled && onChange('Urgent')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={value === 'Urgent' ? 'radio-button-on' : 'radio-button-off'}
            size={18}
            color={value === 'Urgent' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.optionText,
              value === 'Urgent' && styles.textUrgentSelected,
            ]}
          >
            Urgent
          </Text>
        </TouchableOpacity>

        {/* Scheduled Option */}
        <TouchableOpacity
          style={[
            styles.option,
            value === 'Scheduled' && styles.optionScheduledSelected,
            disabled && styles.disabled,
          ]}
          onPress={() => !disabled && onChange('Scheduled')}
          activeOpacity={0.7}
        >
          <Ionicons
            name={value === 'Scheduled' ? 'radio-button-on' : 'radio-button-off'}
            size={18}
            color={value === 'Scheduled' ? colors.primary : colors.textMuted}
          />
          <Text
            style={[
              styles.optionText,
              value === 'Scheduled' && styles.textScheduledSelected,
            ]}
          >
            Scheduled
          </Text>
        </TouchableOpacity>
      </View>
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
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  option: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  optionUrgentSelected: {
    borderColor: '#FECDD3',
    backgroundColor: '#FFF1F2',
  },
  optionScheduledSelected: {
    borderColor: colors.primary,
    backgroundColor: '#FFF1F2',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  textUrgentSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  textScheduledSelected: {
    color: colors.primary,
    fontWeight: '700',
  },
  disabled: {
    opacity: 0.6,
  },
});

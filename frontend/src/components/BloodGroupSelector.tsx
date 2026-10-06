import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, spacing, borderRadius } from '@/theme';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const;

interface BloodGroupSelectorProps {
  selectedGroup: string;
  onSelect: (group: string) => void;
  label?: string;
  required?: boolean;
}

export function BloodGroupSelector({
  selectedGroup,
  onSelect,
  label = 'Blood Group',
  required = true,
}: BloodGroupSelectorProps) {
  return (
    <View style={styles.container}>
      {label ? (
        <Text style={styles.label}>
          {label}
          {required ? <Text style={styles.required}> *</Text> : null}
        </Text>
      ) : null}

      <View style={styles.grid}>
        {BLOOD_GROUPS.map((group) => {
          const isSelected = selectedGroup === group;
          return (
            <TouchableOpacity
              key={group}
              style={[styles.pill, isSelected && styles.pillSelected]}
              onPress={() => onSelect(group)}
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
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.xs,
  },
  required: {
    color: colors.primary,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  pill: {
    width: '22.5%',
    height: 44,
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
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  pillText: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },
  pillTextSelected: {
    color: '#FFFFFF',
  },
});

import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';

interface UnitsStepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}

export function UnitsStepper({
  value,
  onChange,
  min = 1,
  max = 10,
  disabled = false,
}: UnitsStepperProps) {
  const canDecrement = value > min && !disabled;
  const canIncrement = value < max && !disabled;

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Units needed</Text>

      <View style={[styles.stepperBox, disabled && styles.disabled]}>
        <TouchableOpacity
          style={[styles.stepBtn, !canDecrement && styles.btnDisabled]}
          onPress={() => canDecrement && onChange(value - 1)}
          disabled={!canDecrement}
          activeOpacity={0.6}
        >
          <Ionicons
            name="remove"
            size={18}
            color={canDecrement ? colors.text : colors.textMuted}
          />
        </TouchableOpacity>

        <View style={styles.valueContainer}>
          <Text style={styles.valueText}>{value}</Text>
        </View>

        <TouchableOpacity
          style={[styles.stepBtn, !canIncrement && styles.btnDisabled]}
          onPress={() => canIncrement && onChange(value + 1)}
          disabled={!canIncrement}
          activeOpacity={0.6}
        >
          <Ionicons
            name="add"
            size={18}
            color={canIncrement ? colors.primary : colors.textMuted}
          />
        </TouchableOpacity>
      </View>
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
  stepperBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    height: 52,
    overflow: 'hidden',
  },
  stepBtn: {
    width: 44,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.35,
  },
  valueContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: colors.borderLight,
    height: '100%',
  },
  valueText: {
    fontSize: 17,
    fontWeight: '700',
    color: colors.text,
  },
  disabled: {
    opacity: 0.6,
  },
});

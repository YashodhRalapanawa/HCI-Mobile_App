import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  type TextInputProps,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';

interface AppTextInputProps extends TextInputProps {
  label?: string;
  required?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  error?: string;
  helperText?: string;
}

export function AppTextInput({
  label,
  required,
  icon,
  error,
  helperText,
  secureTextEntry,
  style,
  ...props
}: AppTextInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isSecure = secureTextEntry && !showPassword;

  return (
    <View style={styles.container}>
      {label ? (
        <View style={styles.labelRow}>
          <Text style={styles.label}>
            {label}
            {required ? <Text style={styles.required}> *</Text> : null}
          </Text>
        </View>
      ) : null}

      <View style={[styles.inputWrapper, Boolean(error) && styles.inputError]}>
        {icon ? (
          <Ionicons
            name={icon}
            size={18}
            color={colors.textMuted}
            style={styles.icon}
          />
        ) : null}

        <TextInput
          placeholderTextColor="#9CA3AF"
          secureTextEntry={isSecure}
          style={[styles.input, style]}
          {...props}
        />

        {secureTextEntry ? (
          <TouchableOpacity
            style={styles.eyeBtn}
            onPress={() => setShowPassword(!showPassword)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name={showPassword ? 'eye-off-outline' : 'eye-outline'}
              size={18}
              color={colors.textMuted}
            />
          </TouchableOpacity>
        ) : null}
      </View>

      {error ? (
        <Text style={styles.errorText}>{error}</Text>
      ) : helperText ? (
        <Text style={styles.helperText}>{helperText}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.md,
  },
  labelRow: {
    marginBottom: 6,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
  },
  required: {
    color: colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.2,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  inputError: {
    borderColor: colors.danger,
  },
  icon: {
    marginRight: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: colors.text,
    paddingVertical: 10,
  },
  eyeBtn: {
    padding: 4,
  },
  errorText: {
    fontSize: 11,
    color: colors.danger,
    marginTop: 4,
    fontWeight: '500',
  },
  helperText: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 4,
  },
});

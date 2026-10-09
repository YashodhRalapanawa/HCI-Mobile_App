import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
  type TextStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius, shadows } from '@/theme';

interface AppButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary' | 'dark' | 'outline' | 'danger' | 'ghost';
  disabled?: boolean;
  loading?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  style?: StyleProp<ViewStyle>;
  textStyle?: StyleProp<TextStyle>;
}

export function AppButton({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  icon,
  style,
  textStyle,
}: AppButtonProps) {
  const getContainerStyle = () => {
    switch (variant) {
      case 'primary':
        return styles.primaryBtn;
      case 'secondary':
      case 'dark':
        return styles.secondaryBtn;
      case 'tertiary':
        return styles.tertiaryBtn;
      case 'outline':
        return styles.outlineBtn;
      case 'danger':
        return styles.dangerBtn;
      case 'ghost':
        return styles.ghostBtn;
      default:
        return styles.primaryBtn;
    }
  };

  const getTextColor = () => {
    switch (variant) {
      case 'outline':
        return colors.text;
      case 'ghost':
        return colors.primary;
      case 'danger':
      case 'primary':
      case 'secondary':
      case 'tertiary':
      case 'dark':
      default:
        return '#FFFFFF';
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.base,
        getContainerStyle(),
        (disabled || loading) && styles.disabled,
        style,
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={getTextColor()} size="small" />
      ) : (
        <>
          {icon ? (
            <Ionicons
              name={icon}
              size={18}
              color={getTextColor()}
              style={{ marginRight: 8 }}
            />
          ) : null}
          <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
  },
  primaryBtn: {
    backgroundColor: colors.primary,
    ...shadows.primary,
  },
  secondaryBtn: {
    backgroundColor: colors.secondary,
    ...shadows.sm,
  },
  tertiaryBtn: {
    backgroundColor: colors.tertiary,
    ...shadows.sm,
  },
  outlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.border,
  },
  dangerBtn: {
    backgroundColor: colors.danger,
  },
  ghostBtn: {
    backgroundColor: 'transparent',
  },
  disabled: {
    opacity: 0.5,
  },
  text: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
});

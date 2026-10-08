import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, borderRadius, spacing } from '@/theme';

export function ErrorState({ message, actionLabel, onRetry }: { message: string; actionLabel: string; onRetry: () => void }) {
  return <View style={styles.container}><Text style={styles.message}>{message}</Text><TouchableOpacity style={styles.button} onPress={onRetry} accessibilityRole="button"><Text style={styles.buttonText}>{actionLabel}</Text></TouchableOpacity></View>;
}
const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  message: { color: colors.danger, fontSize: 14, textAlign: 'center' },
  button: { minHeight: 48, marginTop: spacing.md, paddingHorizontal: spacing.lg, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.md, backgroundColor: colors.primary },
  buttonText: { color: colors.textInverted, fontWeight: '700' },
});

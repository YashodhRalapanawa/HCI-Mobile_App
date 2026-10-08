import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, spacing } from '@/theme';

export function EmptyState({ title, message }: { title: string; message?: string }) {
  return <View style={styles.container}><Text style={styles.title}>{title}</Text>{message ? <Text style={styles.message}>{message}</Text> : null}</View>;
}
const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center', padding: spacing.xl },
  title: { color: colors.text, fontSize: 17, fontWeight: '700', textAlign: 'center' },
  message: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: 14, textAlign: 'center' },
});

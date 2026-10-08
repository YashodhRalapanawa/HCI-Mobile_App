import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, borderRadius, spacing } from '@/theme';

export function StatCard({ label, value, accent = colors.primary }: { label: string; value: number | string; accent?: string }) {
  return (
    <View style={styles.card}>
      <Text style={[styles.value, { color: accent }]}>{value}</Text>
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { flex: 1, minHeight: 88, padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
  value: { fontSize: 26, fontWeight: '800' },
  label: { marginTop: spacing.xs, color: colors.textSecondary, fontSize: 12, lineHeight: 17 },
});

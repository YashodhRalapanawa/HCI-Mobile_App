import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, borderRadius, spacing } from '@/theme';
import type { StockLevel } from '../types';

const palette: Record<StockLevel, { background: string; text: string }> = {
  high: { background: colors.successSoft, text: colors.success },
  medium: { background: colors.warningSoft, text: colors.warning },
  low: { background: colors.dangerSoft, text: colors.danger },
  out: { background: colors.secondarySoft, text: colors.textMuted },
};

export function StockBadge({ level, label }: { level: StockLevel; label: string }) {
  const tone = palette[level];
  return <View style={[styles.badge, { backgroundColor: tone.background }]}><Text style={[styles.text, { color: tone.text }]}>{label}</Text></View>;
}
const styles = StyleSheet.create({
  badge: { alignSelf: 'flex-start', minHeight: 28, paddingHorizontal: spacing.sm, justifyContent: 'center', borderRadius: borderRadius.full },
  text: { fontSize: 12, fontWeight: '700' },
});

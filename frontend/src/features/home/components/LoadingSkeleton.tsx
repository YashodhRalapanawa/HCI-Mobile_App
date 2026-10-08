import React from 'react';
import { StyleSheet, View } from 'react-native';
import { colors, borderRadius, spacing } from '@/theme';

export function LoadingSkeleton({ rows = 3 }: { rows?: number }) {
  return <View style={styles.container}>{Array.from({ length: rows }, (_, index) => <View key={index} style={styles.row} />)}</View>;
}
const styles = StyleSheet.create({
  container: { gap: spacing.sm },
  row: { height: 72, borderRadius: borderRadius.md, backgroundColor: colors.secondarySoft },
});

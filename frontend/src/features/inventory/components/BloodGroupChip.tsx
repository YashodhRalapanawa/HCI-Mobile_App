import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, borderRadius } from '@/theme';
import type { BloodGroup } from '../types';

export function BloodGroupChip({ bloodGroup }: { bloodGroup: BloodGroup }) {
  return <View style={styles.chip}><Text style={styles.text}>{bloodGroup}</Text></View>;
}
const styles = StyleSheet.create({
  chip: { width: 52, height: 40, alignItems: 'center', justifyContent: 'center', borderRadius: borderRadius.sm, backgroundColor: colors.primaryLight },
  text: { color: colors.primaryDark, fontSize: 16, fontWeight: '800' },
});

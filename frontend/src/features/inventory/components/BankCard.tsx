import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors, borderRadius, spacing } from '@/theme';
import type { BloodBank } from '../types';
import { BloodGroupChip } from './BloodGroupChip';
import { StockBadge } from './StockBadge';

export function BankCard({ bank, openLabel, closedLabel, distanceLabel }: { bank: BloodBank; openLabel: string; closedLabel: string; distanceLabel: string }) {
  return (
    <View style={styles.card}>
      <View style={styles.heading}><Text style={styles.name}>{bank.name}</Text><Text style={styles.open}>{bank.isOpenNow ? openLabel : closedLabel}</Text></View>
      <Text style={styles.address}>{bank.address} · {bank.distanceKm === null ? distanceLabel : `${bank.distanceKm} km`}</Text>
      <View style={styles.stockList}>
        {bank.stock.map((stock) => <View key={stock.bloodGroup} style={styles.stock}><BloodGroupChip bloodGroup={stock.bloodGroup} /><View><Text style={styles.units}>{stock.units}</Text><StockBadge level={stock.status} label={stock.status} /></View></View>)}
      </View>
    </View>
  );
}
const styles = StyleSheet.create({
  card: { padding: spacing.md, borderRadius: borderRadius.md, backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border, gap: spacing.xs },
  heading: { flexDirection: 'row', justifyContent: 'space-between', gap: spacing.sm },
  name: { flex: 1, color: colors.text, fontSize: 16, fontWeight: '700' },
  open: { color: colors.textMuted, fontSize: 12 },
  address: { color: colors.textSecondary, fontSize: 13 },
  stockList: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.sm },
  stock: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  units: { color: colors.text, fontSize: 13, fontWeight: '700' },
});

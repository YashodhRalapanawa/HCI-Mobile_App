import { StyleSheet, Text, View } from 'react-native';

import { API_BASE_URL } from '@/services/api';
import { colors, spacing } from '@/theme';

/**
 * Minimal starter screen. Placeholder only — no features are implemented yet.
 */
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Blood Donor–Recipient Matching</Text>
      <Text style={styles.subtitle}>Project scaffold is running.</Text>
      <Text style={styles.meta}>API: {API_BASE_URL ?? 'EXPO_PUBLIC_API_URL not set'}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    gap: spacing.sm,
    backgroundColor: colors.background,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.primary,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: colors.text,
  },
  meta: {
    fontSize: 12,
    color: colors.textMuted,
  },
});

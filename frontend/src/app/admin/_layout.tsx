import React from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Redirect, Slot, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { AdminLayout } from '@/features/admin/layouts/AdminLayout';

export default function AdminRouteLayout() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const { user, token, isLoading } = useAuth();

  const isPreview = Boolean(__DEV__ && params.preview === '1');

  // Allow development preview without authentication
  if (isPreview) {
    return (
      <AdminLayout isPreview={true}>
        <Slot />
      </AdminLayout>
    );
  }

  // Auth initializing
  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing admin session...</Text>
      </View>
    );
  }

  // Not signed in -> redirect to login with returnTo
  if (!user || !token || token === 'demo-jwt-token') {
    return <Redirect href="/(auth)/login?returnTo=/admin" />;
  }

  // Signed in but role is NOT admin -> Access Denied (avoids redirect loops)
  if (user.role !== 'admin') {
    return (
      <View style={styles.centered}>
        <View style={styles.deniedCard}>
          <View style={styles.deniedIcon}>
            <Ionicons name="shield-outline" size={32} color={colors.danger} />
          </View>
          <Text style={styles.deniedTitle}>Administrative Access Only</Text>
          <Text style={styles.deniedDesc}>
            This portal is restricted to system administrators. Your account does not have administrative privileges.
          </Text>
          <TouchableOpacity
            style={styles.deniedButton}
            onPress={() => router.replace('/dashboard' as any)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Return to home dashboard"
          >
            <Text style={styles.deniedButtonText}>Return to Home Dashboard</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Authorized administrator
  return (
    <AdminLayout isPreview={false}>
      <Slot />
    </AdminLayout>
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.secondaryMuted,
  },
  deniedCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    maxWidth: 400,
    borderWidth: 1,
    borderColor: colors.borderLight,
  },
  deniedIcon: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.dangerSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  deniedTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },
  deniedDesc: {
    fontSize: 13,
    color: colors.secondaryMuted,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: spacing.lg,
  },
  deniedButton: {
    backgroundColor: colors.secondary,
    paddingVertical: 10,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  deniedButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
});

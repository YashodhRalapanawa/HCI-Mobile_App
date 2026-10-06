import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppButton } from '@/components/AppButton';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';

export default function LaunchScreen() {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <ScreenSwitcher currentScreenId={1} />
      </View>

      <View style={styles.content}>
        {/* Blood drop with pulse mark */}
        <View style={styles.circleOuter}>
          <View style={styles.circleInner}>
            <Ionicons name="water" size={64} color={colors.primary} />
            <Ionicons
              name="pulse"
              size={26}
              color="#FFFFFF"
              style={styles.pulseIcon}
            />
          </View>
        </View>

        <Text style={styles.title}>LifeLine LK</Text>
        <Text style={styles.tagline}>
          Fast donor matching.{'\n'}Save lives, one match at a time.
        </Text>

        <View style={styles.dots}>
          <View style={[styles.dot, styles.dotActive]} />
          <View style={styles.dot} />
          <View style={styles.dot} />
        </View>
      </View>

      <View style={styles.footer}>
        <AppButton
          title="Get Started"
          variant="primary"
          onPress={() => router.push('/(auth)/onboarding')}
          style={styles.btn}
        />
        <AppButton
          title="I already have an account"
          variant="ghost"
          onPress={() => router.push('/(auth)/login')}
          style={styles.loginBtn}
          textStyle={{ color: colors.textSecondary }}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: 54,
    paddingBottom: spacing.xl,
  },
  topBar: {
    alignItems: 'flex-end',
  },
  content: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  circleOuter: {
    width: 130,
    height: 130,
    borderRadius: 65,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  circleInner: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 4,
  },
  pulseIcon: {
    position: 'absolute',
    top: 48,
    color: '#B91C1C',
  },
  title: {
    fontSize: 32,
    fontWeight: '900',
    color: '#111827',
    letterSpacing: -0.5,
    marginTop: spacing.sm,
  },
  tagline: {
    fontSize: 15,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginTop: spacing.sm,
  },
  dots: {
    flexDirection: 'row',
    marginTop: spacing.xl,
    gap: 8,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.primary,
  },
  footer: {
    width: '100%',
    gap: 8,
  },
  btn: {
    height: 54,
    borderRadius: borderRadius.md,
  },
  loginBtn: {
    height: 44,
  },
});

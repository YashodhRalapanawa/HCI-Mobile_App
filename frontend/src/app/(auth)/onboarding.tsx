import React, { useState } from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppButton } from '@/components/AppButton';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';

const ONBOARDING_SLIDES = [
  {
    title: 'Fast Donor Matching',
    subtitle:
      'Find compatible blood donors near you in minutes using real-time district search and instant availability verification.',
    image: require('@/assets/images/onboarding-find-donors.png'),
    icon: 'water',
  },
  {
    title: 'Verified Blood Requests',
    subtitle:
      'Create and review emergency requests directly backed by trusted hospitals and national blood bank centers.',
    image: require('@/assets/images/onboarding-save-lives.png'),
    icon: 'heart',
  },
  {
    title: 'Safe & Secure History',
    subtitle:
      'Track donation milestones, earn donor hero badges, and securely manage your medical eligibility in one place.',
    image: require('@/assets/images/onboarding-find-donors.png'),
    icon: 'shield-checkmark',
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const [index, setIndex] = useState(0);

  const slide = ONBOARDING_SLIDES[index]!;

  const handleNext = () => {
    if (index < ONBOARDING_SLIDES.length - 1) {
      setIndex(index + 1);
    } else {
      router.push('/(auth)/login');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <ScreenSwitcher currentScreenId={2} />
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={styles.skipBtn}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <Text style={styles.skipText}>Skip</Text>
        </TouchableOpacity>
      </View>

      {/* Hero Card Image / Graphic */}
      <View style={styles.heroCard}>
        <Image source={slide.image} style={styles.heroImage} resizeMode="contain" />
        <View style={styles.iconBadge}>
          <Ionicons name={slide.icon as any} size={28} color="#FFFFFF" />
        </View>
      </View>

      {/* Description Content */}
      <View style={styles.content}>
        <View style={styles.dots}>
          {ONBOARDING_SLIDES.map((_, i) => (
            <View
              key={i}
              style={[styles.dot, i === index && styles.dotActive]}
            />
          ))}
        </View>

        <Text style={styles.title}>{slide.title}</Text>
        <Text style={styles.subtitle}>{slide.subtitle}</Text>
      </View>

      {/* Footer Buttons */}
      <View style={styles.footer}>
        <AppButton
          title={index === ONBOARDING_SLIDES.length - 1 ? 'Get Started' : 'Next'}
          variant="primary"
          onPress={handleNext}
          icon="arrow-forward"
          style={styles.btn}
        />
        <TouchableOpacity
          onPress={() => router.push('/(auth)/login')}
          style={styles.loginLink}
        >
          <Text style={styles.loginText}>
            Already have an account? <Text style={styles.loginBold}>Sign In</Text>
          </Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  skipBtn: {
    padding: spacing.xs,
  },
  skipText: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.textMuted,
  },
  heroCard: {
    width: '100%',
    height: 260,
    backgroundColor: '#F9FAFB',
    borderRadius: borderRadius.xl,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
    position: 'relative',
  },
  heroImage: {
    width: '90%',
    height: '80%',
  },
  iconBadge: {
    position: 'absolute',
    bottom: -20,
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  content: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  dots: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
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
  title: {
    fontSize: 26,
    fontWeight: '900',
    color: '#111827',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 14,
    color: colors.textMuted,
    textAlign: 'center',
    lineHeight: 21,
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
  footer: {
    width: '100%',
    gap: 12,
  },
  btn: {
    height: 54,
    borderRadius: borderRadius.md,
  },
  loginLink: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  loginText: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  loginBold: {
    fontWeight: '700',
    color: colors.primary,
  },
});

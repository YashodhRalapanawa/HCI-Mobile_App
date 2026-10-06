import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function DonorBadgesScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const count = user?.donationCount || 5;

  const badges = [
    {
      id: 'first_drop',
      title: 'First Drop',
      subtitle: '1st Successful Donation',
      description: 'Awarded after your very first verified blood donation.',
      icon: 'water',
      unlocked: count >= 1,
      tier: 'Bronze',
    },
    {
      id: 'life_saver',
      title: 'Life Saver',
      subtitle: '3 Donations Completed',
      description: 'Helped sustain critical hospital blood bank supplies.',
      icon: 'heart',
      unlocked: count >= 3,
      tier: 'Bronze',
    },
    {
      id: 'silver_hero',
      title: 'Silver Donor',
      subtitle: '5 Donations Completed',
      description: 'Over 15 lives saved through consistent commitment.',
      icon: 'shield-checkmark',
      unlocked: count >= 5,
      tier: 'Silver',
    },
    {
      id: 'gold_champion',
      title: 'Gold Champion',
      subtitle: '10 Donations Milestone',
      description: 'Legendary donor recognized by National Blood Bank.',
      icon: 'trophy',
      unlocked: count >= 10,
      tier: 'Gold',
    },
    {
      id: 'platinum_guardian',
      title: 'Platinum Guardian',
      subtitle: '25 Donations Milestone',
      description: 'Distinguished honor awarded for lifetime service.',
      icon: 'medal',
      unlocked: count >= 25,
      tier: 'Platinum',
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader
        title="Donor Badges"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={14} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Milestone Banner */}
        <View style={styles.milestoneCard}>
          <View style={styles.tierPill}>
            <Text style={styles.tierPillText}>SILVER LEVEL DONOR</Text>
          </View>
          <Text style={styles.milestoneTitle}>
            {count >= 10 ? 'Gold Champion Donor!' : `${10 - count} Donations to Gold Champion`}
          </Text>
          <Text style={styles.milestoneSub}>
            You have saved approximately {count * 3} lives across Sri Lanka!
          </Text>

          {/* Progress bar */}
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View style={[styles.progressFill, { width: `${Math.min((count / 10) * 100, 100)}%` }]} />
            </View>
            <Text style={styles.progressText}>{count} / 10 Donations</Text>
          </View>
        </View>

        {/* Badges Grid */}
        <Text style={styles.sectionHeading}>Hero Badges Catalog</Text>

        <View style={styles.badgesGrid}>
          {badges.map((badge) => (
            <View
              key={badge.id}
              style={[
                styles.badgeCard,
                !badge.unlocked && styles.badgeLocked,
              ]}
            >
              <View
                style={[
                  styles.badgeIconCircle,
                  badge.unlocked ? styles.badgeIconUnlocked : styles.badgeIconLocked,
                ]}
              >
                <Ionicons
                  name={badge.icon as any}
                  size={26}
                  color={badge.unlocked ? colors.tertiaryDark : '#9CA3AF'}
                />
              </View>

              <Text style={styles.badgeTitle}>{badge.title}</Text>
              <Text style={styles.badgeSub}>{badge.subtitle}</Text>
              <Text style={styles.badgeDesc}>{badge.description}</Text>

              <View
                style={[
                  styles.statusTag,
                  badge.unlocked ? styles.statusUnlocked : styles.statusLocked,
                ]}
              >
                <Text
                  style={[
                    styles.statusTagText,
                    badge.unlocked ? { color: '#059669' } : { color: '#6B7280' },
                  ]}
                >
                  {badge.unlocked ? 'UNLOCKED' : 'LOCKED'}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomNavBar activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 30,
  },
  milestoneCard: {
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  tierPill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.tertiaryLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: borderRadius.full,
    marginBottom: 8,
  },
  tierPillText: {
    color: colors.tertiaryDark,
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  milestoneTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  milestoneSub: {
    fontSize: 13,
    color: '#CBD5E1',
    marginTop: 4,
    lineHeight: 18,
  },
  progressContainer: {
    marginTop: spacing.md,
  },
  progressBar: {
    height: 7,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 6,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.tertiary,
  },
  progressText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
    textAlign: 'right',
  },
  sectionHeading: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  badgesGrid: {
    gap: 10,
  },
  badgeCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    alignItems: 'center',
    position: 'relative',
  },
  badgeLocked: {
    opacity: 0.65,
    backgroundColor: '#F9FAFB',
  },
  badgeIconCircle: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  badgeIconUnlocked: {
    backgroundColor: colors.tertiaryLight,
    borderWidth: 2,
    borderColor: colors.tertiary,
    shadowColor: colors.tertiary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  badgeIconLocked: {
    backgroundColor: '#E5E7EB',
  },
  badgeTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  badgeSub: {
    fontSize: 12,
    color: colors.primary,
    fontWeight: '700',
    marginTop: 2,
  },
  badgeDesc: {
    fontSize: 11,
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: 4,
    lineHeight: 16,
  },
  statusTag: {
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: borderRadius.xs,
  },
  statusUnlocked: {
    backgroundColor: '#D1FAE5',
  },
  statusLocked: {
    backgroundColor: '#F3F4F6',
  },
  statusTagText: {
    fontSize: 10,
    fontWeight: '800',
  },
});

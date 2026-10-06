import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/AppButton';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function PublicProfilePreviewScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const handleRequestBlood = () => {
    Alert.alert(
      'Blood Request Flow',
      `This triggers a matching request for donor ${user?.name || 'Kasun Perera'} (${user?.bloodGroup || 'O+'}). Managed under Member 2 / Emergency Requests module.`,
      [{ text: 'OK' }],
    );
  };

  const handleCall = () => {
    Alert.alert(
      'Donor Contact',
      `Connecting call to verified donor line: ${user?.phone || '+94 77 123 4567'}`,
      [{ text: 'Call Now' }, { text: 'Cancel', style: 'cancel' }],
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Donor Profile (Public View)"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={16} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Preview Disclaimer */}
        <View style={styles.previewNotice}>
          <Ionicons name="eye-outline" size={16} color={colors.info} style={{ marginRight: 6 }} />
          <Text style={styles.previewNoticeText}>
            Public View: This is how recipients and hospitals see your card.
          </Text>
        </View>

        {/* Hero Donor Card */}
        <View style={styles.heroCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('') || 'KP'}
            </Text>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark" size={12} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.donorName}>{user?.name || 'Kasun Perera'}</Text>

          <View style={styles.locationRow}>
            <Ionicons name="location" size={14} color={colors.textMuted} />
            <Text style={styles.locationText}>
              {user?.city || 'Colombo 07'}, {user?.district || 'Colombo'} · 2.5 km away
            </Text>
          </View>

          {/* Badges Row */}
          <View style={styles.badgeRow}>
            <View style={styles.bloodBadge}>
              <Ionicons name="water" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.bloodBadgeText}>{user?.bloodGroup || 'O+'} Blood Group</Text>
            </View>

            <View
              style={[
                styles.availBadge,
                user?.isAvailable ? styles.availNow : styles.availOff,
              ]}
            >
              <View
                style={[
                  styles.statusDot,
                  user?.isAvailable ? { backgroundColor: colors.success } : { backgroundColor: colors.textMuted },
                ]}
              />
              <Text
                style={[
                  styles.availBadgeText,
                  user?.isAvailable ? { color: colors.success } : { color: colors.textMuted },
                ]}
              >
                {user?.isAvailable ? 'Available Now' : 'Not Available'}
              </Text>
            </View>
          </View>
        </View>

        {/* 3 Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{user?.donationCount || 5}</Text>
            <Text style={styles.statLbl}>Donations</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statVal, { color: colors.success }]}>100%</Text>
            <Text style={styles.statLbl}>Response</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statVal}>{(user?.donationCount || 5) * 3}</Text>
            <Text style={styles.statLbl}>Lives Saved</Text>
          </View>
        </View>

        {/* Health & Safety Card */}
        <View style={styles.detailCard}>
          <Text style={styles.cardHeading}>Medical Screening Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Eligibility Status:</Text>
            <Text style={styles.infoVal}>Verified & Ready</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Gender / Weight:</Text>
            <Text style={styles.infoVal}>{user?.gender || 'Male'} · {user?.weight || 68} kg</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoKey}>Registered Centre:</Text>
            <Text style={styles.infoVal}>National Blood Centre, Narahenpita</Text>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionRow}>
          <AppButton
            title="Request Blood"
            variant="primary"
            icon="water-outline"
            onPress={handleRequestBlood}
            style={{ flex: 1.5, marginRight: 8, height: 52 }}
          />
          <AppButton
            title="Call"
            variant="outline"
            icon="call-outline"
            onPress={handleCall}
            style={{ flex: 1, height: 52 }}
          />
        </View>

        <TouchableOpacity
          style={styles.reportRow}
          onPress={() => Alert.alert('Report Case', 'Open Safety Report form.')}
        >
          <Ionicons name="flag-outline" size={14} color={colors.textMuted} style={{ marginRight: 6 }} />
          <Text style={styles.reportText}>Report profile or inaccurate availability</Text>
        </TouchableOpacity>
      </ScrollView>

      <BottomNavBar activeTab="search" />
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
  previewNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: borderRadius.sm,
    padding: 10,
    borderWidth: 1,
    borderColor: '#DBEAFE',
    marginBottom: spacing.md,
  },
  previewNoticeText: {
    fontSize: 12,
    color: '#1D4ED8',
    fontWeight: '600',
    flex: 1,
  },
  heroCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1E2229',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  avatarText: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  verifiedBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: colors.info,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  donorName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    gap: 4,
  },
  locationText: {
    fontSize: 13,
    color: colors.textMuted,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  bloodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  bloodBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  availBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
  },
  availNow: {
    backgroundColor: colors.successSoft,
    borderColor: '#A7F3D0',
  },
  availOff: {
    backgroundColor: '#F3F4F6',
    borderColor: '#E5E7EB',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  availBadgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: spacing.md,
  },
  statBox: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    alignItems: 'center',
  },
  statVal: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  statLbl: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  detailCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeading: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  infoKey: {
    fontSize: 12,
    color: colors.textMuted,
  },
  infoVal: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  actionRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  reportRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },
  reportText: {
    fontSize: 12,
    color: colors.textMuted,
    fontWeight: '600',
  },
});

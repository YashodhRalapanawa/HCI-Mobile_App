import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '@/theme';

export interface ScreenItem {
  id: number;
  title: string;
  route: string;
  category: 'auth' | 'profile';
  figmaName: string;
}

export const MEMBER_1_SCREENS: ScreenItem[] = [
  { id: 1, title: 'Launch / Splash', route: '/(auth)/launch', category: 'auth', figmaName: 'Member 1 — Launch' },
  { id: 2, title: 'Onboarding (Fast Matching)', route: '/(auth)/onboarding', category: 'auth', figmaName: 'Member 1 — Onboarding' },
  { id: 3, title: 'Login With Us', route: '/(auth)/login', category: 'auth', figmaName: 'Member 1 — Login' },
  // { id: 4, title: 'OTP Verification (Bypassed)', route: '/(auth)/verify-otp', category: 'auth', figmaName: 'Member 1 — OTP Phone' },
  { id: 5, title: 'Forgot / Reset Password', route: '/(auth)/forgot-password', category: 'auth', figmaName: 'Member 1 — Forgot Password' },
  { id: 6, title: 'Register Account (Step 1)', route: '/(auth)/register', category: 'auth', figmaName: 'Member 1 — Register' },
  { id: 7, title: 'Donor Details (Step 2)', route: '/(auth)/donor-details', category: 'auth', figmaName: 'Member 1 — Donor Details' },
  { id: 8, title: 'Complete Profile & Health (Step 3)', route: '/(auth)/complete-profile', category: 'auth', figmaName: 'Member 1 — Complete Profile' },
  { id: 9, title: 'My Profile Dashboard', route: '/profile', category: 'profile', figmaName: 'Member 1 — My Profile' },
  { id: 10, title: 'Edit Profile', route: '/profile/edit', category: 'profile', figmaName: 'Member 1 — Edit Profile' },
  { id: 11, title: 'Eligibility Status', route: '/profile/eligibility', category: 'profile', figmaName: 'Member 1 — Eligibility Status' },
  { id: 12, title: 'Emergency Contacts', route: '/profile/emergency-contacts', category: 'profile', figmaName: 'Member 1 — Emergency Contacts' },
  { id: 13, title: 'Donation History & Stats', route: '/profile/donation-history', category: 'profile', figmaName: 'Member 1 — Donation History' },
  { id: 14, title: 'Donor Badges & Milestones', route: '/profile/badges', category: 'profile', figmaName: 'Member 1 — Donor Badges' },
  { id: 15, title: 'Security PIN & Passcode', route: '/profile/security-pin', category: 'auth', figmaName: 'Member 1 — Quick Passcode' },
  { id: 16, title: 'Home Dashboard (Member 1.16)', route: '/dashboard', category: 'profile', figmaName: 'Member 1.16 — Dashboard' },
  { id: 17, title: 'Account Settings & Privacy', route: '/profile/settings', category: 'profile', figmaName: 'Member 1 — Settings & Privacy' },
  { id: 18, title: 'Public Donor Profile View', route: '/profile/public-preview', category: 'profile', figmaName: 'Member 1 — Public Donor View' },
];

interface ScreenSwitcherProps {
  currentScreenId: number;
}

export function ScreenSwitcher({ currentScreenId }: ScreenSwitcherProps) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  const handleSelect = (route: string) => {
    setVisible(false);
    router.push(route as any);
  };

  return (
    <>
      <TouchableOpacity
        style={styles.pill}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
      >
        <Ionicons name="layers-outline" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
        <Text style={styles.pillText}>Screen {currentScreenId}/{MEMBER_1_SCREENS.length}</Text>
        <Ionicons name="chevron-down" size={13} color="#FFFFFF" style={{ marginLeft: 3 }} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <View>
                <Text style={styles.modalTitle}>Member 1 Figma Screens</Text>
                <Text style={styles.modalSubtitle}>All 17 Authentication & Profile Screens</Text>
              </View>
              <TouchableOpacity
                onPress={() => setVisible(false)}
                style={styles.closeBtn}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.list}>
              {MEMBER_1_SCREENS.map((screen) => {
                const isActive = screen.id === currentScreenId;
                return (
                  <TouchableOpacity
                    key={screen.id}
                    style={[styles.item, isActive && styles.itemActive]}
                    onPress={() => handleSelect(screen.route)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.badge, isActive && styles.badgeActive]}>
                      <Text style={[styles.badgeText, isActive && styles.badgeTextActive]}>
                        {screen.id}
                      </Text>
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={[styles.itemTitle, isActive && styles.itemTitleActive]}>
                        {screen.title}
                      </Text>
                      <Text style={styles.itemRoute}>{screen.figmaName}</Text>
                    </View>
                    <Ionicons
                      name={isActive ? 'checkmark-circle' : 'chevron-forward'}
                      size={18}
                      color={isActive ? colors.primary : colors.textMuted}
                    />
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E2229',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: '#374151',
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '80%',
    paddingBottom: 24,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  list: {
    padding: spacing.md,
    gap: 8,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: '#FAFAFA',
  },
  itemActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#E5E7EB',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  badgeActive: {
    backgroundColor: colors.primary,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
  },
  badgeTextActive: {
    color: '#FFFFFF',
  },
  itemInfo: {
    flex: 1,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  itemTitleActive: {
    color: colors.primary,
  },
  itemRoute: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
});

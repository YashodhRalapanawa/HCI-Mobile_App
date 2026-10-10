import React, { useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius, spacing } from '@/theme';

export interface ScreenItem {
  id: number;
  title: string;
  route: string;
  category: 'auth' | 'profile' | 'requests';
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
  { id: 19, title: 'New Blood Request', route: '/requests/new', category: 'requests', figmaName: 'Member 2.1 — New Blood Request' },
  { id: 20, title: 'Request Submitted (Confirmation)', route: '/requests/preview/submitted', category: 'requests', figmaName: 'Member 2.2 — Request Submitted' },
  { id: 21, title: 'My Requests (List & Status)', route: '/requests/my', category: 'requests', figmaName: 'Member 2.3 — My Requests' },
  { id: 22, title: 'Delivery Person Assigned (Preview)', route: '/requests/my?preview=delivery_assigned', category: 'requests', figmaName: 'Member 2.4 — Delivery Assigned' },
  { id: 23, title: 'Delivery Contact (Preview)', route: '/requests/preview/delivery', category: 'requests', figmaName: 'Member 2.5 — Delivery Contact' },
  { id: 24, title: 'Confirm Delivery Arrival (Dialog)', route: '/requests/preview/delivery?dialog=confirm_arrival', category: 'requests', figmaName: 'Member 2.6 — Confirm Arrival' },
  { id: 25, title: 'Arrival Confirmed (Member 2.7)', route: '/requests/preview/arrival-confirmed', category: 'requests', figmaName: 'Member 2.7 — Arrival Confirmed' },
  { id: 26, title: 'Donor Dashboard (Preview)', route: '/donor/dashboard?preview=1', category: 'profile', figmaName: 'Member 3.1 — Donor Dashboard' },
  { id: 27, title: 'Donation Request Details (Preview)', route: '/donor/requests/preview-req-1?preview=1', category: 'profile', figmaName: 'Member 3.2 — Donation Request Details' },
  { id: 28, title: 'My Accepted Requests (Preview)', route: '/donor/my-accepted?preview=1', category: 'profile', figmaName: 'Member 3.3 — My Accepted Requests' },
  { id: 29, title: 'Admin Dashboard (Preview)', route: '/admin?preview=1', category: 'profile', figmaName: 'Member 4.1 — Admin Dashboard' },
  { id: 30, title: 'Patient Requests Management (Admin Page 2)', route: '/admin/patient-requests?preview=1', category: 'profile', figmaName: 'Member 4.2 — Patient Requests' },
];

interface ScreenSwitcherProps {
  currentScreenId: number;
}

export function ScreenSwitcher({ currentScreenId }: ScreenSwitcherProps) {
  const [visible, setVisible] = useState(false);
  const router = useRouter();
  const { width } = useWindowDimensions();
  const compact = width < 430;

  const handleSelect = async (route: string) => {
    setVisible(false);
    if (route === '/requests/preview/submitted') {
      try {
        const latestId = await AsyncStorage.getItem('latest_submitted_request_id');
        if (latestId) {
          router.push(`/requests/${latestId}/submitted` as any);
          return;
        }
      } catch {
        // fallback
      }
    }
    router.push(route as any);
  };

  const activeIndex = MEMBER_1_SCREENS.findIndex((screen) => screen.id === currentScreenId);
  const pillText =
    currentScreenId === 19
      ? 'Member 2.1'
      : currentScreenId === 20
      ? 'Member 2.2'
      : currentScreenId === 21
      ? 'Member 2.3'
      : currentScreenId === 22
      ? 'Member 2.4'
      : currentScreenId === 23
      ? 'Member 2.5'
      : currentScreenId === 24
      ? 'Member 2.6'
      : currentScreenId === 25
      ? 'Member 2.7'
      : currentScreenId === 26
      ? 'Member 3.1'
      : currentScreenId === 27
      ? 'Member 3.2'
      : currentScreenId === 28
      ? 'Member 3.3'
      : currentScreenId === 29
      ? 'Admin'
      : currentScreenId === 30
      ? 'Admin 2'
      : activeIndex !== -1
      ? `Screen ${activeIndex + 1}/${MEMBER_1_SCREENS.length}`
      : `Screen ${currentScreenId}`;

  return (
    <>
      <TouchableOpacity
        style={[styles.pill, compact && styles.compactPill]}
        onPress={() => setVisible(true)}
        activeOpacity={0.8}
        accessibilityLabel={`Open pages, screen ${currentScreenId} of ${MEMBER_1_SCREENS.length}`}
        accessibilityRole="button"
      >
        <Ionicons name="layers-outline" size={compact ? 18 : 14} color="#FFFFFF" style={compact ? undefined : styles.pillIcon} />
        {!compact && (
          <>
            <Text style={styles.pillText}>{pillText}</Text>
            <Ionicons name="chevron-down" size={13} color="#FFFFFF" style={styles.pillChevron} />
          </>
        )}
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
                <Text style={styles.modalTitle}>App Navigation & Screens</Text>
                <Text style={styles.modalSubtitle}>Authentication, Profile & Requests Screens</Text>
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
  compactPill: {
    width: 38,
    height: 38,
    paddingHorizontal: 0,
    paddingVertical: 0,
    borderRadius: 19,
    justifyContent: 'center',
  },
  pillIcon: {
    marginRight: 5,
  },
  pillText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  pillChevron: {
    marginLeft: 3,
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

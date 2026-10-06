import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function MyProfileScreen() {
  const router = useRouter();
  const { user, toggleAvailability, logout } = useAuth();

  const handleToggleAvailability = async (val: boolean) => {
    try {
      await toggleAvailability(val);
    } catch (_) {
      Alert.alert('Error', 'Could not update availability.');
    }
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out of LifeLine LK?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const menuItems = [
    {
      title: 'Edit Personal Profile',
      subtitle: 'Name, phone, blood group, city & location',
      icon: 'person-outline',
      route: '/profile/edit',
    },
    {
      title: 'Medical & Eligibility Status',
      subtitle: 'Check donation readiness and criteria',
      icon: 'fitness-outline',
      route: '/profile/eligibility',
    },
    {
      title: 'Emergency Contacts',
      subtitle: 'Manage safety contacts and live alerts',
      icon: 'call-outline',
      route: '/profile/emergency-contacts',
    },
    {
      title: 'Donation History',
      subtitle: 'Recorded units and hospital receipts',
      icon: 'time-outline',
      route: '/profile/donation-history',
    },
    {
      title: 'Donor Badges & Milestones',
      subtitle: 'View achievements and lives impacted',
      icon: 'trophy-outline',
      route: '/profile/badges',
    },
    {
      title: 'Security PIN & Passcode',
      subtitle: 'Quick 4-digit PIN & biometrics',
      icon: 'lock-closed-outline',
      route: '/profile/security-pin',
    },
    {
      title: 'Public Donor Profile Preview',
      subtitle: 'How other recipients see your card',
      icon: 'eye-outline',
      route: '/profile/public-preview',
    },
    {
      title: 'Account Settings & Privacy',
      subtitle: 'Notifications, SMS, dark mode & preferences',
      icon: 'settings-outline',
      route: '/profile/settings',
    },
  ];

  return (
    <View style={styles.container}>
      <AppHeader
        title="My Profile"
        showBack={false}
        rightElement={
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <TouchableOpacity
              onPress={() => router.push('/profile/edit')}
              style={styles.headerIconBtn}
            >
              <Ionicons name="pencil-outline" size={18} color={colors.text} />
            </TouchableOpacity>
            <ScreenSwitcher currentScreenId={9} />
          </View>
        }
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Profile Card Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>
              {user?.name
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('') || 'KP'}
            </Text>
            <View style={styles.cameraBadge}>
              <Ionicons name="shield-checkmark" size={14} color="#FFFFFF" />
            </View>
          </View>

          <Text style={styles.userName}>{user?.name || 'Kasun Perera'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'kasun@example.com'}</Text>

          <View style={styles.pillRow}>
            <View style={styles.bloodPill}>
              <Ionicons name="water" size={14} color="#FFFFFF" style={{ marginRight: 4 }} />
              <Text style={styles.bloodPillText}>{user?.bloodGroup || 'O+'} Blood</Text>
            </View>
            <View style={styles.eligiblePill}>
              <Ionicons name="checkmark-circle" size={14} color={colors.success} style={{ marginRight: 4 }} />
              <Text style={styles.eligiblePillText}>Eligible Donor</Text>
            </View>
          </View>
        </View>

        {/* 2 Stats Cards */}
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Ionicons name="water-outline" size={22} color={colors.primary} />
            <Text style={styles.statNumber}>{user?.donationCount || 5}</Text>
            <Text style={styles.statLabel}>Completed Donations</Text>
          </View>
          <View style={styles.statCard}>
            <Ionicons name="location-outline" size={22} color={colors.info} />
            <Text style={styles.statNumber}>{user?.district || 'Colombo'}</Text>
            <Text style={styles.statLabel}>{user?.city || 'Colombo 07'}</Text>
          </View>
        </View>

        {/* Availability Toggle Box */}
        <View style={styles.availCard}>
          <View style={styles.availIconBox}>
            <Ionicons
              name={user?.isAvailable ? 'flash' : 'flash-off'}
              size={20}
              color={user?.isAvailable ? '#FFFFFF' : colors.textMuted}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.availTitle}>
              {user?.isAvailable ? 'Available to Donate' : 'Unavailable for Donation'}
            </Text>
            <Text style={styles.availSub}>
              {user?.isAvailable
                ? 'Your profile is visible for emergency blood matching.'
                : 'Turn this on when you are ready to receive requests.'}
            </Text>
          </View>
          <Switch
            value={Boolean(user?.isAvailable)}
            onValueChange={handleToggleAvailability}
            trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
            thumbColor={user?.isAvailable ? colors.success : '#F3F4F6'}
          />
        </View>

        {/* Section List of Actions */}
        <View style={styles.menuList}>
          {menuItems.map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={() => router.push(item.route as any)}
              activeOpacity={0.7}
            >
              <View style={styles.menuIconBox}>
                <Ionicons name={item.icon as any} size={20} color={colors.text} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Text style={styles.menuSub}>{item.subtitle}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          ))}
        </View>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Sign Out of LifeLine LK</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Persistent Bottom Bar with Profile tab active */}
      <BottomNavBar activeTab="profile" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  headerIconBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 30,
  },
  profileHeader: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: '#1E2229',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cameraBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  userName: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  userEmail: {
    fontSize: 13,
    color: colors.textMuted,
    marginTop: 2,
  },
  pillRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 10,
  },
  bloodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  bloodPillText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  eligiblePill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.successSoft,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: borderRadius.full,
  },
  eligiblePillText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '700',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: spacing.md,
  },
  statCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 6,
  },
  statLabel: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  availCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  availIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1E2229',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  availTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  availSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
    paddingRight: 6,
  },
  menuList: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
    marginBottom: spacing.md,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  menuIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  menuSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    height: 50,
    borderRadius: borderRadius.md,
    marginTop: 4,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
});

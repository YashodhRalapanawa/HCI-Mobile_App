import React, { useState } from 'react';
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

export default function SettingsScreen() {
  const router = useRouter();
  const { user, updateProfile, logout } = useAuth();

  const [pushNotif, setPushNotif] = useState(Boolean(user?.preferences?.pushNotifications ?? true));
  const [smsAlerts, setSmsAlerts] = useState(Boolean(user?.preferences?.smsAlerts ?? true));
  const [locationShare, setLocationShare] = useState(Boolean(user?.preferences?.locationSharing ?? true));
  const [publicDonor, setPublicDonor] = useState(Boolean(user?.preferences?.isPublicDonor ?? true));

  const handleToggle = async (key: string, val: boolean) => {
    try {
      if (key === 'push') {
        setPushNotif(val);
        await updateProfile({ preferences: { ...user?.preferences, pushNotifications: val } as any });
      } else if (key === 'sms') {
        setSmsAlerts(val);
        await updateProfile({ preferences: { ...user?.preferences, smsAlerts: val } as any });
      } else if (key === 'loc') {
        setLocationShare(val);
        await updateProfile({ preferences: { ...user?.preferences, locationSharing: val } as any });
      } else if (key === 'public') {
        setPublicDonor(val);
        await updateProfile({ preferences: { ...user?.preferences, isPublicDonor: val } as any });
      }
    } catch (_) {}
  };

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to log out?', [
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

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'This will permanently remove your donor profile and donation records in compliance with Sri Lanka privacy regulations.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Settings & Privacy"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={17} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* User Mini Card */}
        <View style={styles.userMiniCard}>
          <View style={styles.miniAvatar}>
            <Text style={styles.miniAvatarText}>
              {user?.name
                ?.split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('') || 'KP'}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.userName}>{user?.name || 'Kasun Perera'}</Text>
            <Text style={styles.userRole}>
              {user?.bloodGroup || 'O+'} · {user?.role === 'donor' ? 'Registered Donor' : 'Recipient'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push('/profile/edit')}
          >
            <Text style={styles.editText}>Edit</Text>
          </TouchableOpacity>
        </View>

        {/* Notifications Group */}
        <Text style={styles.groupHeading}>Notifications & Alerts</Text>
        <View style={styles.cardGroup}>
          <View style={styles.settingRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="notifications-outline" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Push Notifications</Text>
              <Text style={styles.rowSub}>Emergency requests and donor arrival alerts</Text>
            </View>
            <Switch
              value={pushNotif}
              onValueChange={(v) => handleToggle('push', v)}
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={pushNotif ? colors.success : '#F3F4F6'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Urgent SMS Notifications</Text>
              <Text style={styles.rowSub}>Direct text messages for critical blood shortages</Text>
            </View>
            <Switch
              value={smsAlerts}
              onValueChange={(v) => handleToggle('sms', v)}
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={smsAlerts ? colors.success : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Privacy & Location Group */}
        <Text style={styles.groupHeading}>Privacy & Visibility</Text>
        <View style={styles.cardGroup}>
          <View style={styles.settingRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="location-outline" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Consent-Based Location</Text>
              <Text style={styles.rowSub}>Share GPS only during verified donor journeys</Text>
            </View>
            <Switch
              value={locationShare}
              onValueChange={(v) => handleToggle('loc', v)}
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={locationShare ? colors.success : '#F3F4F6'}
            />
          </View>

          <View style={styles.divider} />

          <View style={styles.settingRow}>
            <View style={styles.rowIcon}>
              <Ionicons name="eye-outline" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Public Donor Directory</Text>
              <Text style={styles.rowSub}>Show availability to matching hospital requests</Text>
            </View>
            <Switch
              value={publicDonor}
              onValueChange={(v) => handleToggle('public', v)}
              trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
              thumbColor={publicDonor ? colors.success : '#F3F4F6'}
            />
          </View>
        </View>

        {/* Security & Support Group */}
        <Text style={styles.groupHeading}>Security & Support</Text>
        <View style={styles.cardGroup}>
          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() => router.push('/profile/security-pin')}
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="lock-closed-outline" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Security PIN & Passcode</Text>
              <Text style={styles.rowSub}>Manage 4-digit quick passcode & biometrics</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>

          <View style={styles.divider} />

          <TouchableOpacity
            style={styles.clickableRow}
            onPress={() =>
              Alert.alert(
                'NBTS Sri Lanka Helpline',
                'National Blood Transfusion Service Sri Lanka: (+94) 11 236 9931 / Emergency Hotline: 1990',
              )
            }
            activeOpacity={0.7}
          >
            <View style={styles.rowIcon}>
              <Ionicons name="help-circle-outline" size={20} color={colors.text} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.rowTitle}>Help & Blood Donation FAQs</Text>
              <Text style={styles.rowSub}>National transfusion guidelines & standards</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.7}>
          <Ionicons name="log-out-outline" size={18} color={colors.danger} style={{ marginRight: 8 }} />
          <Text style={styles.logoutText}>Log Out</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.deleteBtn} onPress={handleDeleteAccount} activeOpacity={0.7}>
          <Text style={styles.deleteText}>Delete LifeLine LK Account</Text>
        </TouchableOpacity>
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
  userMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    marginBottom: spacing.md,
  },
  miniAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E2229',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  miniAvatarText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  userName: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
  userRole: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  editBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: borderRadius.xs,
    backgroundColor: '#F3F4F6',
  },
  editText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  groupHeading: {
    fontSize: 13,
    fontWeight: '800',
    color: colors.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
    marginTop: 4,
  },
  cardGroup: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  clickableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  rowTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
  },
  rowSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: '#F3F4F6',
  },
  logoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    height: 50,
    borderRadius: borderRadius.md,
    marginTop: 8,
  },
  logoutText: {
    color: colors.danger,
    fontSize: 14,
    fontWeight: '700',
  },
  deleteBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    marginTop: 4,
  },
  deleteText: {
    color: colors.textMuted,
    fontSize: 12,
    fontWeight: '600',
  },
});

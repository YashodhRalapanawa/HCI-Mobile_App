import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, borderRadius } from '@/theme';

interface BottomNavBarProps {
  activeTab?: 'home' | 'search' | 'alerts' | 'profile';
}

export function BottomNavBar({ activeTab = 'profile' }: BottomNavBarProps) {
  const router = useRouter();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.replace('/profile')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === 'home' ? 'home' : 'home-outline'}
          size={22}
          color={activeTab === 'home' ? colors.primary : colors.textMuted}
        />
        <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Home</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push('/profile/public-preview')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === 'search' ? 'search' : 'search-outline'}
          size={22}
          color={activeTab === 'search' ? colors.primary : colors.textMuted}
        />
        <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>Donors</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push('/profile/settings')}
        activeOpacity={0.7}
      >
        <Ionicons
          name={activeTab === 'alerts' ? 'notifications' : 'notifications-outline'}
          size={22}
          color={activeTab === 'alerts' ? colors.primary : colors.textMuted}
        />
        <Text style={[styles.tabText, activeTab === 'alerts' && styles.tabTextActive]}>Alerts</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.replace('/profile')}
        activeOpacity={0.7}
      >
        <View style={activeTab === 'profile' ? styles.activePill : undefined}>
          <Ionicons
            name="person"
            size={20}
            color={activeTab === 'profile' ? '#FFFFFF' : colors.textMuted}
          />
        </View>
        {activeTab !== 'profile' ? <Text style={styles.tabText}>Profile</Text> : null}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    height: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
  },
  tabText: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.textMuted,
    marginTop: 2,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '700',
  },
  activePill: {
    width: 44,
    height: 38,
    borderRadius: borderRadius.md,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
});

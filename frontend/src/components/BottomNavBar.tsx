import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';

interface BottomNavBarProps {
  activeTab?: 'home' | 'search' | 'alerts' | 'profile';
}

export function BottomNavBar({ activeTab = 'home' }: BottomNavBarProps) {
  const router = useRouter();
  const { user } = useAuth();

  const handleHomePress = () => {
    if (user?.role === 'admin') {
      router.replace('/admin' as any);
    } else if (user?.role === 'donor') {
      router.replace('/donor/dashboard' as any);
    } else {
      router.replace('/dashboard' as any);
    }
  };
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 6) }]}>
      {/* Home Tab */}
      <TouchableOpacity
        style={styles.tab}
        onPress={handleHomePress}
        activeOpacity={0.7}
      >
        <View style={activeTab === 'home' ? styles.activeHomeIconContainer : styles.iconContainer}>
          <Ionicons
            name={activeTab === 'home' ? 'home' : 'home-outline'}
            size={activeTab === 'home' ? 19 : 22}
            color={activeTab === 'home' ? '#FFFFFF' : '#94A3B8'}
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'home' && styles.tabTextActive]}>Home</Text>
      </TouchableOpacity>

      {/* Search Tab */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push('/find-donors')}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={activeTab === 'search' ? 'search' : 'search-outline'}
            size={22}
            color={activeTab === 'search' ? colors.primary : '#94A3B8'}
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'search' && styles.tabTextActive]}>Search</Text>
      </TouchableOpacity>

      {/* Alerts Tab */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.push('/notifications')}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={activeTab === 'alerts' ? 'notifications' : 'notifications-outline'}
            size={22}
            color={activeTab === 'alerts' ? colors.primary : '#94A3B8'}
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'alerts' && styles.tabTextActive]}>Alerts</Text>
      </TouchableOpacity>

      {/* Profile Tab */}
      <TouchableOpacity
        style={styles.tab}
        onPress={() => router.replace('/profile' as any)}
        activeOpacity={0.7}
      >
        <View style={styles.iconContainer}>
          <Ionicons
            name={activeTab === 'profile' ? 'person' : 'person-outline'}
            size={22}
            color={activeTab === 'profile' ? colors.primary : '#94A3B8'}
          />
        </View>
        <Text style={[styles.tabText, activeTab === 'profile' && styles.tabTextActive]}>Profile</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    minHeight: 64,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
  },
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    height: '100%',
  },
  iconContainer: {
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeHomeIconContainer: {
    width: 32,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#94A3B8',
    marginTop: 2,
  },
  tabTextActive: {
    color: '#DC2626',
    fontWeight: '700',
  },
});

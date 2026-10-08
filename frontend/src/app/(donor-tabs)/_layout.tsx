import React from 'react';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/theme';
export default function DonorTabsLayout() {
  return <Tabs screenOptions={{ headerShown: false, tabBarActiveTintColor: colors.primary }}>
    <Tabs.Screen name="index" options={{ title: 'Search', tabBarIcon: ({ color, size }) => <Ionicons name="search" color={color} size={size} /> }} />
    <Tabs.Screen name="alerts" options={{ title: 'Alerts', tabBarIcon: ({ color, size }) => <Ionicons name="notifications" color={color} size={size} /> }} />
  </Tabs>;
}

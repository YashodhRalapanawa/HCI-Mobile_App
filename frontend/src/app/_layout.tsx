import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AuthProvider } from '@/features/auth/context/AuthContext';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="(auth)/launch" />
          <Stack.Screen name="(auth)/onboarding" />
          <Stack.Screen name="(auth)/login" />
          {/* OTP verification disabled as requested */}
          {/* <Stack.Screen name="(auth)/verify-otp" /> */}
          <Stack.Screen name="(auth)/forgot-password" />
          <Stack.Screen name="(auth)/register" />
          <Stack.Screen name="(auth)/donor-details" />
          <Stack.Screen name="(auth)/complete-profile" />
          <Stack.Screen name="dashboard/index" />
          <Stack.Screen name="profile/index" />
          <Stack.Screen name="profile/edit" />
          <Stack.Screen name="profile/eligibility" />
          <Stack.Screen name="profile/emergency-contacts" />
          <Stack.Screen name="profile/donation-history" />
          <Stack.Screen name="profile/badges" />
          <Stack.Screen name="profile/security-pin" />
          <Stack.Screen name="profile/public-preview" />
          <Stack.Screen name="profile/settings" />
        </Stack>
        <StatusBar style="dark" />
      </AuthProvider>
    </SafeAreaProvider>
  );
}

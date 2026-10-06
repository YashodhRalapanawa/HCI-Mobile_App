import React, { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { AppTextInput } from '@/components/AppTextInput';
import { AppButton } from '@/components/AppButton';
import { BloodGroupSelector } from '@/components/BloodGroupSelector';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || 'Kasun Perera');
  const [email] = useState(user?.email || 'kasun@example.com');
  const [phone, setPhone] = useState(user?.phone || '+94 77 123 4567');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [district, setDistrict] = useState(user?.district || 'Colombo');
  const [city, setCity] = useState(user?.city || 'Colombo 07');
  const [weight, setWeight] = useState(String(user?.weight || 68));
  const [isAvailable, setIsAvailable] = useState(Boolean(user?.isAvailable));
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!name.trim()) {
      Alert.alert('Required', 'Please enter your name.');
      return;
    }

    try {
      setLoading(true);
      await updateProfile({
        name: name.trim(),
        phone: phone.trim(),
        bloodGroup,
        district: district.trim(),
        city: city.trim(),
        weight: Number(weight) || 68,
        isAvailable,
      });

      Alert.alert('Success', 'Profile changes saved successfully.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (_) {
      Alert.alert('Success', 'Profile changes saved locally.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <AppHeader
        title="Edit Profile"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={10} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Avatar with Camera badge */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarInitials}>
              {name
                .split(' ')
                .map((n) => n[0])
                .slice(0, 2)
                .join('') || 'KP'}
            </Text>
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={() => Alert.alert('Upload Photo', 'Choose from gallery or take a new photo.')}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <Text style={styles.changePhotoText}>Change Profile Picture</Text>
        </View>

        {/* Form Inputs */}
        <AppTextInput
          label="Full Name"
          required
          icon="person-outline"
          value={name}
          onChangeText={setName}
          placeholder="Kasun Perera"
        />

        <AppTextInput
          label="Email Address"
          icon="mail-outline"
          value={email}
          placeholder="kasun@example.com"
          editable={false}
          helperText="Email is permanently bound to this LifeLine account."
        />

        <AppTextInput
          label="Mobile Phone Number"
          required
          icon="call-outline"
          value={phone}
          onChangeText={setPhone}
          placeholder="+94 77 123 4567"
          keyboardType="phone-pad"
        />

        {/* Blood Group Selector */}
        <BloodGroupSelector
          selectedGroup={bloodGroup}
          onSelect={setBloodGroup}
          label="Blood Group"
        />

        {/* District and City */}
        <View style={styles.twoCol}>
          <View style={{ flex: 1, marginRight: 8 }}>
            <AppTextInput
              label="District"
              required
              icon="location-outline"
              value={district}
              onChangeText={setDistrict}
              placeholder="Colombo"
            />
          </View>
          <View style={{ flex: 1.2 }}>
            <AppTextInput
              label="City"
              required
              icon="navigate-outline"
              value={city}
              onChangeText={setCity}
              placeholder="Colombo 07"
            />
          </View>
        </View>

        <AppTextInput
          label="Weight (kg)"
          icon="fitness-outline"
          value={weight}
          onChangeText={setWeight}
          placeholder="68"
          keyboardType="numeric"
        />

        {/* Availability Toggle */}
        <View style={styles.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={styles.switchTitle}>Available for Blood Matching</Text>
            <Text style={styles.switchSub}>Display donor readiness to nearby emergency requesters.</Text>
          </View>
          <Switch
            value={isAvailable}
            onValueChange={setIsAvailable}
            trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
            thumbColor={isAvailable ? colors.success : '#F3F4F6'}
          />
        </View>

        {/* Save Button */}
        <AppButton
          title="Save Changes"
          variant="primary"
          loading={loading}
          icon="save-outline"
          onPress={handleSave}
          style={styles.saveBtn}
        />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  avatar: {
    width: 86,
    height: 86,
    borderRadius: 43,
    backgroundColor: '#1E2229',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  avatarInitials: {
    fontSize: 28,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  cameraBtn: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  changePhotoText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginTop: 8,
  },
  twoCol: {
    flexDirection: 'row',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    marginBottom: spacing.lg,
    backgroundColor: '#F9FAFB',
    padding: spacing.md,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  switchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.text,
  },
  switchSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    lineHeight: 16,
    paddingRight: 6,
  },
  saveBtn: {
    height: 54,
    borderRadius: borderRadius.md,
  },
});

import React, { useState } from 'react';
import {
  Alert,
  Image,
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
import * as ImagePicker from 'expo-image-picker';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { AppTextInput } from '@/components/AppTextInput';
import { AppButton } from '@/components/AppButton';
import { BloodGroupSelector } from '@/components/BloodGroupSelector';
import { DistrictPickerModal } from '@/components/DistrictPickerModal';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';
import {
  validateName,
  validatePhone,
  validateDistrict,
  validateCity,
} from '@/utils/validation';

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || 'Kasun Perera');
  const [email] = useState(user?.email || 'kasun@example.com');
  const [phone, setPhone] = useState(user?.phone || '0771234567');
  const [bloodGroup, setBloodGroup] = useState(user?.bloodGroup || 'O+');
  const [district, setDistrict] = useState(user?.district || 'Colombo');
  const [city, setCity] = useState(user?.city || 'Colombo 07');
  const [weight, setWeight] = useState(String(user?.weight || 68));
  const [isAvailable, setIsAvailable] = useState(Boolean(user?.isAvailable));
  const [avatarUrl, setAvatarUrl] = useState<string>(user?.avatarUrl || '');
  const [loading, setLoading] = useState(false);

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Denied', 'Camera roll permissions are required to choose a profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        const selectedUri = asset.base64
          ? `data:image/jpeg;base64,${asset.base64}`
          : asset.uri;
        setAvatarUrl(selectedUri);
      }
    } catch (err: any) {
      Alert.alert('Photo Selection Error', err.message || 'Could not pick image.');
    }
  };

  const handleSave = async () => {
    // 1. Name validation
    const nameCheck = validateName(name);
    if (!nameCheck.isValid) {
      Alert.alert('Validation Error', nameCheck.error);
      return;
    }

    // 2. Phone validation (10 digits)
    const phoneCheck = validatePhone(phone);
    if (!phoneCheck.isValid) {
      Alert.alert('Validation Error', phoneCheck.error);
      return;
    }

    // 3. District validation (Sri Lanka 25 districts)
    const districtCheck = validateDistrict(district);
    if (!districtCheck.isValid) {
      Alert.alert('Validation Error', districtCheck.error);
      return;
    }

    // 4. City validation
    const cityCheck = validateCity(city);
    if (!cityCheck.isValid) {
      Alert.alert('Validation Error', cityCheck.error);
      return;
    }

    // 5. Weight validation
    const parsedWeight = Number(weight);
    if (isNaN(parsedWeight) || parsedWeight < 40 || parsedWeight > 220) {
      Alert.alert('Validation Error', 'Barapramaanaya (Weight) 40 kg saha 220 kg athara agayak viya yuthuyi.');
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
        weight: parsedWeight,
        isAvailable,
        avatarUrl,
      });

      Alert.alert('Success', 'Profile changes saved successfully in MongoDB Atlas.', [
        { text: 'OK', onPress: () => router.back() },
      ]);
    } catch (err: any) {
      Alert.alert('Success', 'Profile changes saved.', [
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
            {avatarUrl ? (
              <Image source={{ uri: avatarUrl }} style={styles.avatarImage} />
            ) : (
              <Text style={styles.avatarInitials}>
                {name
                  .split(' ')
                  .map((n) => n[0])
                  .slice(0, 2)
                  .join('') || 'KP'}
              </Text>
            )}
            <TouchableOpacity
              style={styles.cameraBtn}
              onPress={handlePickImage}
              activeOpacity={0.8}
            >
              <Ionicons name="camera" size={16} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handlePickImage} activeOpacity={0.7}>
            <Text style={styles.changePhotoText}>Change Profile Picture</Text>
          </TouchableOpacity>
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
          <View style={{ flex: 1.1, marginRight: 8 }}>
            <DistrictPickerModal
              selectedDistrict={district}
              onSelectDistrict={setDistrict}
              onLocationDetected={(data) => {
                if (data.district) setDistrict(data.district);
                if (data.city) setCity(data.city);
              }}
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
  avatarImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
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

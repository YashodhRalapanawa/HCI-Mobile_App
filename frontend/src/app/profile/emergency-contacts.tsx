import React, { useState } from 'react';
import {
  Alert,
  Modal,
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
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const { user, updateProfile } = useAuth();

  const [contacts, setContacts] = useState(
    user?.emergencyContacts && user.emergencyContacts.length > 0
      ? user.emergencyContacts
      : [
          {
            _id: '1',
            name: 'Sanduni Silva',
            relationship: 'Spouse',
            phone: '+94 71 987 6543',
            shareLocation: true,
          },
          {
            _id: '2',
            name: 'Nimal Perera',
            relationship: 'Brother',
            phone: '+94 77 555 8899',
            shareLocation: false,
          },
        ],
  );

  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newRel, setNewRel] = useState('Parent');
  const [newPhone, setNewPhone] = useState('');

  const toggleLocationShare = async (id: string | undefined, currentVal: boolean) => {
    const updated = contacts.map((c) =>
      c._id === id ? { ...c, shareLocation: !currentVal } : c,
    );
    setContacts(updated);
    await updateProfile({ emergencyContacts: updated });
  };

  const handleDelete = (id: string | undefined) => {
    Alert.alert('Remove Contact', 'Are you sure you want to remove this emergency contact?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          const updated = contacts.filter((c) => c._id !== id);
          setContacts(updated);
          await updateProfile({ emergencyContacts: updated });
        },
      },
    ]);
  };

  const handleAddContact = async () => {
    if (!newName.trim() || !newPhone.trim()) {
      Alert.alert('Required', 'Please enter contact name and phone number.');
      return;
    }

    const newContact = {
      _id: Date.now().toString(),
      name: newName.trim(),
      relationship: newRel.trim(),
      phone: newPhone.trim(),
      shareLocation: true,
    };

    const updated = [...contacts, newContact];
    setContacts(updated);
    await updateProfile({ emergencyContacts: updated });
    setNewName('');
    setNewPhone('');
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Emergency Contacts"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={12} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.infoBanner}>
          <Ionicons name="shield-checkmark" size={24} color={colors.primary} style={{ marginRight: 12 }} />
          <View style={{ flex: 1 }}>
            <Text style={styles.bannerTitle}>Safety & Location Alerts</Text>
            <Text style={styles.bannerSub}>
              These contacts are automatically notified during verified hospital journeys or urgent match requests.
            </Text>
          </View>
        </View>

        {/* Contact List */}
        <Text style={styles.sectionTitle}>Registered Contacts ({contacts.length})</Text>

        {contacts.map((contact) => (
          <View key={contact._id || contact.name} style={styles.contactCard}>
            <View style={styles.cardTop}>
              <View style={styles.avatarMini}>
                <Ionicons name="person" size={20} color="#FFFFFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.contactName}>{contact.name}</Text>
                <Text style={styles.contactMeta}>
                  {contact.relationship} · {contact.phone}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => handleDelete(contact._id)}
                style={styles.trashBtn}
              >
                <Ionicons name="trash-outline" size={18} color={colors.danger} />
              </TouchableOpacity>
            </View>

            <View style={styles.cardDivider} />

            <View style={styles.locationToggleRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.toggleTitle}>Share Live Journey Location</Text>
                <Text style={styles.toggleSub}>Send GPS tracking during emergency blood donations</Text>
              </View>
              <Switch
                value={contact.shareLocation}
                onValueChange={() => toggleLocationShare(contact._id, contact.shareLocation)}
                trackColor={{ false: '#D1D5DB', true: '#A7F3D0' }}
                thumbColor={contact.shareLocation ? colors.success : '#F3F4F6'}
              />
            </View>
          </View>
        ))}

        {/* Add Contact Button */}
        <AppButton
          title="+ Add Emergency Contact"
          variant="outline"
          onPress={() => setModalVisible(true)}
          style={styles.addBtn}
        />
      </ScrollView>

      {/* Add Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Emergency Contact</Text>
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                <Ionicons name="close" size={22} color={colors.text} />
              </TouchableOpacity>
            </View>

            <AppTextInput
              label="Contact Full Name"
              required
              icon="person-outline"
              value={newName}
              onChangeText={setNewName}
              placeholder="e.g. Priyantha Silva"
            />

            <AppTextInput
              label="Relationship"
              required
              icon="people-outline"
              value={newRel}
              onChangeText={setNewRel}
              placeholder="Spouse / Parent / Sibling / Friend"
            />

            <AppTextInput
              label="Phone Number"
              required
              icon="call-outline"
              value={newPhone}
              onChangeText={setNewPhone}
              placeholder="+94 77 123 4567"
              keyboardType="phone-pad"
            />

            <AppButton
              title="Save Contact"
              variant="primary"
              onPress={handleAddContact}
              style={{ marginTop: 10 }}
            />
          </View>
        </View>
      </Modal>

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
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    marginBottom: spacing.md,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  bannerSub: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  contactCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    marginBottom: 10,
  },
  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatarMini: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E2229',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
  },
  contactMeta: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  trashBtn: {
    padding: 6,
  },
  cardDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  locationToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.text,
  },
  toggleSub: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 1,
  },
  addBtn: {
    height: 52,
    borderRadius: borderRadius.md,
    marginTop: 6,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.text,
  },
});

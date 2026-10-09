import React from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { AppHeader } from '@/components/AppHeader';
import { AppButton } from '@/components/AppButton';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';

export default function DonationHistoryScreen() {
  const router = useRouter();
  const { user } = useAuth();

  const donations = user?.donationHistory || [
    {
      _id: 'dh1',
      hospital: 'National Blood Transfusion Service, Narahenpita',
      reference: 'NBTS-2026-081',
      bloodGroup: user?.bloodGroup || 'O+',
      unitsDonated: 1,
      completedAt: '2026-01-20',
      status: 'Completed',
    },
    {
      _id: 'dh2',
      hospital: 'Colombo National Hospital Blood Bank',
      reference: 'CNH-2025-412',
      bloodGroup: user?.bloodGroup || 'O+',
      unitsDonated: 1,
      completedAt: '2025-08-14',
      status: 'Completed',
    },
    {
      _id: 'dh3',
      hospital: 'Sri Jayewardenepura General Hospital',
      reference: 'SJH-2025-109',
      bloodGroup: user?.bloodGroup || 'O+',
      unitsDonated: 1,
      completedAt: '2025-03-02',
      status: 'Completed',
    },
  ];

  const totalDonations = donations.length;
  const livesSaved = totalDonations * 3;
  const volumeLiters = (totalDonations * 0.45).toFixed(2);

  const handleDownloadCertificate = (ref: string) => {
    Alert.alert(
      'Donation Certificate',
      `Official NBTS Sri Lanka donation verification certificate (${ref}) is verified and ready for download.`,
      [{ text: 'OK' }],
    );
  };

  return (
    <View style={styles.container}>
      <AppHeader
        title="Donation History"
        onBack={() => router.back()}
        rightElement={<ScreenSwitcher currentScreenId={13} />}
      />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* 3 Stats Overview Card */}
        <View style={styles.statsCard}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{totalDonations}</Text>
            <Text style={styles.statLabel}>Donations</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statNumber, { color: colors.primary }]}>{livesSaved}</Text>
            <Text style={styles.statLabel}>Lives Saved</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{volumeLiters} L</Text>
            <Text style={styles.statLabel}>Volume</Text>
          </View>
        </View>

        {/* Timeline Records */}
        <Text style={styles.sectionTitle}>Recorded Donations ({donations.length})</Text>

        {donations.map((item, idx) => (
          <View key={item._id || idx} style={styles.donationCard}>
            <View style={styles.cardHeader}>
              <View style={styles.hospitalIcon}>
                <Ionicons name="business" size={18} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.hospitalName}>{item.hospital}</Text>
                <Text style={styles.refText}>
                  Ref: {item.reference} · {item.bloodGroup}
                </Text>
              </View>
              <View style={styles.statusBadge}>
                <Text style={styles.statusBadgeText}>COMPLETED</Text>
              </View>
            </View>

            <View style={styles.cardFooter}>
              <View style={styles.metaRow}>
                <Ionicons name="calendar-outline" size={14} color={colors.textMuted} style={{ marginRight: 4 }} />
                <Text style={styles.metaText}>
                  {new Date(item.completedAt).toLocaleDateString()}
                </Text>
                <Text style={styles.dot}>·</Text>
                <Text style={styles.metaText}>{item.unitsDonated || 1} Unit (450 ml)</Text>
              </View>

              <TouchableOpacity
                onPress={() => handleDownloadCertificate(item.reference)}
                style={styles.certBtn}
              >
                <Ionicons name="document-text-outline" size={14} color={colors.primary} style={{ marginRight: 4 }} />
                <Text style={styles.certBtnText}>Certificate</Text>
              </TouchableOpacity>
            </View>
          </View>
        ))}

        <AppButton
          title="View Impact Report & Badges"
          variant="outline"
          icon="ribbon-outline"
          onPress={() => router.push('/profile/badges')}
          style={{ marginTop: 10 }}
        />
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
  statsCard: {
    flexDirection: 'row',
    backgroundColor: colors.secondary,
    borderRadius: borderRadius.lg,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statNumber: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  statLabel: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 3,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 10,
  },
  donationCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: spacing.md,
    marginBottom: 10,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hospitalIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: '800',
    color: colors.text,
  },
  refText: {
    fontSize: 12,
    color: colors.textMuted,
    marginTop: 2,
  },
  statusBadge: {
    backgroundColor: '#D1FAE5',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: borderRadius.xs,
  },
  statusBadgeText: {
    color: '#059669',
    fontSize: 10,
    fontWeight: '800',
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metaText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  dot: {
    marginHorizontal: 6,
    color: colors.textMuted,
  },
  certBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
  },
  certBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
  },
});

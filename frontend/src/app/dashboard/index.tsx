import React, { useEffect, useState } from 'react';
import {
  Alert,
  Image,
  Modal,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { shadows } from '@/theme';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { useAuth } from '@/features/auth/context/AuthContext';
import { makePhoneCall } from '@/utils/phone';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface NearbyRequest {
  id: string;
  bloodGroup: string;
  hospital: string;
  units: number;
  distance: string;
  status: 'Urgent' | 'Open';
  contact: string;
  address: string;
  neededWithin: string;
}

const INITIAL_REQUESTS: NearbyRequest[] = [
  {
    id: 'req-1',
    bloodGroup: 'A+',
    hospital: 'Colombo National Hospital',
    units: 2,
    distance: '2.1 km away',
    status: 'Urgent',
    contact: '+94 11 269 1111',
    address: 'Regent Street, Colombo 08',
    neededWithin: 'Immediate (Within 2 hrs)',
  },
  {
    id: 'req-2',
    bloodGroup: 'B+',
    hospital: 'Lanka Hospitals',
    units: 1,
    distance: '4.8 km away',
    status: 'Open',
    contact: '+94 11 543 0000',
    address: '578 Elvitigala Mawatha, Colombo 05',
    neededWithin: 'Today before 6:00 PM',
  },
  {
    id: 'req-3',
    bloodGroup: 'O+',
    hospital: 'Asiri Central Hospital',
    units: 3,
    distance: '5.2 km away',
    status: 'Urgent',
    contact: '+94 11 466 5500',
    address: 'Norris Canal Road, Colombo 10',
    neededWithin: 'Within 4 hours',
  },
];

export default function DashboardScreen() {
  const router = useRouter();
  const { user, token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && token && token !== 'demo-jwt-token') {
      if (user?.role === 'admin') {
        router.replace('/admin' as any);
      } else if (user?.role === 'donor') {
        router.replace('/donor/dashboard' as any);
      }
    }
  }, [isLoading, token, user?.role, router]);
  const insets = useSafeAreaInsets();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedRequest, setSelectedRequest] = useState<NearbyRequest | null>(null);
  const [sosModalVisible, setSosModalVisible] = useState(false);
  const [serviceModal, setServiceModal] = useState<string | null>(null);

  // User initials
  const userName = user?.name || 'Kasun Perera';
  const initials = userName
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase() || 'KP';

  const userBloodGroup = user?.bloodGroup || 'O+';
  const isEligible = user?.isEligible ?? true;

  // Filter nearby requests based on search
  const filteredRequests = INITIAL_REQUESTS.filter((req) => {
    if (!searchQuery.trim()) return true;
    const query = searchQuery.toLowerCase();
    return (
      req.hospital.toLowerCase().includes(query) ||
      req.bloodGroup.toLowerCase().includes(query) ||
      req.status.toLowerCase().includes(query) ||
      req.address.toLowerCase().includes(query)
    );
  });

  const handleNotificationPress = () => {
    Alert.alert(
      'Notifications & Alerts',
      '• Urgent O+ blood requested at Colombo National Hospital (2 min ago)\n• You are eligible for your next donation!\n• 15 lives saved by donors in Colombo district today.',
      [
        { text: 'View Alerts Screen', onPress: () => router.push('/profile/emergency-contacts' as any) },
        { text: 'Close', style: 'cancel' },
      ],
    );
  };

  const handleEmergencyAccept = () => {
    setSosModalVisible(false);
    Alert.alert(
      'Blood Donation Response Confirmed',
      'Thank you! The Blood Bank at Colombo National Hospital has been notified of your response. Please head to Regent St, Colombo 08.',
      [
        {
          text: 'Call Blood Bank',
          onPress: () => makePhoneCall('+94112691111', 'Colombo National Hospital Blood Bank'),
        },
        { text: 'Done' },
      ],
    );
  };

  return (
    <SafeAreaView style={[styles.safeArea, Platform.OS === 'android' && { paddingTop: insets.top }]}>
      <View style={styles.container}>
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* TOP HEADER */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.userInfo}
              onPress={() => router.push('/profile' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.avatar}>
                {user?.avatarUrl ? (
                  <Image source={{ uri: user.avatarUrl }} style={styles.avatarImage} />
                ) : (
                  <Text style={styles.avatarText}>{initials}</Text>
                )}
              </View>
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingText}>Good morning,</Text>
                <Text style={styles.userNameText}>{userName}</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.headerActions}>
              <ScreenSwitcher currentScreenId={16} />
              <TouchableOpacity
                style={styles.notificationBtn}
                onPress={handleNotificationPress}
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={20} color="#1E293B" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
            </View>
          </View>

          {/* SEARCH BAR */}
          <View style={styles.searchContainer}>
            <Ionicons name="search-outline" size={19} color="#94A3B8" style={styles.searchIcon} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search hospital, district or donor..."
              placeholderTextColor="#94A3B8"
              value={searchQuery}
              onChangeText={setSearchQuery}
              returnKeyType="search"
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color="#94A3B8" />
              </TouchableOpacity>
            )}
          </View>

          {/* EMERGENCY BLOOD REQUEST (SOS BANNER) */}
          <View style={styles.sosCard}>
            <View style={styles.sosHeader}>
              <View style={styles.sosLeftRow}>
                <View style={styles.sosBadge}>
                  <Text style={styles.sosBadgeText}>SOS</Text>
                </View>
                <Text style={styles.sosTitle}>Emergency Blood Request</Text>
              </View>
              <Text style={styles.sosTime}>2 min ago</Text>
            </View>

            <Text style={styles.sosDescription}>
              O+ blood is urgently required at Colombo National Hospital (2.1 km away)
            </Text>

            <TouchableOpacity
              style={styles.viewRequestBtn}
              onPress={() => setSosModalVisible(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.viewRequestText}>View Request</Text>
            </TouchableOpacity>
          </View>

          {/* QUICK STATS ROW: BLOOD GROUP & ELIGIBILITY */}
          <View style={styles.statsRow}>
            {/* Blood Group Card */}
            <TouchableOpacity
              style={styles.bloodGroupCard}
              onPress={() => router.push('/profile/donation-history' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.statHeading}>BLOOD GROUP</Text>
              <View style={styles.statContentRow}>
                <Ionicons name="water" size={20} color="#DC2626" style={{ marginRight: 6 }} />
                <Text style={styles.bloodGroupText}>{userBloodGroup}</Text>
              </View>
            </TouchableOpacity>

            {/* Eligibility Card */}
            <TouchableOpacity
              style={styles.eligibilityCard}
              onPress={() => router.push('/profile/eligibility' as any)}
              activeOpacity={0.8}
            >
              <Text style={styles.statHeading}>ELIGIBILITY</Text>
              <View style={styles.statContentRow}>
                <Ionicons
                  name={isEligible ? 'checkmark-circle' : 'alert-circle'}
                  size={20}
                  color={isEligible ? '#10B981' : '#F59E0B'}
                  style={{ marginRight: 6 }}
                />
                <Text style={[styles.eligibilityText, !isEligible && { color: '#F59E0B' }]}>
                  {isEligible ? 'Eligible' : 'Pending'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* SERVICES SECTION */}
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>SERVICES</Text>
          </View>

          <View style={styles.servicesRow}>
            {/* Find Blood Donor */}
            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => router.push('/find-donors')}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIconBox, { backgroundColor: '#FEE2E2' }]}>
                <Ionicons name="search" size={20} color="#EF4444" />
              </View>
              <Text style={styles.serviceLabel}>Find Blood{'\n'}Donor</Text>
            </TouchableOpacity>

            {/* New Blood Request */}
            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => setServiceModal('New Blood Request')}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIconBox, { backgroundColor: '#E0F2FE' }]}>
                <Ionicons name="water" size={20} color="#0284C7" />
              </View>
              <Text style={styles.serviceLabel}>New Blood{'\n'}Request</Text>
            </TouchableOpacity>

            {/* Blood Bank */}
            <TouchableOpacity
              style={styles.serviceCard}
              onPress={() => setServiceModal('Blood Bank Directory')}
              activeOpacity={0.7}
            >
              <View style={[styles.serviceIconBox, { backgroundColor: '#DCFCE7' }]}>
                <Ionicons name="business" size={20} color="#16A34A" />
              </View>
              <Text style={styles.serviceLabel}>Blood{'\n'}Bank</Text>
            </TouchableOpacity>
          </View>

          {/* NEARBY REQUESTS SECTION */}
          <View style={styles.nearbySectionHeader}>
            <Text style={styles.sectionTitle}>NEARBY REQUESTS</Text>
            <TouchableOpacity
              onPress={() => {
                Alert.alert(
                  'All Nearby Requests',
                  'Showing 3 urgent blood requests near Colombo region within 10 km radius.',
                );
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewAllText}>View all</Text>
            </TouchableOpacity>
          </View>

          {/* REQUESTS LIST CARD */}
          <View style={styles.requestsCard}>
            {filteredRequests.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Ionicons name="search-outline" size={32} color="#94A3B8" />
                <Text style={styles.emptyText}>{`No requests matching "${searchQuery}"`}</Text>
              </View>
            ) : (
              filteredRequests.map((item, index) => (
                <View key={item.id}>
                  <TouchableOpacity
                    style={styles.requestItem}
                    onPress={() => setSelectedRequest(item)}
                    activeOpacity={0.7}
                  >
                    {/* Blood Group Badge */}
                    <View style={styles.bloodTypeBadge}>
                      <Text style={styles.bloodTypeBadgeText}>{item.bloodGroup}</Text>
                    </View>

                    {/* Hospital & Distance info */}
                    <View style={styles.requestInfo}>
                      <Text style={styles.hospitalName} numberOfLines={1}>
                        {item.hospital}
                      </Text>
                      <Text style={styles.distanceText}>
                        {item.units} {item.units === 1 ? 'unit' : 'units'} • {item.distance}
                      </Text>
                    </View>

                    {/* Status Pill Badge */}
                    <View
                      style={[
                        styles.statusPill,
                        item.status === 'Urgent' ? styles.statusUrgent : styles.statusOpen,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusPillText,
                          item.status === 'Urgent'
                            ? styles.statusUrgentText
                            : styles.statusOpenText,
                        ]}
                      >
                        {item.status}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  {index < filteredRequests.length - 1 && <View style={styles.divider} />}
                </View>
              ))
            )}
          </View>

          <View style={{ height: 20 }} />
        </ScrollView>

        {/* BOTTOM NAVIGATION BAR */}
        <BottomNavBar activeTab="home" />

        {/* SOS VIEW REQUEST MODAL */}
        <Modal
          visible={sosModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setSosModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.sosBadge}>
                  <Text style={styles.sosBadgeText}>SOS</Text>
                </View>
                <Text style={styles.modalHeading}>Emergency Request</Text>
                <TouchableOpacity
                  onPress={() => setSosModalVisible(false)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Hospital:</Text>
                  <Text style={styles.detailValue}>Colombo National Hospital</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Blood Group:</Text>
                  <Text style={[styles.detailValue, { color: '#DC2626', fontWeight: '800' }]}>
                    O+ (2 Units)
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Distance:</Text>
                  <Text style={styles.detailValue}>2.1 km away (~7 mins)</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Urgency:</Text>
                  <Text style={[styles.detailValue, { color: '#DC2626' }]}>
                    Critical (Surgery at 11:30 AM)
                  </Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Verified by:</Text>
                  <Text style={styles.detailValue}>National Blood Transfusion Service</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={handleEmergencyAccept}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="heart" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.acceptBtnText}>I Can Donate Now</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.callHospitalBtn}
                    onPress={() => {
                      makePhoneCall('+94112691111', 'Colombo National Hospital Blood Bank');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.callHospitalText}>Call Hospital</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* SELECTED REQUEST DETAIL MODAL */}
        <Modal
          visible={selectedRequest !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setSelectedRequest(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <View style={styles.bloodTypeBadge}>
                  <Text style={styles.bloodTypeBadgeText}>{selectedRequest?.bloodGroup}</Text>
                </View>
                <Text style={styles.modalHeading}>{selectedRequest?.hospital}</Text>
                <TouchableOpacity
                  onPress={() => setSelectedRequest(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Units Needed:</Text>
                  <Text style={styles.detailValue}>{selectedRequest?.units} units</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Distance:</Text>
                  <Text style={styles.detailValue}>{selectedRequest?.distance}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Address:</Text>
                  <Text style={styles.detailValue}>{selectedRequest?.address}</Text>
                </View>
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Needed by:</Text>
                  <Text style={styles.detailValue}>{selectedRequest?.neededWithin}</Text>
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.acceptBtn}
                    onPress={() => {
                      setSelectedRequest(null);
                      Alert.alert(
                        'Donation Response Logged',
                        `You have offered to donate for ${selectedRequest?.hospital}. They will contact you shortly.`,
                      );
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.acceptBtnText}>Respond to Request</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.callHospitalBtn}
                    onPress={() => {
                      makePhoneCall(selectedRequest?.contact || '+94112691111', (selectedRequest?.hospital || 'Hospital') + ' Coordinator');
                    }}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="call-outline" size={18} color="#DC2626" style={{ marginRight: 6 }} />
                    <Text style={styles.callHospitalText}>Call Coordinator</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>

        {/* SERVICE INFO MODAL */}
        <Modal
          visible={serviceModal !== null}
          transparent
          animationType="fade"
          onRequestClose={() => setServiceModal(null)}
        >
          <View style={styles.modalBackdrop}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalHeading}>{serviceModal}</Text>
                <TouchableOpacity
                  onPress={() => setServiceModal(null)}
                  style={styles.modalCloseBtn}
                >
                  <Ionicons name="close" size={20} color="#64748B" />
                </TouchableOpacity>
              </View>

              <View style={styles.modalBody}>
                {serviceModal === 'New Blood Request' ? (
                  <>
                    <Text style={styles.serviceModalDesc}>
                      Need blood for a family member or patient? Create an emergency request to notify all verified donors within 15 km immediately.
                    </Text>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => {
                        setServiceModal(null);
                        Alert.alert('Emergency Request Form', 'Connecting with Member 2 Emergency Request pipeline.');
                      }}
                    >
                      <Text style={styles.acceptBtnText}>Create Emergency Request</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <>
                    <Text style={styles.serviceModalDesc}>
                      Find official NBTS blood banks, contact numbers, real-time operating hours and blood inventory stocks near you.
                    </Text>
                    <TouchableOpacity
                      style={styles.acceptBtn}
                      onPress={() => {
                        setServiceModal(null);
                        Alert.alert('Blood Banks', '1. NBTS Narahenpita\n2. Colombo South Teaching Hospital\n3. Sri Jayewardenepura General Hospital');
                      }}
                    >
                      <Text style={styles.acceptBtnText}>View Open Blood Banks</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? 24 : 0,
  },
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 20,
  },

  /* HEADER */
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  avatarImage: {
    width: 44,
    height: 44,
    borderRadius: 22,
  },
  greetingContainer: {
    justifyContent: 'center',
    flexShrink: 1,
  },
  greetingText: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '500',
  },
  userNameText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#111827',
    marginTop: 1,
    flexShrink: 1,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexShrink: 0,
  },
  notificationBtn: {
    width: 40,
    height: 40,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#DC2626',
  },

  /* SEARCH BAR */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 46,
    marginBottom: 18,
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    paddingVertical: 0,
  },

  /* SOS EMERGENCY CARD */
  sosCard: {
    backgroundColor: '#FFF5F5',
    borderWidth: 1.5,
    borderColor: '#F87171',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  sosLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sosBadge: {
    backgroundColor: '#DC2626',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginRight: 8,
  },
  sosBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sosTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#DC2626',
  },
  sosTime: {
    fontSize: 11,
    color: '#9CA3AF',
  },
  sosDescription: {
    fontSize: 12.5,
    lineHeight: 18,
    color: '#374151',
    marginBottom: 14,
  },
  viewRequestBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    borderRadius: 20,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewRequestText: {
    color: '#DC2626',
    fontSize: 12.5,
    fontWeight: '700',
  },

  /* QUICK STATS ROW */
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  bloodGroupCard: {
    flex: 1,
    backgroundColor: '#FFF1F2',
    borderWidth: 1,
    borderColor: '#FFE4E6',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  eligibilityCard: {
    flex: 1,
    backgroundColor: '#ECFDF5',
    borderWidth: 1,
    borderColor: '#D1FAE5',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  statHeading: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  statContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  bloodGroupText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
  },
  eligibilityText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#059669',
  },

  /* SERVICES SECTION */
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#374151',
    letterSpacing: 0.6,
  },
  servicesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 22,
  },
  serviceCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.sm,
  },
  serviceIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  serviceLabel: {
    fontSize: 11.5,
    fontWeight: '700',
    color: '#1F2937',
    textAlign: 'center',
    lineHeight: 15,
  },

  /* NEARBY REQUESTS SECTION */
  nearbySectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
  },
  requestsCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  requestItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  bloodTypeBadge: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#DC2626',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  bloodTypeBadgeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  requestInfo: {
    flex: 1,
    marginRight: 8,
  },
  hospitalName: {
    fontSize: 13.5,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 2,
  },
  distanceText: {
    fontSize: 11.5,
    color: '#6B7280',
  },
  statusPill: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusUrgent: {
    backgroundColor: '#FEE2E2',
  },
  statusUrgentText: {
    color: '#DC2626',
    fontSize: 11,
    fontWeight: '700',
  },
  statusOpen: {
    backgroundColor: '#DBEAFE',
  },
  statusOpenText: {
    color: '#2563EB',
    fontSize: 11,
    fontWeight: '700',
  },
  statusPillText: {},
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 8,
    fontSize: 12,
    color: '#6B7280',
  },

  /* MODALS */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalCard: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    ...shadows.lg,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalHeading: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
    color: '#111827',
    marginLeft: 10,
  },
  modalCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalBody: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 8,
  },
  detailLabel: {
    fontSize: 13,
    color: '#6B7280',
    fontWeight: '500',
  },
  detailValue: {
    fontSize: 13,
    color: '#111827',
    fontWeight: '700',
    maxWidth: '65%',
    textAlign: 'right',
  },
  modalActions: {
    marginTop: 12,
    gap: 8,
  },
  acceptBtn: {
    backgroundColor: '#DC2626',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  callHospitalBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#DC2626',
    height: 46,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  callHospitalText: {
    color: '#DC2626',
    fontSize: 14,
    fontWeight: '700',
  },
  serviceModalDesc: {
    fontSize: 13,
    lineHeight: 19,
    color: '#4B5563',
    marginBottom: 12,
  },
});

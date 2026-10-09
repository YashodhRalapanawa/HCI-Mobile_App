import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { requestApi } from '../services/requestApi';
import { RequestCard } from '../components/RequestCard';
import { DeliveryAssignedModal } from '../components/DeliveryAssignedModal';
import type { DeliveryAssignmentInfo, MyRequestSummaryItem, MyRequestsTab } from '../types';

export function MyRequestsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ preview?: string }>();
  const { token } = useAuth();

  const isDevPreviewActive = params.preview === 'delivery_assigned';

  const [activeTab, setActiveTab] = useState<MyRequestsTab>('active');
  const [requests, setRequests] = useState<MyRequestSummaryItem[]>([]);
  const [counts, setCounts] = useState<{ active: number; completed: number; rejected: number }>({
    active: 0,
    completed: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'unauthenticated' | 'network' | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState<MyRequestSummaryItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Member 2.4 Delivery Assignment Modal state
  const [deliveryModalVisible, setDeliveryModalVisible] = useState(false);
  const [selectedDeliveryRequest, setSelectedDeliveryRequest] = useState<MyRequestSummaryItem | null>(null);
  const [deliveryAssignmentData, setDeliveryAssignmentData] = useState<DeliveryAssignmentInfo | null>(null);
  const [deliveryHospitalName, setDeliveryHospitalName] = useState<string | undefined>(undefined);
  const [deliveryHospitalWard, setDeliveryHospitalWard] = useState<string | undefined>(undefined);
  const [deliveryLoading, setDeliveryLoading] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);

  // Sequence ref to prevent race conditions from rapid tab switching
  const requestSeqRef = useRef(0);

  const isRealSession = Boolean(
    token &&
    token !== 'demo-jwt-token' &&
    token !== 'dev-fallback-token' &&
    token.split('.').length === 3,
  );

  const fetchRequests = useCallback(
    async (
      targetTab: MyRequestsTab,
      targetPage: number = 1,
      isRefresh: boolean = false,
      isLoadMore: boolean = false,
    ) => {
      const currentSeq = ++requestSeqRef.current;

      if (!isRealSession || !token) {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
        setErrorType('unauthenticated');
        setErrorMessage('Please sign in to view your blood requests.');
        return;
      }

      if (isLoadMore) {
        setLoadingMore(true);
      } else if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setErrorMessage(null);
      setErrorType(null);

      try {
        const response = await requestApi.getMyRequests(token, targetTab, targetPage, 20);

        // Ignore stale response if user switched tabs in the meantime
        if (currentSeq !== requestSeqRef.current) {
          return;
        }

        setCounts(response.counts);
        setHasNextPage(response.pagination.hasNextPage);
        setPage(response.pagination.page);

        if (targetPage === 1) {
          setRequests(response.requests);
        } else {
          // Append and deduplicate items
          setRequests((prev) => {
            const existingIds = new Set(prev.map((r) => r.id));
            const newItems = response.requests.filter((r) => !existingIds.has(r.id));
            return [...prev, ...newItems];
          });
        }
      } catch (err: any) {
        if (currentSeq !== requestSeqRef.current) return;

        const status = err?.status;
        const msg = err?.message || 'Failed to load requests.';

        if (status === 401 || msg.includes('401') || msg.toLowerCase().includes('session') || msg.toLowerCase().includes('token')) {
          setErrorType('unauthenticated');
          setErrorMessage('Your session has expired. Please sign in to view your requests.');
        } else {
          setErrorType('network');
          setErrorMessage(msg);
        }
      } finally {
        if (currentSeq === requestSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
          setLoadingMore(false);
        }
      }
    },
    [isRealSession, token],
  );

  // Reload when screen gains focus (e.g. returning from creating a request)
  useFocusEffect(
    useCallback(() => {
      void fetchRequests(activeTab, 1, false, false);
    }, [activeTab, fetchRequests]),
  );

  const handleTabChange = (tab: MyRequestsTab) => {
    if (tab === activeTab) return;
    setActiveTab(tab);
    setRequests([]);
    setPage(1);
    setHasNextPage(false);
    void fetchRequests(tab, 1, false, false);
  };

  const handleRefresh = () => {
    void fetchRequests(activeTab, 1, true, false);
  };

  const handleLoadMore = () => {
    if (!loading && !loadingMore && hasNextPage) {
      void fetchRequests(activeTab, page + 1, false, true);
    }
  };

  const handlePressDetails = (item: MyRequestSummaryItem) => {
    router.push({
      pathname: `/requests/${item.id}/submitted`,
      params: { mode: 'details' },
    } as any);
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/dashboard');
    }
  };

  const handleNewRequest = () => {
    router.push('/requests/new');
  };

  const handlePressViewDelivery = useCallback(
    async (item: MyRequestSummaryItem) => {
      setSelectedDeliveryRequest(item);
      setDeliveryAssignmentData(null);
      setDeliveryHospitalName(item.hospitalName);
      setDeliveryHospitalWard(item.hospitalReferenceAndWard);
      setDeliveryError(null);
      setDeliveryModalVisible(true);

      if (!token) return;

      setDeliveryLoading(true);
      try {
        const res = await requestApi.getDeliveryAssignment(token, item.id);
        setDeliveryAssignmentData(res.deliveryAssignment);
        if (res.hospitalName) setDeliveryHospitalName(res.hospitalName);
        if (res.hospitalReferenceAndWard) setDeliveryHospitalWard(res.hospitalReferenceAndWard);
      } catch (err: any) {
        setDeliveryError(err?.message || 'Failed to load delivery assignment details.');
      } finally {
        setDeliveryLoading(false);
      }
    },
    [token],
  );

  const handleCloseDeliveryModal = useCallback(() => {
    setDeliveryModalVisible(false);
    setSelectedDeliveryRequest(null);
    setDeliveryAssignmentData(null);
    setDeliveryError(null);
    if (isDevPreviewActive) {
      router.replace('/requests/my');
    }
  }, [isDevPreviewActive, router]);

  const handlePressViewContactFromModal = useCallback(() => {
    if (isDevPreviewActive) {
      setDeliveryModalVisible(false);
      router.push('/requests/preview/delivery' as any);
      return;
    }

    if (selectedDeliveryRequest?.id) {
      const targetId = selectedDeliveryRequest.id;
      setDeliveryModalVisible(false);
      router.push(`/requests/${targetId}/delivery` as any);
    }
  }, [isDevPreviewActive, router, selectedDeliveryRequest]);

  const handlePressEdit = (item: MyRequestSummaryItem) => {
    router.push(`/requests/${item.id}/edit` as any);
  };

  const handlePressDelete = (item: MyRequestSummaryItem) => {
    if (isDeleting) return;
    setDeleteError(null);
    setRequestToDelete(item);
  };

  const handleCancelDelete = () => {
    if (isDeleting) return;
    setRequestToDelete(null);
  };

  const handleConfirmDelete = async () => {
    if (!requestToDelete || !token || isDeleting) return;

    const target = requestToDelete;
    setIsDeleting(true);
    setDeletingId(target.id);
    setDeleteError(null);

    try {
      await requestApi.deleteRequest(token, target.id);

      // 1. If latest_submitted_request_id points to the deleted request, clear that reference
      try {
        const storedLatestId = await AsyncStorage.getItem('latest_submitted_request_id');
        if (storedLatestId === target.id) {
          await AsyncStorage.removeItem('latest_submitted_request_id');
        }
      } catch {
        // storage cleanup failure is non-fatal
      }

      // 2. Close confirmation modal
      setRequestToDelete(null);

      // 3. Immediately remove from local list for snappy UX
      setRequests((prev) => prev.filter((r) => r.id !== target.id));
      if (activeTab === 'active') {
        setCounts((prev) => ({
          ...prev,
          active: Math.max(0, prev.active - 1),
        }));
      }

      // 4. Refresh authoritative Active/Completed counts and pagination from server
      await fetchRequests(activeTab, 1, false, false);
    } catch (err: any) {
      const status = err?.status;
      const msg = err?.message || 'Failed to delete blood request.';

      setRequestToDelete(null);

      if (
        status === 401 ||
        msg.includes('401') ||
        msg.toLowerCase().includes('session') ||
        msg.toLowerCase().includes('token')
      ) {
        setErrorType('unauthenticated');
        setErrorMessage('Your session has expired. Please sign in to manage your requests.');
      } else if (
        status === 409 ||
        msg.toLowerCase().includes('conflict') ||
        msg.toLowerCase().includes('processed') ||
        msg.toLowerCase().includes('no longer')
      ) {
        // Status conflict: show clear error and refresh list so Edit/Delete availability reflects server state
        setDeleteError(msg);
        await fetchRequests(activeTab, 1, false, false);
      } else {
        setDeleteError(msg);
      }
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Top Bar: Back Action, Title, Dev Screen Switcher */}
      <View style={styles.topBar}>
        <View style={styles.titleWithBack}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color="#0F172A" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>My requests</Text>
        </View>

        {__DEV__ && (
          <View style={styles.devSwitcherWrapper}>
            <ScreenSwitcher currentScreenId={isDevPreviewActive ? 22 : 21} />
          </View>
        )}
      </View>

      {/* Supporting Subtitle */}
      <Text style={styles.headerSubtitle}>
        Track your blood requests, hospital verification status, and donor responses.
      </Text>

      {/* Visible Deletion Error Alert */}
      {deleteError && (
        <View style={styles.deleteErrorAlert} accessible={true} accessibilityRole="alert">
          <View style={styles.deleteErrorContent}>
            <Ionicons name="alert-circle" size={18} color="#DC2626" style={{ marginRight: 8, marginTop: 1 }} />
            <Text style={styles.deleteErrorText}>{deleteError}</Text>
          </View>
          <TouchableOpacity
            onPress={() => setDeleteError(null)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel="Dismiss error"
          >
            <Ionicons name="close" size={18} color="#DC2626" />
          </TouchableOpacity>
        </View>
      )}

      {/* Active and Completed Tabs */}
      <View style={styles.tabContainer} accessibilityRole="tablist">
        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'active' && styles.tabButtonActive]}
          onPress={() => handleTabChange('active')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'active' }}
          accessibilityLabel={`Active requests, ${counts.active} items`}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'active' && styles.tabButtonTextActive]}
          >
            Active ({counts.active})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'completed' && styles.tabButtonActive]}
          onPress={() => handleTabChange('completed')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'completed' }}
          accessibilityLabel={`Completed requests, ${counts.completed} items`}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'completed' && styles.tabButtonTextActive]}
          >
            Completed ({counts.completed})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === 'rejected' && styles.tabButtonActive]}
          onPress={() => handleTabChange('rejected')}
          activeOpacity={0.8}
          accessibilityRole="tab"
          accessibilityState={{ selected: activeTab === 'rejected' }}
          accessibilityLabel={`Rejected requests, ${counts.rejected} items`}
        >
          <Text
            style={[styles.tabButtonText, activeTab === 'rejected' && styles.tabButtonTextActive]}
          >
            Rejected ({counts.rejected})
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyState = () => {
    if (loading) return null;

    if (errorType === 'unauthenticated') {
      return (
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="lock-closed" size={32} color={colors.primary} />
          </View>
          <Text style={styles.emptyTitle}>Sign In Required</Text>
          <Text style={styles.emptyBody}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={() =>
              router.push({
                pathname: '/(auth)/login',
                params: { returnTo: '/requests/my' },
              })
            }
            activeOpacity={0.85}
          >
            <Ionicons name="log-in-outline" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Sign In to Account</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (errorMessage) {
      return (
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIconCircle, { backgroundColor: '#FEF3C7' }]}>
            <Ionicons name="alert-circle" size={32} color="#D97706" />
          </View>
          <Text style={styles.emptyTitle}>Unable to Load Requests</Text>
          <Text style={styles.emptyBody}>{errorMessage}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void fetchRequests(activeTab, 1, false, false)}
            activeOpacity={0.85}
          >
            <Ionicons name="refresh" size={16} color="#FFFFFF" />
            <Text style={styles.retryBtnText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'active') {
      return (
        <View style={styles.emptyCard}>
          <View style={styles.emptyIconCircle}>
            <Ionicons name="file-tray-outline" size={32} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>No active blood requests</Text>
          <Text style={styles.emptyBody}>
            When you create a blood request, it will appear here for you to track hospital verification and donor responses.
          </Text>
          <TouchableOpacity
            style={styles.primaryActionBtn}
            onPress={handleNewRequest}
            activeOpacity={0.85}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
            <Text style={styles.primaryActionBtnText}>Create New Request</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (activeTab === 'rejected') {
      return (
        <View style={styles.emptyCard}>
          <View style={[styles.emptyIconCircle, { backgroundColor: '#FEE2E2' }]}>
            <Ionicons name="close-circle-outline" size={32} color="#DC2626" />
          </View>
          <Text style={styles.emptyTitle}>No rejected requests</Text>
          <Text style={styles.emptyBody}>
            Requests that could not be approved during hospital review will appear here with the reviewer feedback.
          </Text>
        </View>
      );
    }

    return (
      <View style={styles.emptyCard}>
        <View style={styles.emptyIconCircle}>
          <Ionicons name="checkmark-done-circle-outline" size={32} color="#94A3B8" />
        </View>
        <Text style={styles.emptyTitle}>No completed requests</Text>
        <Text style={styles.emptyBody}>
          Requests marked as fulfilled by the hospital will be archived here for your records.
        </Text>
      </View>
    );
  };

  const renderFooter = () => {
    return (
      <View>
        {loadingMore && (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.footerLoaderText}>Loading more requests...</Text>
          </View>
        )}

        {hasNextPage && !loading && (
          <TouchableOpacity
            style={styles.loadMoreBtn}
            onPress={handleLoadMore}
            activeOpacity={0.7}
          >
            <Text style={styles.loadMoreBtnText}>Load more requests</Text>
            <Ionicons name="arrow-down" size={14} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Reserved space so floating NEW REQUEST button never covers final card actions */}
        <View style={styles.bottomListSpacer} />
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
      <FlatList
        data={requests}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <RequestCard
            item={item}
            onPressDetails={handlePressDetails}
            onPressEdit={handlePressEdit}
            onPressDelete={handlePressDelete}
            onPressViewDelivery={handlePressViewDelivery}
            isDeleting={isDeleting && deletingId === item.id}
          />
        )}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={
          loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.loadingText}>Loading requests...</Text>
            </View>
          ) : (
            renderEmptyState()
          )
        }
        ListFooterComponent={renderFooter}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />

      {/* Floating / Bottom "NEW REQUEST" Action */}
      <View style={styles.bottomBarContainer} pointerEvents="box-none">
        <TouchableOpacity
          style={styles.newRequestBtn}
          onPress={handleNewRequest}
          activeOpacity={0.88}
          accessibilityRole="button"
          accessibilityLabel="Create a new blood request"
        >
          <Ionicons name="add" size={20} color="#FFFFFF" style={{ marginRight: 6 }} />
          <Text style={styles.newRequestBtnText}>NEW REQUEST</Text>
        </TouchableOpacity>
      </View>

      {/* Accessible Cross-Platform Delete Confirmation Dialog */}
      <Modal
        visible={Boolean(requestToDelete)}
        transparent={true}
        animationType="fade"
        onRequestClose={handleCancelDelete}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard} accessible={true} accessibilityViewIsModal={true}>
            <View style={styles.modalHeaderIcon}>
              <Ionicons name="trash-outline" size={28} color="#DC2626" />
            </View>
            <Text style={styles.modalTitle}>Delete blood request?</Text>
            <Text style={styles.modalBody}>
              This blood request for {requestToDelete?.bloodGroup} ({requestToDelete?.unitsRequired}{' '}
              {requestToDelete?.unitsRequired === 1 ? 'unit' : 'units'}) at{' '}
              {requestToDelete?.hospitalName} will be permanently removed. This action cannot be undone.
            </Text>

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={handleCancelDelete}
                disabled={isDeleting}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Cancel deletion"
              >
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalDeleteBtn, isDeleting && styles.modalDeleteBtnDisabled]}
                onPress={handleConfirmDelete}
                disabled={isDeleting}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel="Delete request"
              >
                {isDeleting ? (
                  <>
                    <ActivityIndicator size="small" color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalDeleteBtnText}>Deleting...</Text>
                  </>
                ) : (
                  <>
                    <Ionicons name="trash" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
                    <Text style={styles.modalDeleteBtnText}>Delete request</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Member 2.4 Delivery Person Assigned Modal */}
      <DeliveryAssignedModal
        visible={deliveryModalVisible || isDevPreviewActive}
        onClose={handleCloseDeliveryModal}
        isDevPreview={isDevPreviewActive}
        requestId={isDevPreviewActive ? 'BR-SAMPLE-024' : selectedDeliveryRequest?.id}
        patientName={isDevPreviewActive ? 'Nimal Perera' : selectedDeliveryRequest?.patientName}
        bloodGroup={isDevPreviewActive ? 'B-' : selectedDeliveryRequest?.bloodGroup}
        hospitalName={
          isDevPreviewActive
            ? 'National Blood Center / City Hospital'
            : deliveryHospitalName || selectedDeliveryRequest?.hospitalName
        }
        hospitalReferenceAndWard={
          isDevPreviewActive
            ? 'Ward 4B · Bed 12'
            : deliveryHospitalWard || selectedDeliveryRequest?.hospitalReferenceAndWard
        }
        deliveryPersonName={
          isDevPreviewActive
            ? 'Sunil Perera (Blood Bank Courier)'
            : deliveryAssignmentData?.deliveryPersonName
        }
        contactPhone={
          isDevPreviewActive
            ? '+94 77 123 4567'
            : deliveryAssignmentData?.contactPhone
        }
        assignedAt={
          isDevPreviewActive
            ? new Date().toISOString()
            : deliveryAssignmentData?.assignedAt
        }
        loading={!isDevPreviewActive && deliveryLoading}
        errorMessage={!isDevPreviewActive ? deliveryError : null}
        onRetry={
          selectedDeliveryRequest
            ? () => void handlePressViewDelivery(selectedDeliveryRequest)
            : undefined
        }
        onPressViewContact={handlePressViewContactFromModal}
      />

      {/* Shared Bottom Navigation Bar */}
      <BottomNavBar activeTab="home" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  headerContainer: {
    paddingBottom: spacing.sm,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  titleWithBack: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  screenTitle: {
    fontSize: 22,
    fontWeight: '800',
    color: '#0F172A',
    letterSpacing: -0.4,
  },
  devSwitcherWrapper: {
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 18,
    marginBottom: spacing.md,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
    padding: 3,
    marginBottom: spacing.md,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
  },
  tabButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
  },
  tabButtonTextActive: {
    color: '#0F172A',
    fontWeight: '800',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xs,
    paddingBottom: Platform.OS === 'web' ? 120 : 130,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: spacing.xl,
    alignItems: 'center',
    marginTop: spacing.md,
    gap: 8,
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyBody: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 12,
  },
  primaryActionBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 44,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  retryBtn: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.md,
    height: 40,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  retryBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  footerLoader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    gap: 8,
  },
  footerLoaderText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
  },
  loadMoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginVertical: 10,
    gap: 6,
  },
  loadMoreBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.primary,
  },
  bottomListSpacer: {
    height: 75,
  },
  bottomBarContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 74 : 70,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingVertical: 6,
    backgroundColor: 'transparent',
    alignItems: 'center',
  },
  newRequestBtn: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  newRequestBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: spacing.xl,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeaderIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.md,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalBody: {
    fontSize: 13,
    color: '#64748B',
    lineHeight: 19,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  modalCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalCancelBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#475569',
  },
  modalDeleteBtn: {
    flex: 1,
    height: 44,
    borderRadius: borderRadius.md,
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  modalDeleteBtnDisabled: {
    opacity: 0.65,
  },
  modalDeleteBtnText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  deleteErrorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: spacing.md,
  },
  deleteErrorContent: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 8,
  },
  deleteErrorText: {
    fontSize: 13,
    color: '#B91C1C',
    fontWeight: '600',
    flex: 1,
    lineHeight: 18,
  },
});

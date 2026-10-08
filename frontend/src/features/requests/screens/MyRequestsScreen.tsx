import React, { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { BottomNavBar } from '@/components/BottomNavBar';
import { ScreenSwitcher } from '@/components/ScreenSwitcherModal';
import { requestApi } from '../services/requestApi';
import { RequestCard } from '../components/RequestCard';
import type { MyRequestSummaryItem, MyRequestsTab } from '../types';

export function MyRequestsScreen() {
  const router = useRouter();
  const { token } = useAuth();

  const [activeTab, setActiveTab] = useState<MyRequestsTab>('active');
  const [requests, setRequests] = useState<MyRequestSummaryItem[]>([]);
  const [counts, setCounts] = useState<{ active: number; completed: number }>({ active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [errorType, setErrorType] = useState<'unauthenticated' | 'network' | null>(null);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);

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

  const handlePressEdit = (item: MyRequestSummaryItem) => {
    router.push(`/requests/${item.id}/edit` as any);
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
            <ScreenSwitcher currentScreenId={21} />
          </View>
        )}
      </View>

      {/* Supporting Subtitle */}
      <Text style={styles.headerSubtitle}>
        Track your blood requests, hospital verification status, and donor responses.
      </Text>

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
});

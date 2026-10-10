import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Linking,
  Modal,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Swipeable } from 'react-native-gesture-handler';
import { useFocusEffect } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AppHeader } from '@/components/AppHeader';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { donorService } from '../services/donorService';
import { exportNotificationsPdf } from '../utils/pdf';
import { makePhoneCall } from '@/utils/phone';
import type { AlertType, NotificationItem } from '../types';

type Filter = 'all' | 'unread' | AlertType;
type Preferences = Record<AlertType, boolean>;

const preferenceKey = 'lifeline.notification-preferences';
const defaultPreferences: Preferences = {
  emergency: true,
  donor_request: true,
  request_submitted: true,
  call: true,
  accepted: true,
  declined: true,
  campaign: true,
  availability: true,
  message: true,
};
const filterLabels: Record<Filter, string> = {
  all: 'All',
  unread: 'Unread',
  emergency: 'Emergency',
  donor_request: 'Requests',
  request_submitted: 'Submitted requests',
  call: 'Calls',
  accepted: 'Updates',
  declined: 'Declined',
  campaign: 'Campaigns',
  availability: 'Donor availability',
  message: 'Messages',
};

function notificationIcon(type: AlertType): keyof typeof Ionicons.glyphMap {
  if (type === 'emergency') return 'alert-circle';
  if (type === 'request_submitted') return 'checkmark-done-circle';
  if (type === 'call') return 'call';
  if (type === 'accepted') return 'checkmark-circle';
  if (type === 'declined') return 'close-circle';
  if (type === 'campaign') return 'calendar';
  if (type === 'message') return 'chatbubble';
  if (type === 'availability') return 'notifications';
  return 'person-add';
}

function extractPhone(text: string): string | null {
  const match = text.match(/(?:\+?\d[\d\s-]{8,}\d)/);
  return match?.[0]?.trim() ?? null;
}

export default function NotificationsScreen() {
  const { token } = useAuth();
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<Filter>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [selected, setSelected] = useState<NotificationItem | null>(null);
  const [preferencesVisible, setPreferencesVisible] = useState(false);
  const [preferences, setPreferences] = useState<Preferences>(defaultPreferences);

  const load = useCallback(async () => {
    const stored = await AsyncStorage.getItem(preferenceKey);
    if (stored) setPreferences({ ...defaultPreferences, ...JSON.parse(stored) });
    setItems(await donorService.listNotifications(token));
  }, [token]);

  useEffect(() => {
    const loadNotifications = async () => {
      await load();
    };
    void loadNotifications();
    const refreshTimer = setInterval(() => {
      void load();
    }, 10000);
    return () => clearInterval(refreshTimer);
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const refresh = async () => {
    setRefreshing(true);
    try {
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const patch = (id: string, action: () => Promise<void>) => {
    void action()
      .then(() => setItems((old) => old.map((item) => item._id === id ? { ...item, read: true } : item)))
      .catch(() => Alert.alert('Action failed', 'Please try again.'));
  };

  const visibleItems = useMemo(() => items.filter((item) => {
    if (!preferences[item.type]) return false;
    if (filter === 'unread') return !item.read;
    return filter === 'all' || item.type === filter;
  }), [filter, items, preferences]);
  const unreadCount = items.filter((item) => !item.read).length;

  const remove = (id: string) => {
    void donorService.deleteNotification(token, id)
      .then(() => setItems((old) => old.filter((item) => item._id !== id)))
      .catch(() => Alert.alert('Delete failed', 'Notification could not be deleted.'));
  };

  const respond = (item: NotificationItem, response: 'accepted' | 'declined') => {
    patch(item._id, () => donorService.respond(token, item._id, response));
    setSelected(null);
  };

  const savePreference = (type: AlertType) => {
    const next = { ...preferences, [type]: !preferences[type] };
    setPreferences(next);
    void AsyncStorage.setItem(preferenceKey, JSON.stringify(next));
  };

  const openMap = (item: NotificationItem) => {
    const query = encodeURIComponent(`${item.title} ${item.details}`);
    void Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
  };

  const renderActions = (item: NotificationItem, side: 'left' | 'right') => {
    if (side === 'right') {
      return <View style={styles.swipeDelete}><Ionicons name="trash-outline" size={22} color={colors.textInverted} /></View>;
    }
    if (item.type === 'donor_request') {
      return (
        <View style={styles.swipeActions}>
          <TouchableOpacity style={styles.swipeAccept} onPress={() => respond(item, 'accepted')}><Text style={styles.swipeText}>Accept</Text></TouchableOpacity>
          <TouchableOpacity style={styles.swipeDecline} onPress={() => respond(item, 'declined')}><Text style={styles.swipeText}>Decline</Text></TouchableOpacity>
        </View>
      );
    }
    return null;
  };

  return (
    <SafeAreaView style={styles.safe}>
      <AppHeader
        title="Notifications"
        rightElement={(
          <View style={styles.headerActions}>
            <TouchableOpacity onPress={() => setPreferencesVisible(true)} accessibilityLabel="Notification preferences">
              <Ionicons name="settings-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => { void exportNotificationsPdf(items); }} accessibilityLabel="Export notifications PDF">
              <Ionicons name="document-text-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        )}
      />
      <View style={styles.summaryCard}>
        <View style={styles.summaryIcon}>
          <Ionicons name={unreadCount ? 'notifications' : 'checkmark-done'} size={25} color={colors.primary} />
        </View>
        <View style={styles.summaryCopy}>
          <Text style={styles.summaryTitle}>{unreadCount ? 'Stay up to date' : 'You are all caught up'}</Text>
          <Text style={styles.summaryText}>{unreadCount ? `${unreadCount} notification${unreadCount === 1 ? '' : 's'} waiting for you` : 'No unread notifications right now'}</Text>
        </View>
        {unreadCount > 0 && (
          <TouchableOpacity
            style={styles.readAllButton}
            onPress={() => { void donorService.readAll(token).then(() => setItems((old) => old.map((item) => ({ ...item, read: true })))); }}
          >
            <Text style={styles.readAllText}>Read all</Text>
          </TouchableOpacity>
        )}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {(Object.keys(filterLabels) as Filter[]).map((key) => (
          <TouchableOpacity key={key} onPress={() => setFilter(key)} style={[styles.filter, filter === key && styles.filterActive]}>
            <Text style={[styles.filterText, filter === key && styles.filterTextActive]}>{filterLabels[key]}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { void refresh(); }} tintColor={colors.primary} />}
      >
        {visibleItems.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <Ionicons name="checkmark-circle-outline" size={54} color={colors.success} />
            </View>
            <Text style={styles.heading}>{items.length ? 'No matching notifications' : 'You\'re all caught up'}</Text>
            <Text style={styles.emptyText}>Pull down to refresh notifications.</Text>
          </View>
        ) : visibleItems.map((item) => (
          <Swipeable key={item._id} renderLeftActions={() => renderActions(item, 'left')} renderRightActions={() => renderActions(item, 'right')} onSwipeableOpen={(direction) => direction === 'right' && remove(item._id)}>
            <View style={[styles.card, !item.read && styles.unread]}>
              <TouchableOpacity style={styles.row} onPress={() => { setSelected(item); patch(item._id, () => donorService.readNotification(token, item._id)); }}>
                <View style={[styles.iconBubble, item.type === 'emergency' && styles.emergencyBubble]}>
                  <Ionicons name={notificationIcon(item.type)} size={22} color={item.type === 'emergency' ? colors.danger : colors.primary} />
                </View>
                <View style={styles.info}>
                  <View style={styles.titleLine}>
                    <Text style={styles.title} numberOfLines={1}>{item.title}</Text>
                    {!item.read && <View style={styles.unreadDot} />}
                  </View>
                  <Text style={styles.details} numberOfLines={2}>{item.details}</Text>
                  <Text style={styles.when}>{new Date(item.createdAt).toLocaleString()}</Text>
                </View>
                <TouchableOpacity style={styles.deleteButton} onPress={() => remove(item._id)} accessibilityLabel="Delete notification">
                  <Ionicons name="trash-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </TouchableOpacity>
              {item.type === 'donor_request' && (
                <View style={styles.response}>
                  <TouchableOpacity onPress={() => respond(item, 'accepted')}><Text style={styles.accept}>Accept</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => respond(item, 'declined')}><Text style={styles.decline}>Decline</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </Swipeable>
        ))}
      </ScrollView>

      <Modal visible={Boolean(selected)} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        {selected && (
          <View style={styles.modalOverlay}>
            <View style={styles.detailsModal}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Notification details</Text>
                <TouchableOpacity onPress={() => setSelected(null)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
              </View>
              <Ionicons name={notificationIcon(selected.type)} size={42} color={selected.type === 'emergency' ? colors.danger : colors.primary} />
              <Text style={styles.detailTitle}>{selected.title}</Text>
              <Text style={styles.detailBody}>{selected.details}</Text>
              <Text style={styles.when}>{new Date(selected.createdAt).toLocaleString()}</Text>
              {selected.type === 'emergency' && (
                <View style={styles.detailActions}>
                  <TouchableOpacity style={styles.actionButton} onPress={() => openMap(selected)}><Ionicons name="map-outline" size={18} color={colors.textInverted} /><Text style={styles.actionText}>Open map</Text></TouchableOpacity>
                  {extractPhone(`${selected.title} ${selected.details}`) && <TouchableOpacity style={styles.callButton} onPress={() => { void makePhoneCall(extractPhone(`${selected.title} ${selected.details}`)!, selected.title); }}><Ionicons name="call-outline" size={18} color={colors.primary} /><Text style={styles.callText}>Call</Text></TouchableOpacity>}
                </View>
              )}
              {selected.type === 'donor_request' && (
                <View style={styles.response}>
                  <TouchableOpacity onPress={() => respond(selected, 'accepted')}><Text style={styles.accept}>Accept request</Text></TouchableOpacity>
                  <TouchableOpacity onPress={() => respond(selected, 'declined')}><Text style={styles.decline}>Decline</Text></TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}
      </Modal>

      <Modal visible={preferencesVisible} animationType="slide" transparent onRequestClose={() => setPreferencesVisible(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.detailsModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Notification preferences</Text>
              <TouchableOpacity onPress={() => setPreferencesVisible(false)}><Ionicons name="close" size={24} color={colors.text} /></TouchableOpacity>
            </View>
            {(Object.keys(defaultPreferences) as AlertType[]).map((type) => (
              <TouchableOpacity key={type} style={styles.preferenceRow} onPress={() => savePreference(type)}>
                <Text style={styles.preferenceText}>{filterLabels[type]}</Text>
                <Ionicons name={preferences[type] ? 'toggle' : 'toggle-outline'} size={34} color={preferences[type] ? colors.primary : colors.textMuted} />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  summaryCard: { flexDirection: 'row', alignItems: 'center', margin: spacing.md, marginBottom: spacing.sm, padding: spacing.md, backgroundColor: colors.primaryTonal, borderRadius: borderRadius.lg, borderWidth: 1, borderColor: colors.primarySoft, ...shadows.sm },
  summaryIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.card },
  summaryCopy: { flex: 1, marginLeft: spacing.sm },
  summaryTitle: { color: colors.text, fontSize: 15, fontWeight: '800' },
  summaryText: { color: colors.textSecondary, fontSize: 12, marginTop: 3 },
  readAllButton: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs, borderRadius: borderRadius.full, backgroundColor: colors.card },
  readAllText: { color: colors.primary, fontSize: 12, fontWeight: '800' },
  filters: { paddingHorizontal: spacing.md, paddingVertical: spacing.sm, gap: spacing.sm, alignItems: 'center' },
  filter: { height: 40, justifyContent: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: borderRadius.full, paddingHorizontal: spacing.md, backgroundColor: colors.card },
  filterActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  filterText: { color: colors.textSecondary, fontSize: 12, fontWeight: '700' },
  filterTextActive: { color: colors.textInverted },
  content: { paddingHorizontal: spacing.md, paddingTop: spacing.xs, paddingBottom: spacing.xl, flexGrow: 1 },
  card: { backgroundColor: colors.card, borderRadius: borderRadius.lg, padding: spacing.md, marginBottom: spacing.sm, borderWidth: 1, borderColor: colors.borderLight, ...shadows.sm },
  unread: { borderColor: colors.primarySoft, backgroundColor: colors.card },
  row: { flexDirection: 'row', alignItems: 'center' },
  iconBubble: { width: 46, height: 46, borderRadius: 16, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primaryTonal },
  emergencyBubble: { backgroundColor: colors.dangerSoft },
  info: { flex: 1, minWidth: 0, marginLeft: spacing.sm },
  titleLine: { flexDirection: 'row', alignItems: 'center', paddingRight: spacing.xs },
  title: { color: colors.text, fontWeight: '800', flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: colors.primary, marginLeft: spacing.xs },
  details: { color: colors.textSecondary, marginTop: 5, lineHeight: 18 },
  when: { color: colors.textMuted, fontSize: 11, marginTop: 5 },
  deleteButton: { padding: spacing.xs, marginLeft: spacing.xs },
  response: { borderTopWidth: 1, borderTopColor: colors.borderLight, marginTop: spacing.md, paddingTop: spacing.sm, flexDirection: 'row', justifyContent: 'flex-end', gap: spacing.lg },
  accept: { color: colors.success, fontWeight: '800', padding: spacing.xs },
  decline: { color: colors.danger, fontWeight: '800', padding: spacing.xs },
  swipeActions: { flexDirection: 'row', marginBottom: spacing.sm, borderRadius: borderRadius.md, overflow: 'hidden' },
  swipeAccept: { width: 88, backgroundColor: colors.success, justifyContent: 'center', alignItems: 'center' },
  swipeDecline: { width: 88, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center' },
  swipeDelete: { width: 76, marginBottom: spacing.sm, backgroundColor: colors.danger, justifyContent: 'center', alignItems: 'center' },
  swipeText: { color: colors.textInverted, fontWeight: '800' },
  empty: { alignItems: 'center', justifyContent: 'center', flex: 1, paddingHorizontal: spacing.xl, gap: spacing.md },
  emptyIcon: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.successSoft },
  heading: { color: colors.text, fontWeight: '800', fontSize: 18 },
  emptyText: { color: colors.textMuted },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  detailsModal: { backgroundColor: colors.card, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: spacing.lg, minHeight: 260 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg },
  modalTitle: { fontSize: 18, fontWeight: '800', color: colors.text },
  detailTitle: { color: colors.text, fontSize: 20, fontWeight: '800', marginTop: spacing.md },
  detailBody: { color: colors.textSecondary, lineHeight: 21, marginTop: spacing.sm },
  detailActions: { flexDirection: 'row', gap: spacing.sm, marginTop: spacing.lg },
  actionButton: { flex: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.sm },
  actionText: { color: colors.textInverted, fontWeight: '800' },
  callButton: { flex: 1, flexDirection: 'row', gap: spacing.xs, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: colors.primary, borderRadius: borderRadius.md, padding: spacing.sm },
  callText: { color: colors.primary, fontWeight: '800' },
  preferenceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.sm, borderBottomWidth: 1, borderBottomColor: colors.border },
  preferenceText: { color: colors.text, fontWeight: '700' },
});

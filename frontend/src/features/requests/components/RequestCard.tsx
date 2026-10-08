import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, borderRadius } from '@/theme';
import type { MyRequestSummaryItem, RequestStatus } from '../types';

interface RequestCardProps {
  item: MyRequestSummaryItem;
  onPressDetails: (item: MyRequestSummaryItem) => void;
  onPressEdit?: (item: MyRequestSummaryItem) => void;
  onPressDelete?: (item: MyRequestSummaryItem) => void;
  onPressViewDelivery?: (item: MyRequestSummaryItem) => void;
  isDeleting?: boolean;
}

interface StatusVisualConfig {
  label: string;
  supportingText: string;
  badgeBg: string;
  badgeTextColor: string;
  badgeBorderColor: string;
  iconName: keyof typeof Ionicons.glyphMap;
  actionText: string;
}

function getStatusConfig(status: RequestStatus, hasDeliveryAssignment?: boolean): StatusVisualConfig {
  switch (status) {
    case 'pending_verification':
      return {
        label: 'Awaiting verification',
        supportingText: 'Matching donors will be notified after hospital approval. Follow updates here.',
        badgeBg: '#FEF3C7',
        badgeTextColor: '#92400E',
        badgeBorderColor: '#FDE68A',
        iconName: 'time-outline',
        actionText: 'View request details',
      };
    case 'verified':
    case 'in_progress':
      if (hasDeliveryAssignment) {
        return {
          label: 'Delivery person assigned',
          supportingText: 'A hospital delivery person has been assigned to transfer blood units for this request.',
          badgeBg: '#DCFCE7',
          badgeTextColor: '#166534',
          badgeBorderColor: '#86EFAC',
          iconName: 'checkmark-circle-outline',
          actionText: 'View request details',
        };
      }
      return {
        label: 'Awaiting delivery assignment',
        supportingText: 'Hospital has verified this request. Awaiting blood bank delivery assignment.',
        badgeBg: '#FEF3C7',
        badgeTextColor: '#92400E',
        badgeBorderColor: '#FDE68A',
        iconName: 'time-outline',
        actionText: 'View request details',
      };
    case 'fulfilled':
      return {
        label: 'Fulfilled',
        supportingText: 'All requested blood units have been collected and delivered.',
        badgeBg: '#CCFBF1',
        badgeTextColor: '#0F766E',
        badgeBorderColor: '#99F6E4',
        iconName: 'checkmark-circle-outline',
        actionText: 'View request details',
      };
    case 'cancelled':
    default:
      return {
        label: 'Cancelled',
        supportingText: 'This request is no longer active.',
        badgeBg: '#F1F5F9',
        badgeTextColor: '#64748B',
        badgeBorderColor: '#CBD5E1',
        iconName: 'close-circle-outline',
        actionText: 'View request details',
      };
  }
}

export function RequestCard({
  item,
  onPressDetails,
  onPressEdit,
  onPressDelete,
  onPressViewDelivery,
  isDeleting = false,
}: RequestCardProps) {
  const [copied, setCopied] = useState(false);
  const statusConfig = getStatusConfig(item.status, item.hasDeliveryAssignment);
  const isPending = item.status === 'pending_verification';

  const handleCopyReference = async () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(item.id);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        // clipboard write error ignored
      }
    }
  };

  const unitsText = `${item.unitsRequired} ${item.unitsRequired === 1 ? 'unit' : 'units'} needed`;

  return (
    <View
      style={styles.card}
      accessible={true}
      accessibilityLabel={`Blood request for ${item.bloodGroup}, ${unitsText} at ${item.hospitalName}. Status: ${statusConfig.label}.`}
    >
      {/* Top Header Row: Blood Group Badge, Request ID, Status Badge */}
      <View style={styles.topRow}>
        <View style={styles.badgeAndIdGroup}>
          <View style={styles.bloodBadge}>
            <Text style={styles.bloodBadgeText}>{item.bloodGroup}</Text>
          </View>
          <View style={styles.referenceContainer}>
            <TouchableOpacity
              style={styles.copyableIdRow}
              onPress={handleCopyReference}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Request ID: ${item.id}. Double tap to copy.`}
            >
              <Text style={styles.referenceText} numberOfLines={1} ellipsizeMode="middle">
                {item.id}
              </Text>
              <Ionicons
                name={copied ? 'checkmark-done' : 'copy-outline'}
                size={13}
                color={copied ? '#16A34A' : '#94A3B8'}
                style={styles.copyIcon}
              />
            </TouchableOpacity>
            <Text style={styles.unitsText}>{unitsText}</Text>
          </View>
        </View>

        <View
          style={[
            styles.statusBadge,
            {
              backgroundColor: statusConfig.badgeBg,
              borderColor: statusConfig.badgeBorderColor,
            },
          ]}
        >
          <Ionicons
            name={statusConfig.iconName}
            size={12}
            color={statusConfig.badgeTextColor}
            style={{ marginRight: 4 }}
          />
          <Text style={[styles.statusBadgeText, { color: statusConfig.badgeTextColor }]}>
            {statusConfig.label}
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Hospital Location & Ward Details */}
      <View style={styles.hospitalRow}>
        <Ionicons name="location-outline" size={17} color="#DC2626" style={styles.hospitalIcon} />
        <View style={styles.hospitalTextCol}>
          <Text style={styles.hospitalName} numberOfLines={2}>
            {item.hospitalName}
          </Text>
          {item.hospitalReferenceAndWard ? (
            <Text style={styles.hospitalWardText} numberOfLines={1}>
              {item.hospitalReferenceAndWard}
            </Text>
          ) : null}
        </View>
      </View>

      {/* Supporting Guidance Text */}
      <View style={styles.supportingTextContainer}>
        <Text style={styles.supportingText}>{statusConfig.supportingText}</Text>
      </View>

      {/* Action Buttons: Pending requests have Edit, Delete, and Details */}
      {isPending ? (
        <View style={styles.actionRowWithPending}>
          <View style={styles.leftActions}>
            {onPressEdit ? (
              <TouchableOpacity
                style={[styles.editBtn, isDeleting && styles.disabledBtn]}
                onPress={() => onPressEdit(item)}
                disabled={isDeleting}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Edit request ${item.id}`}
              >
                <Ionicons name="pencil" size={13} color="#FFFFFF" style={{ marginRight: 5 }} />
                <Text style={styles.editBtnText}>Edit</Text>
              </TouchableOpacity>
            ) : null}

            {onPressDelete ? (
              <TouchableOpacity
                style={[styles.deleteBtn, isDeleting && styles.disabledBtn]}
                onPress={() => onPressDelete(item)}
                disabled={isDeleting}
                activeOpacity={0.8}
                accessibilityRole="button"
                accessibilityLabel={`Delete request ${item.id}`}
              >
                <Ionicons name="trash-outline" size={13} color="#DC2626" style={{ marginRight: 5 }} />
                <Text style={styles.deleteBtnText}>{isDeleting ? 'Deleting...' : 'Delete'}</Text>
              </TouchableOpacity>
            ) : null}
          </View>

          <TouchableOpacity
            style={[styles.actionBtn, isDeleting && styles.disabledBtn]}
            onPress={() => onPressDetails(item)}
            disabled={isDeleting}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${statusConfig.actionText} for request ${item.id}`}
          >
            <Text style={styles.actionBtnText}>Details</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : item.hasDeliveryAssignment ? (
        <View style={styles.actionRowWithAssigned}>
          {onPressViewDelivery ? (
            <TouchableOpacity
              style={styles.deliveryBtn}
              onPress={() => onPressViewDelivery(item)}
              activeOpacity={0.8}
              accessibilityRole="button"
              accessibilityLabel={`View delivery for request ${item.id}`}
            >
              <Ionicons name="bicycle" size={14} color="#FFFFFF" style={{ marginRight: 5 }} />
              <Text style={styles.deliveryBtnText}>VIEW DELIVERY</Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onPressDetails(item)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${statusConfig.actionText} for request ${item.id}`}
          >
            <Text style={styles.actionBtnText}>Details</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => onPressDetails(item)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel={`${statusConfig.actionText} for request ${item.id}`}
          >
            <Text style={styles.actionBtnText}>{statusConfig.actionText}</Text>
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#E2E8F0',
    padding: spacing.md,
    marginBottom: spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  badgeAndIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  bloodBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  bloodBadgeText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#DC2626',
    letterSpacing: -0.5,
  },
  referenceContainer: {
    flex: 1,
  },
  copyableIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignSelf: 'flex-start',
    maxWidth: '92%',
  },
  referenceText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    fontVariant: ['tabular-nums'],
    maxWidth: 130,
  },
  copyIcon: {
    marginLeft: 4,
  },
  unitsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
    marginTop: 4,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 10,
  },
  hospitalRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  hospitalIcon: {
    marginTop: 1,
    marginRight: 8,
  },
  hospitalTextCol: {
    flex: 1,
  },
  hospitalName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
    lineHeight: 18,
  },
  hospitalWardText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#64748B',
    marginTop: 2,
  },
  supportingTextContainer: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 10,
  },
  supportingText: {
    fontSize: 12,
    color: '#475569',
    lineHeight: 16,
  },
  actionRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 4,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
  },
  actionBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.primary,
    marginRight: 4,
  },
  actionRowWithBoth: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  actionRowWithAssigned: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  deliveryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16A34A',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: borderRadius.sm,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  deliveryBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  actionRowWithPending: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
    paddingTop: 4,
  },
  leftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2563EB',
    paddingVertical: 6,
    paddingHorizontal: 11,
    borderRadius: borderRadius.sm,
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  editBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  deleteBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
  },
  deleteBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#DC2626',
    letterSpacing: 0.2,
  },
  disabledBtn: {
    opacity: 0.45,
  },
});

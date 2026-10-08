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
  onPressViewDonor?: (item: MyRequestSummaryItem) => void;
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

function getStatusConfig(status: RequestStatus, acceptedDonorsCount?: number): StatusVisualConfig {
  if (acceptedDonorsCount && acceptedDonorsCount > 0) {
    const isSingle = acceptedDonorsCount === 1;
    return {
      label: isSingle ? '1 Donor Accepted' : `${acceptedDonorsCount} Donors Accepted`,
      supportingText: 'A donor has responded to this blood request. Tap below to view donor response details.',
      badgeBg: '#DCFCE7',
      badgeTextColor: '#166534',
      badgeBorderColor: '#86EFAC',
      iconName: 'checkmark-circle',
      actionText: 'VIEW DONOR',
    };
  }

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
      return {
        label: 'Hospital Verified',
        supportingText: 'Hospital has verified this request. Nearby eligible donors are being notified.',
        badgeBg: '#DCFCE7',
        badgeTextColor: '#166534',
        badgeBorderColor: '#86EFAC',
        iconName: 'shield-checkmark-outline',
        actionText: 'View request details',
      };
    case 'in_progress':
      return {
        label: 'Donation In Progress',
        supportingText: 'Blood donation is currently underway. Full donor tracking arrives in a later phase.',
        badgeBg: '#DBEAFE',
        badgeTextColor: '#1E40AF',
        badgeBorderColor: '#93C5FD',
        iconName: 'pulse-outline',
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

export function RequestCard({ item, onPressDetails, onPressViewDonor }: RequestCardProps) {
  const [copied, setCopied] = useState(false);
  const hasAcceptedDonors = Boolean(item.acceptedDonorsCount && item.acceptedDonorsCount > 0);
  const statusConfig = getStatusConfig(item.status, item.acceptedDonorsCount);

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

      {/* Contextual Action Button */}
      {hasAcceptedDonors && onPressViewDonor ? (
        <View style={styles.actionRowWithBoth}>
          <TouchableOpacity
            style={styles.viewDonorBtn}
            onPress={() => onPressViewDonor(item)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`VIEW DONOR for request ${item.id}`}
          >
            <Ionicons name="person-circle-outline" size={16} color="#FFFFFF" style={{ marginRight: 5 }} />
            <Text style={styles.viewDonorBtnText}>VIEW DONOR</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryDetailsBtn}
            onPress={() => onPressDetails(item)}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`View request details for ${item.id}`}
          >
            <Text style={styles.secondaryDetailsBtnText}>Details</Text>
            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
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
  viewDonorBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DC2626',
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: borderRadius.sm,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 2,
  },
  viewDonorBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.4,
  },
  secondaryDetailsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: borderRadius.sm,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  secondaryDetailsBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569',
    marginRight: 2,
  },
});

import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams } from 'expo-router';
import { colors, spacing, borderRadius, shadows } from '@/theme';
import { useAuth } from '@/features/auth/context/AuthContext';
import { adminApi } from '../services/adminApi';
import type { AdminReportData, AdminRequestLifecycleStatus } from '../types';

/**
 * Computes the start and end of the current calendar month in Asia/Colombo.
 */
function getColomboCurrentMonthRange(): { from: string; to: string } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.format(now).split('-');
    const year = Number(parts[0]);
    const month = Number(parts[1]);
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const mm = String(month).padStart(2, '0');
    return {
      from: `${year}-${mm}-01`,
      to: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    };
  } catch {
    return { from: '2026-10-01', to: '2026-10-31' };
  }
}

/**
 * Computes the previous calendar month range in Asia/Colombo.
 */
function getColomboPreviousMonthRange(): { from: string; to: string } {
  try {
    const now = new Date();
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.format(now).split('-');
    let year = Number(parts[0]);
    let month = Number(parts[1]) - 1;
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    const mm = String(month).padStart(2, '0');
    return {
      from: `${year}-${mm}-01`,
      to: `${year}-${mm}-${String(daysInMonth).padStart(2, '0')}`,
    };
  } catch {
    return { from: '2026-09-01', to: '2026-09-30' };
  }
}

/**
 * Computes the past 30 days range in Asia/Colombo.
 */
function getColomboPast30DaysRange(): { from: string; to: string } {
  try {
    const now = new Date();
    const past = new Date(now.getTime() - 29 * 24 * 60 * 60 * 1000);
    const formatter = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Colombo',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    return {
      from: formatter.format(past),
      to: formatter.format(now),
    };
  } catch {
    return { from: '2026-09-10', to: '2026-10-09' };
  }
}

function isValidDatePattern(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [yStr, mStr, dStr] = dateStr.split('-');
  const y = Number(yStr);
  const m = Number(mStr);
  const d = Number(dStr);
  if (y < 2000 || y > 2100) return false;
  if (m < 1 || m > 12) return false;
  const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();
  return d >= 1 && d <= daysInMonth;
}

const LIFECYCLE_STATUS_LABELS: Record<AdminRequestLifecycleStatus, { label: string; color: string; bg: string }> = {
  pending_verification: { label: 'Pending Verification', color: colors.warning, bg: colors.warningSoft },
  verified: { label: 'Verified', color: colors.info, bg: colors.infoSoft },
  in_progress: { label: 'In Progress', color: colors.primary, bg: colors.primarySoft },
  fulfilled: { label: 'Fulfilled', color: colors.success, bg: colors.successSoft },
  cancelled: { label: 'Cancelled', color: colors.secondaryMuted, bg: colors.borderLight },
  rejected: { label: 'Rejected', color: colors.danger, bg: colors.dangerSoft },
};

export function AdminReportsScreen(): React.JSX.Element {
  const { token } = useAuth();
  const params = useLocalSearchParams<{ preview?: string }>();
  const isPreview = Boolean(__DEV__ && params.preview === '1');
  const { width } = useWindowDimensions();
  const isDesktop = width >= 900;
  const isTablet = width >= 600;

  // Initial date controls default to the current calendar month in Asia/Colombo
  const defaultRange = getColomboCurrentMonthRange();
  const [inputFrom, setInputFrom] = useState(defaultRange.from);
  const [inputTo, setInputTo] = useState(defaultRange.to);

  // Active generated report snapshot
  const [report, setReport] = useState<AdminReportData | null>(null);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [downloadSuccessMessage, setDownloadSuccessMessage] = useState<string | null>(null);

  // Validation function
  const validateDates = useCallback((from: string, to: string): string | null => {
    if (!from.trim()) return "Please specify a 'From' date.";
    if (!to.trim()) return "Please specify a 'To' date.";
    if (!isValidDatePattern(from.trim())) {
      return "Invalid 'From' date. Please enter a valid date in YYYY-MM-DD format.";
    }
    if (!isValidDatePattern(to.trim())) {
      return "Invalid 'To' date. Please enter a valid date in YYYY-MM-DD format.";
    }
    if (from.trim() > to.trim()) {
      return "Reversed date range: 'From' date must be on or before 'To' date.";
    }
    return null;
  }, []);

  // Fetch report function
  const handleGenerateReport = useCallback(
    async (overrideFrom?: string, overrideTo?: string) => {
      const from = overrideFrom || inputFrom;
      const to = overrideTo || inputTo;

      const valError = validateDates(from, to);
      if (valError) {
        setValidationError(valError);
        return;
      }
      setValidationError(null);
      setErrorMessage(null);
      setDownloadSuccessMessage(null);
      setIsLoading(true);

      try {
        if (isPreview || token === 'demo-jwt-token') {
          // Preview fallback simulation
          setTimeout(() => {
            const mockReport: AdminReportData = {
              reportTitle: 'Blood Request & Donation Summary Report',
              appliedRange: {
                from,
                to,
                timezone: 'Asia/Colombo (UTC+05:30)',
                startUtcIso: `${from}T00:00:00.000+05:30`,
                endExclusiveUtcIso: `${to}T23:59:59.999+05:30`,
              },
              generatedAt: new Date().toISOString(),
              generatedAtColombo: '09 Oct 2026, 02:45:00 PM',
              metrics: {
                patientRequests: {
                  totalCreated: 14,
                  statusBreakdown: {
                    pending_verification: 3,
                    verified: 4,
                    in_progress: 3,
                    fulfilled: 2,
                    cancelled: 1,
                    rejected: 1,
                  },
                  byHospital: [
                    {
                      hospitalId: 'hosp-cnh-colombo',
                      hospitalName: 'Colombo National Hospital Blood Bank',
                      count: 6,
                      unitsRequired: 14,
                    },
                    {
                      hospitalId: 'hosp-nbts-narahenpita',
                      hospitalName: 'National Blood Transfusion Service, Narahenpita',
                      count: 4,
                      unitsRequired: 8,
                    },
                    {
                      hospitalId: 'hosp-kandy-gen',
                      hospitalName: 'Kandy National Hospital',
                      count: 3,
                      unitsRequired: 6,
                    },
                    {
                      hospitalId: 'hosp-karapitiya-galle',
                      hospitalName: 'Karapitiya Teaching Hospital, Galle',
                      count: 1,
                      unitsRequired: 2,
                    },
                  ],
                  byBloodGroup: {
                    'A+': { count: 3, unitsRequired: 6 },
                    'A-': { count: 1, unitsRequired: 2 },
                    'B+': { count: 4, unitsRequired: 9 },
                    'B-': { count: 1, unitsRequired: 2 },
                    'AB+': { count: 2, unitsRequired: 4 },
                    'AB-': { count: 0, unitsRequired: 0 },
                    'O+': { count: 2, unitsRequired: 5 },
                    'O-': { count: 1, unitsRequired: 2 },
                  },
                },
                deliveryArrivals: {
                  confirmedCount: 5,
                },
                donationInvitations: {
                  createdCount: 8,
                  publishedCount: 11,
                  createdStatusBreakdown: {
                    draft: 2,
                    published: 4,
                    closed: 2,
                  },
                },
                donorWillingness: {
                  acceptedOffersCount: 18,
                  uniqueRespondingDonors: 12,
                },
                registeredAccounts: {
                  recipientAccountsCount: 28,
                  donorAccountsCount: 64,
                },
              },
              notes: {
                patientRequestsNote:
                  'Patient blood request metrics represent total request records created within the selected date interval, not unique individual patients. Statuses reflect the current saved lifecycle status at report generation time.',
                deliveryArrivalsNote:
                  'Delivery arrivals confirmed indicates courier arrival at the medical facility as recorded by the requester. This tracks courier physical arrival only and does not represent blood receipt, completed donation, transfusion, or clinical request fulfillment. Note: Only the latest delivery assignment is retained per request; reassignment history is not preserved.',
                donationInvitationsNote:
                  'Donation invitations created counts records drafted or published in the period. Published count tracks invitations officially opened to donors during the period, including those subsequently closed. Creation and publication counts may differ because invitations may be drafted in one period and published in another.',
                donorWillingnessNote:
                  'Donor willingness represents accepted responses recorded in the DonationResponse collection. These are expressions of willingness to donate in response to hospital invitations, not completed donations, clinical clearances, or scheduled appointments. Multiple offers from a single donor to different invitations are counted individually in total offers, while unique donors counts each individual donor once.',
                registeredAccountsNote:
                  'Current registered accounts — all dates. Reflects active platform user accounts as of report generation time, outside the selected date interval. Recipient accounts represent user accounts registered to request blood and do not necessarily correspond to unique medical patients.',
                generalDisclaimer:
                  'This report is generated strictly from active database records. Permanently deleted records cannot be included in historical totals. All metrics are aggregated and non-identifying to protect patient and donor privacy. No clinical outcomes or transfusion results are tracked or implied.',
              },
              signature: 'preview_mock_signed_snapshot',
            };
            setReport(mockReport);
            setIsLoading(false);
          }, 400);
          return;
        }

        const effectiveToken = token || '';
        const res = await adminApi.getReport(effectiveToken, { from, to });
        setReport(res.report);
      } catch (err: any) {
        setErrorMessage(err?.message || 'Failed to generate summary report. Please check your connection and retry.');
      } finally {
        setIsLoading(false);
      }
    },
    [inputFrom, inputTo, isPreview, token, validateDates],
  );

  // Auto-generate current month report on initial mount
  useEffect(() => {
    let active = true;
    const init = async () => {
      await Promise.resolve();
      if (!active) return;
      void handleGenerateReport(defaultRange.from, defaultRange.to);
    };
    void init();
    return () => {
      active = false;
    };
  }, [defaultRange.from, defaultRange.to, handleGenerateReport]);

  // Quick preset handler
  const handleApplyPreset = (preset: 'current' | 'previous' | 'past30') => {
    let range: { from: string; to: string };
    if (preset === 'current') range = getColomboCurrentMonthRange();
    else if (preset === 'previous') range = getColomboPreviousMonthRange();
    else range = getColomboPast30DaysRange();

    setInputFrom(range.from);
    setInputTo(range.to);
    setValidationError(null);
    void handleGenerateReport(range.from, range.to);
  };

  // Download PDF handler
  const handleDownloadPdf = async () => {
    if (!report || isDownloadingPdf || isLoading) return;

    setIsDownloadingPdf(true);
    setErrorMessage(null);
    setDownloadSuccessMessage(null);

    try {
      if (isPreview || token === 'demo-jwt-token') {
        setTimeout(() => {
          setIsDownloadingPdf(false);
          setDownloadSuccessMessage('Preview Mode: PDF generation verified successfully.');
        }, 600);
        return;
      }

      const effectiveToken = token || '';
      const { blob, filename } = await adminApi.downloadReportPdf(effectiveToken, report);

      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        const objectUrl = window.URL.createObjectURL(blob);
        const anchor = window.document.createElement('a');
        anchor.href = objectUrl;
        anchor.download = filename;
        window.document.body.appendChild(anchor);
        anchor.click();
        window.document.body.removeChild(anchor);

        setTimeout(() => {
          window.URL.revokeObjectURL(objectUrl);
        }, 1500);

        setDownloadSuccessMessage(`Report downloaded successfully: ${filename}`);
      } else {
        setDownloadSuccessMessage(`Report ready: ${filename}`);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Failed to download PDF report. Please try again.');
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Detect whether date inputs have been modified compared to the currently displayed report
  const isInputMismatch =
    report && (inputFrom.trim() !== report.appliedRange.from || inputTo.trim() !== report.appliedRange.to);

  // Check if zero data
  const isZeroData =
    report &&
    report.metrics.patientRequests.totalCreated === 0 &&
    report.metrics.deliveryArrivals.confirmedCount === 0 &&
    report.metrics.donationInvitations.createdCount === 0 &&
    report.metrics.donorWillingness.acceptedOffersCount === 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      {/* 1. Page Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.badgeRow}>
            <View style={styles.titleBadge}>
              <Ionicons name="document-text" size={14} color={colors.primary} />
              <Text style={styles.titleBadgeText}>Official Admin Portal</Text>
            </View>
            <View style={styles.timezoneBadge}>
              <Ionicons name="time-outline" size={12} color={colors.secondaryMuted} />
              <Text style={styles.timezoneBadgeText}>Asia/Colombo (UTC+05:30)</Text>
            </View>
          </View>
          <Text style={styles.headerTitle}>Reports & PDF Download</Text>
          <Text style={styles.headerSubtitle}>
            Generate authoritative, read-only system summaries and audit-ready PDF reports with precise Colombo date boundaries.
          </Text>
        </View>
      </View>

      {/* 2. Controls & Date Range Filter Card */}
      <View style={styles.filterCard}>
        <View style={styles.filterCardHeader}>
          <Text style={styles.filterCardTitle}>Report Period & Parameters</Text>
          <Text style={styles.filterCardDesc}>
            Dates represent inclusive calendar days in Sri Lanka Standard Time (Asia/Colombo).
          </Text>
        </View>

        {/* Quick presets */}
        <View style={styles.presetRow}>
          <Text style={styles.presetLabel}>Quick Presets:</Text>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => handleApplyPreset('current')}
            accessibilityRole="button"
          >
            <Ionicons name="calendar-outline" size={13} color={colors.secondaryLight} />
            <Text style={styles.presetChipText}>Current Month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => handleApplyPreset('previous')}
            accessibilityRole="button"
          >
            <Ionicons name="time-outline" size={13} color={colors.secondaryLight} />
            <Text style={styles.presetChipText}>Previous Month</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.presetChip}
            onPress={() => handleApplyPreset('past30')}
            accessibilityRole="button"
          >
            <Ionicons name="hourglass-outline" size={13} color={colors.secondaryLight} />
            <Text style={styles.presetChipText}>Past 30 Days</Text>
          </TouchableOpacity>
        </View>

        {/* Date Inputs & Action Buttons */}
        <View style={[styles.inputRow, isDesktop && styles.inputRowDesktop]}>
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>From Date (Inclusive)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar" size={16} color={colors.secondaryMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={inputFrom}
                onChangeText={(val) => {
                  setInputFrom(val);
                  setValidationError(null);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>To Date (Inclusive)</Text>
            <View style={styles.inputWrapper}>
              <Ionicons name="calendar" size={16} color={colors.secondaryMuted} style={styles.inputIcon} />
              <TextInput
                style={styles.textInput}
                value={inputTo}
                onChangeText={(val) => {
                  setInputTo(val);
                  setValidationError(null);
                }}
                placeholder="YYYY-MM-DD"
                placeholderTextColor={colors.textPlaceholder}
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionButtonGroup}>
            <TouchableOpacity
              style={[styles.generateButton, isLoading && styles.buttonDisabled]}
              onPress={() => handleGenerateReport()}
              disabled={isLoading}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Ionicons name="refresh" size={16} color="#FFFFFF" />
                  <Text style={styles.generateButtonText}>Generate Report</Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.downloadButton,
                (!report || isLoading || isDownloadingPdf) && styles.buttonDisabled,
              ]}
              onPress={handleDownloadPdf}
              disabled={!report || isLoading || isDownloadingPdf}
              activeOpacity={0.8}
              accessibilityRole="button"
            >
              {isDownloadingPdf ? (
                <ActivityIndicator size="small" color={colors.primary} />
              ) : (
                <>
                  <Ionicons name="download-outline" size={16} color={!report ? colors.textMuted : colors.primary} />
                  <Text style={[styles.downloadButtonText, !report && styles.downloadButtonTextDisabled]}>
                    Download PDF
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Validation error message */}
        {validationError && (
          <View style={styles.validationBanner}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={styles.validationText}>{validationError}</Text>
          </View>
        )}

        {/* Download success message */}
        {downloadSuccessMessage && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={16} color={colors.success} />
            <Text style={styles.successText}>{downloadSuccessMessage}</Text>
          </View>
        )}
      </View>

      {/* 3. Global Error Banner */}
      {errorMessage && (
        <View style={styles.errorBanner}>
          <Ionicons name="warning" size={20} color={colors.danger} />
          <View style={styles.errorBannerContent}>
            <Text style={styles.errorBannerTitle}>Report Generation Error</Text>
            <Text style={styles.errorBannerText}>{errorMessage}</Text>
          </View>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => handleGenerateReport()}
            activeOpacity={0.8}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* 4. Input Mismatch Warning Banner */}
      {isInputMismatch && (
        <View style={styles.mismatchBanner}>
          <Ionicons name="information-circle" size={18} color={colors.warning} />
          <View style={styles.mismatchBannerContent}>
            <Text style={styles.mismatchBannerTitle}>Dates Modified</Text>
            <Text style={styles.mismatchBannerText}>
              The report below represents the applied range {report.appliedRange.from} to {report.appliedRange.to}.
              Click &quot;Generate Report&quot; to apply your newly typed dates ({inputFrom} to {inputTo}).
            </Text>
          </View>
        </View>
      )}

      {/* 5. Loading State Skeleton / Spinner */}
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingTitle}>Analyzing database records...</Text>
          <Text style={styles.loadingSubtitle}>
            Aggregating patient blood requests, deliveries, invitations, and donor responses across Asia/Colombo boundaries.
          </Text>
        </View>
      )}

      {/* 6. Active Report View */}
      {!isLoading && report && (
        <View style={styles.reportContainer}>
          {/* Active Snapshot Metadata Header */}
          <View style={styles.snapshotHeaderCard}>
            <View style={styles.snapshotTopRow}>
              <View>
                <Text style={styles.snapshotTitle}>{report.reportTitle}</Text>
                <Text style={styles.snapshotSubtitle}>
                  Applied Period: <Text style={styles.boldText}>{report.appliedRange.from}</Text> to{' '}
                  <Text style={styles.boldText}>{report.appliedRange.to}</Text> ({report.appliedRange.timezone})
                </Text>
              </View>
              <View style={styles.snapshotMetaRight}>
                <Text style={styles.snapshotMetaLabel}>Generated at:</Text>
                <Text style={styles.snapshotMetaVal}>{report.generatedAtColombo}</Text>
              </View>
            </View>
          </View>

          {/* Zero-data notice */}
          {isZeroData && (
            <View style={styles.zeroDataCard}>
              <View style={styles.zeroDataIconWrap}>
                <Ionicons name="file-tray-outline" size={28} color={colors.secondaryMuted} />
              </View>
              <Text style={styles.zeroDataTitle}>No Operational Activity in this Period</Text>
              <Text style={styles.zeroDataDesc}>
                There were zero patient requests, confirmed arrivals, or donor willingness responses recorded between{' '}
                {report.appliedRange.from} and {report.appliedRange.to}. Current registered accounts — all dates remain displayed below.
              </Text>
            </View>
          )}

          {/* Executive KPI Summary Cards */}
          <View style={styles.kpiGrid}>
            {/* KPI 1: Patient Requests */}
            <View style={[styles.kpiCard, isTablet && styles.kpiCardTablet, isDesktop && styles.kpiCardDesktop]}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>PATIENT REQUESTS</Text>
                <Ionicons name="medkit" size={16} color={colors.primary} />
              </View>
              <Text style={styles.kpiValue}>{report.metrics.patientRequests.totalCreated}</Text>
              <Text style={styles.kpiSub}>Records created in period</Text>
            </View>

            {/* KPI 2: Delivery Arrivals */}
            <View style={[styles.kpiCard, isTablet && styles.kpiCardTablet, isDesktop && styles.kpiCardDesktop]}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>DELIVERY ARRIVALS</Text>
                <Ionicons name="bicycle" size={16} color={colors.info} />
              </View>
              <Text style={styles.kpiValue}>{report.metrics.deliveryArrivals.confirmedCount}</Text>
              <Text style={styles.kpiSub}>Courier arrival confirmed</Text>
            </View>

            {/* KPI 3: Donation Invitations */}
            <View style={[styles.kpiCard, isTablet && styles.kpiCardTablet, isDesktop && styles.kpiCardDesktop]}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>INVITATIONS</Text>
                <Ionicons name="megaphone" size={16} color={colors.warning} />
              </View>
              <Text style={styles.kpiValue}>
                {report.metrics.donationInvitations.createdCount} / {report.metrics.donationInvitations.publishedCount}
              </Text>
              <Text style={styles.kpiSub}>Created vs Published in period</Text>
            </View>

            {/* KPI 4: Donor Willingness */}
            <View style={[styles.kpiCard, isTablet && styles.kpiCardTablet, isDesktop && styles.kpiCardDesktop]}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>DONOR WILLINGNESS</Text>
                <Ionicons name="heart" size={16} color={colors.primary} />
              </View>
              <Text style={styles.kpiValue}>{report.metrics.donorWillingness.acceptedOffersCount}</Text>
              <Text style={styles.kpiSub}>
                {report.metrics.donorWillingness.uniqueRespondingDonors} unique responding donors
              </Text>
            </View>

            {/* KPI 5: Recipient Accounts (All Dates) */}
            <View style={[styles.kpiCard, isTablet && styles.kpiCardTablet, isDesktop && styles.kpiCardDesktop]}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>RECIPIENT ACCOUNTS</Text>
                <Ionicons name="people" size={16} color={colors.secondaryLight} />
              </View>
              <Text style={styles.kpiValue}>{report.metrics.registeredAccounts.recipientAccountsCount}</Text>
              <Text style={styles.kpiSub}>Current registered accounts — all dates</Text>
            </View>

            {/* KPI 6: Donor Accounts (All Dates) */}
            <View style={[styles.kpiCard, isTablet && styles.kpiCardTablet, isDesktop && styles.kpiCardDesktop]}>
              <View style={styles.kpiHeader}>
                <Text style={styles.kpiLabel}>DONOR ACCOUNTS</Text>
                <Ionicons name="water" size={16} color={colors.accent} />
              </View>
              <Text style={styles.kpiValue}>{report.metrics.registeredAccounts.donorAccountsCount}</Text>
              <Text style={styles.kpiSub}>Current registered accounts — all dates</Text>
            </View>
          </View>

          {/* Section A: Patient Blood Requests Breakdown */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="git-branch-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>A. Patient Blood Requests — Current Lifecycle Status Breakdown</Text>
            </View>
            <Text style={styles.sectionExplainer}>
              Total {report.metrics.patientRequests.totalCreated} request records created in selected period.
              Statuses reflect current saved lifecycle state at report generation time.
            </Text>

            {/* Status Breakdown Table */}
            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Current Lifecycle Status</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Count</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Share (%)</Text>
              </View>
              {(Object.keys(report.metrics.patientRequests.statusBreakdown) as AdminRequestLifecycleStatus[]).map(
                (statusKey) => {
                  const count = report.metrics.patientRequests.statusBreakdown[statusKey];
                  const total = report.metrics.patientRequests.totalCreated;
                  const pct = total > 0 ? ((count / total) * 100).toFixed(1) + '%' : '0.0%';
                  const meta = LIFECYCLE_STATUS_LABELS[statusKey];
                  return (
                    <View key={statusKey} style={styles.tableRow}>
                      <View style={[styles.tableCellView, { flex: 2, flexDirection: 'row', alignItems: 'center' }]}>
                        <View style={[styles.statusDot, { backgroundColor: meta.color }]} />
                        <Text style={styles.statusNameText}>{meta.label}</Text>
                      </View>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>
                        {count}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', color: colors.secondaryMuted }]}>
                        {pct}
                      </Text>
                    </View>
                  );
                },
              )}
            </View>

            {/* Hospital Breakdown Table */}
            <View style={styles.subSectionWrap}>
              <Text style={styles.subSectionTitle}>Breakdown by Hospital / Blood Bank</Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Hospital Name</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>ID</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Requests</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Units Needed</Text>
                </View>
                {report.metrics.patientRequests.byHospital.length === 0 ? (
                  <View style={styles.emptyTableRow}>
                    <Text style={styles.emptyTableText}>No patient requests recorded across hospitals in this period.</Text>
                  </View>
                ) : (
                  report.metrics.patientRequests.byHospital.map((hosp) => (
                    <View key={hosp.hospitalId} style={styles.tableRow}>
                      <Text style={[styles.tableCell, { flex: 2, fontWeight: '500' }]}>{hosp.hospitalName}</Text>
                      <Text style={[styles.tableCell, { flex: 1, color: colors.secondaryMuted }]}>{hosp.hospitalId}</Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>
                        {hosp.count}
                      </Text>
                      <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{hosp.unitsRequired} units</Text>
                    </View>
                  ))
                )}
              </View>
            </View>

            {/* Blood Group Breakdown Table */}
            <View style={styles.subSectionWrap}>
              <Text style={styles.subSectionTitle}>Breakdown by Blood Group</Text>
              <View style={styles.table}>
                <View style={styles.tableHeaderRow}>
                  <Text style={[styles.tableHeaderCell, { flex: 1 }]}>Blood Group</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Requests</Text>
                  <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Units Needed</Text>
                </View>
                {Object.entries(report.metrics.patientRequests.byBloodGroup).map(([bg, data]) => (
                  <View key={bg} style={styles.tableRow}>
                    <View style={[styles.tableCellView, { flex: 1, flexDirection: 'row', alignItems: 'center' }]}>
                      <View style={styles.bgBadge}>
                        <Text style={styles.bgBadgeText}>{bg}</Text>
                      </View>
                    </View>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '600' }]}>
                      {data.count}
                    </Text>
                    <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>{data.unitsRequired} units</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Section B: Delivery Arrivals Confirmed */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="checkmark-done-circle-outline" size={18} color={colors.info} />
              <Text style={styles.sectionTitle}>B. Delivery Arrivals Confirmed</Text>
            </View>
            <View style={styles.kpiSingleRow}>
              <Text style={styles.singleKpiNumber}>{report.metrics.deliveryArrivals.confirmedCount}</Text>
              <Text style={styles.singleKpiLabel}>Arrivals confirmed during selected interval</Text>
            </View>
            <View style={styles.calloutBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.info} />
              <Text style={styles.calloutText}>{report.notes.deliveryArrivalsNote}</Text>
            </View>
          </View>

          {/* Section C: Donation Invitations */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="megaphone-outline" size={18} color={colors.warning} />
              <Text style={styles.sectionTitle}>C. Donation Invitations (Hospital / Blood Bank)</Text>
            </View>
            <Text style={styles.sectionExplainer}>{report.notes.donationInvitationsNote}</Text>

            <View style={styles.table}>
              <View style={styles.tableHeaderRow}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Invitation Metric / Status Cohort</Text>
                <Text style={[styles.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Count</Text>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Cohort Definition</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>Invitations Created in Period</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                  {report.metrics.donationInvitations.createdCount}
                </Text>
                <Text style={[styles.tableCell, { flex: 2, color: colors.secondaryMuted }]}>
                  Drafted or published with createdAt in interval
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2, fontWeight: '600' }]}>Invitations Published in Period</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right', fontWeight: '700' }]}>
                  {report.metrics.donationInvitations.publishedCount}
                </Text>
                <Text style={[styles.tableCell, { flex: 2, color: colors.secondaryMuted }]}>
                  Opened to donors (includes subsequently closed invitations)
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Created Status: Draft</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {report.metrics.donationInvitations.createdStatusBreakdown.draft}
                </Text>
                <Text style={[styles.tableCell, { flex: 2, color: colors.secondaryMuted }]}>
                  Currently awaiting administrator review
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Created Status: Published</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {report.metrics.donationInvitations.createdStatusBreakdown.published}
                </Text>
                <Text style={[styles.tableCell, { flex: 2, color: colors.secondaryMuted }]}>
                  Currently active and open to responses
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={[styles.tableCell, { flex: 2 }]}>Created Status: Closed</Text>
                <Text style={[styles.tableCell, { flex: 1, textAlign: 'right' }]}>
                  {report.metrics.donationInvitations.createdStatusBreakdown.closed}
                </Text>
                <Text style={[styles.tableCell, { flex: 2, color: colors.secondaryMuted }]}>
                  Concluded or filled by administrative action
                </Text>
              </View>
            </View>
          </View>

          {/* Section D: Donor Willingness */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="heart-outline" size={18} color={colors.primary} />
              <Text style={styles.sectionTitle}>D. Donor Willingness (DonationResponse)</Text>
            </View>
            <View style={styles.kpiDoubleRow}>
              <View style={styles.kpiHalf}>
                <Text style={styles.singleKpiNumber}>{report.metrics.donorWillingness.acceptedOffersCount}</Text>
                <Text style={styles.singleKpiLabel}>Total Accepted Willingness Responses</Text>
              </View>
              <View style={styles.kpiHalf}>
                <Text style={styles.singleKpiNumber}>{report.metrics.donorWillingness.uniqueRespondingDonors}</Text>
                <Text style={styles.singleKpiLabel}>Unique Responding Donors in Interval</Text>
              </View>
            </View>
            <View style={styles.calloutBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.primary} />
              <Text style={styles.calloutText}>{report.notes.donorWillingnessNote}</Text>
            </View>
          </View>

          {/* Section E: Registered Accounts */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <Ionicons name="person-add-outline" size={18} color={colors.secondaryLight} />
              <Text style={styles.sectionTitle}>E. Current Registered Accounts (All Dates)</Text>
            </View>
            <View style={styles.kpiDoubleRow}>
              <View style={styles.kpiHalf}>
                <Text style={styles.singleKpiNumber}>{report.metrics.registeredAccounts.recipientAccountsCount}</Text>
                <Text style={styles.singleKpiLabel}>Current Registered Recipient Accounts (All Dates)</Text>
              </View>
              <View style={styles.kpiHalf}>
                <Text style={styles.singleKpiNumber}>{report.metrics.registeredAccounts.donorAccountsCount}</Text>
                <Text style={styles.singleKpiLabel}>Current Registered Donor Accounts (All Dates)</Text>
              </View>
            </View>
            <View style={styles.calloutBox}>
              <Ionicons name="information-circle-outline" size={18} color={colors.secondaryLight} />
              <Text style={styles.calloutText}>{report.notes.registeredAccountsNote}</Text>
            </View>
          </View>

          {/* Section F: Regulatory & Audit Notes */}
          <View style={styles.disclaimerCard}>
            <View style={styles.disclaimerHeader}>
              <Ionicons name="shield-checkmark" size={18} color={colors.secondary} />
              <Text style={styles.disclaimerTitle}>Regulatory Compliance & Data Safety Guarantees</Text>
            </View>
            <Text style={styles.disclaimerText}>• {report.notes.generalDisclaimer}</Text>
            <Text style={styles.disclaimerText}>• {report.notes.patientRequestsNote}</Text>
            <Text style={styles.disclaimerText}>• {report.notes.deliveryArrivalsNote}</Text>
            <Text style={styles.disclaimerText}>• {report.notes.donorWillingnessNote}</Text>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    padding: spacing.lg,
    maxWidth: 1200,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: spacing.lg,
  },
  headerLeft: {
    flex: 1,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
    flexWrap: 'wrap',
  },
  titleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.primaryTonal,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  titleBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
    textTransform: 'uppercase',
  },
  timezoneBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondarySoft,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: borderRadius.sm,
  },
  timezoneBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondaryMuted,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.secondary,
    letterSpacing: -0.5,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 13,
    color: colors.secondaryMuted,
    lineHeight: 18,
  },
  filterCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  filterCardHeader: {
    marginBottom: spacing.md,
  },
  filterCardTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 2,
  },
  filterCardDesc: {
    fontSize: 12,
    color: colors.secondaryMuted,
  },
  presetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  presetLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryMuted,
  },
  presetChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.secondarySoft,
    paddingVertical: 5,
    paddingHorizontal: spacing.sm,
    borderRadius: borderRadius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  inputRow: {
    gap: spacing.md,
  },
  inputRowDesktop: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  inputGroup: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondaryLight,
    marginBottom: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.sm,
  },
  inputIcon: {
    marginRight: 6,
  },
  textInput: {
    flex: 1,
    height: 40,
    fontSize: 13,
    color: colors.secondary,
  },
  actionButtonGroup: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primary,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
  },
  generateButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: colors.primaryTonal,
    height: 40,
    paddingHorizontal: spacing.lg,
    borderRadius: borderRadius.md,
    borderWidth: 1,
    borderColor: colors.primarySoft,
  },
  downloadButtonText: {
    color: colors.primary,
    fontWeight: '700',
    fontSize: 13,
  },
  downloadButtonTextDisabled: {
    color: colors.textMuted,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  validationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.dangerSoft,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  validationText: {
    color: colors.danger,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: colors.successSoft,
    padding: spacing.sm,
    borderRadius: borderRadius.sm,
    marginTop: spacing.md,
  },
  successText: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.dangerSoft,
    borderWidth: 1,
    borderColor: colors.danger,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.lg,
  },
  errorBannerContent: {
    flex: 1,
  },
  errorBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.danger,
    marginBottom: 2,
  },
  errorBannerText: {
    fontSize: 12,
    color: colors.danger,
  },
  retryButton: {
    backgroundColor: colors.danger,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  mismatchBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.warningSoft,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
    marginBottom: spacing.lg,
  },
  mismatchBannerContent: {
    flex: 1,
  },
  mismatchBannerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 2,
  },
  mismatchBannerText: {
    fontSize: 12,
    color: colors.secondaryLight,
    lineHeight: 16,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xxl,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  loadingTitle: {
    marginTop: spacing.md,
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
  },
  loadingSubtitle: {
    marginTop: 4,
    fontSize: 12,
    color: colors.secondaryMuted,
    textAlign: 'center',
    maxWidth: 400,
  },
  reportContainer: {
    gap: spacing.lg,
  },
  snapshotHeaderCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  snapshotTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  snapshotTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 4,
  },
  snapshotSubtitle: {
    fontSize: 13,
    color: colors.secondaryLight,
  },
  boldText: {
    fontWeight: '700',
    color: colors.secondary,
  },
  snapshotMetaRight: {
    alignItems: 'flex-end',
  },
  snapshotMetaLabel: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  snapshotMetaVal: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
  },
  zeroDataCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  zeroDataIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.secondarySoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.sm,
  },
  zeroDataTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: 4,
  },
  zeroDataDesc: {
    fontSize: 12,
    color: colors.secondaryMuted,
    textAlign: 'center',
    maxWidth: 500,
    lineHeight: 18,
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  kpiCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.borderLight,
    width: '100%',
    ...shadows.sm,
  },
  kpiCardTablet: {
    width: '48%',
  },
  kpiCardDesktop: {
    width: '31.7%',
  },
  kpiHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  kpiLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryMuted,
    letterSpacing: 0.5,
  },
  kpiValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.secondary,
    marginBottom: 2,
  },
  kpiSub: {
    fontSize: 11,
    color: colors.secondaryMuted,
  },
  sectionCard: {
    backgroundColor: colors.card,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.borderLight,
    ...shadows.sm,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.secondary,
  },
  sectionExplainer: {
    fontSize: 12,
    color: colors.secondaryMuted,
    marginBottom: spacing.md,
    lineHeight: 16,
  },
  subSectionWrap: {
    marginTop: spacing.lg,
  },
  subSectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
    marginBottom: spacing.sm,
  },
  table: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
  },
  tableHeaderRow: {
    flexDirection: 'row',
    backgroundColor: colors.secondarySoft,
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tableHeaderCell: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.secondaryLight,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.card,
  },
  tableCell: {
    fontSize: 12,
    color: colors.secondary,
  },
  tableCellView: {
    justifyContent: 'center',
  },
  emptyTableRow: {
    padding: spacing.md,
    alignItems: 'center',
  },
  emptyTableText: {
    fontSize: 12,
    color: colors.secondaryMuted,
    fontStyle: 'italic',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusNameText: {
    fontSize: 12,
    fontWeight: '500',
    color: colors.secondary,
  },
  bgBadge: {
    backgroundColor: colors.primaryTonal,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: borderRadius.xs,
  },
  bgBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primary,
  },
  kpiSingleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  singleKpiNumber: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.secondary,
  },
  singleKpiLabel: {
    fontSize: 13,
    color: colors.secondaryMuted,
    fontWeight: '500',
  },
  kpiDoubleRow: {
    flexDirection: 'row',
    gap: spacing.lg,
    marginBottom: spacing.md,
    flexWrap: 'wrap',
  },
  kpiHalf: {
    flex: 1,
    minWidth: 180,
  },
  calloutBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: borderRadius.sm,
    padding: spacing.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondaryLight,
  },
  calloutText: {
    flex: 1,
    fontSize: 12,
    color: colors.secondaryLight,
    lineHeight: 17,
  },
  disclaimerCard: {
    backgroundColor: colors.secondarySoft,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.xs,
    marginBottom: spacing.xl,
  },
  disclaimerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: 4,
  },
  disclaimerTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: colors.secondary,
  },
  disclaimerText: {
    fontSize: 11,
    color: colors.secondaryLight,
    lineHeight: 16,
  },
});

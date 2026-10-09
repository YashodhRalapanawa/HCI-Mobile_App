import crypto from 'node:crypto';
import { env } from '../../config/env.js';
import { BloodRequest, type RequestStatus } from '../requests/request.model.js';
import { DonationRequest } from '../donors/donationRequest.model.js';
import { DonationResponse } from '../donors/donationResponse.model.js';
import { User, type BloodGroup } from '../users/user.model.js';

export const ALL_REQUEST_STATUSES: RequestStatus[] = [
  'pending_verification',
  'verified',
  'in_progress',
  'fulfilled',
  'cancelled',
  'rejected',
];

export const ALL_BLOOD_GROUPS: BloodGroup[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

export interface ColomboDateInterval {
  from: string; // 'YYYY-MM-DD'
  to: string; // 'YYYY-MM-DD'
  timezone: string; // 'Asia/Colombo (UTC+05:30)'
  startUtc: Date;
  endExclusiveUtc: Date;
}

export interface AdminReportData {
  reportTitle: string;
  appliedRange: {
    from: string;
    to: string;
    timezone: string;
    startUtcIso: string;
    endExclusiveUtcIso: string;
  };
  generatedAt: string;
  generatedAtColombo: string;
  metrics: {
    patientRequests: {
      totalCreated: number;
      statusBreakdown: Record<RequestStatus, number>;
      byHospital: Array<{
        hospitalId: string;
        hospitalName: string;
        count: number;
        unitsRequired: number;
      }>;
      byBloodGroup: Record<BloodGroup, { count: number; unitsRequired: number }>;
    };
    deliveryArrivals: {
      confirmedCount: number;
    };
    donationInvitations: {
      createdCount: number;
      publishedCount: number;
      createdStatusBreakdown: {
        draft: number;
        published: number;
        closed: number;
      };
    };
    donorWillingness: {
      acceptedOffersCount: number;
      uniqueRespondingDonors: number;
    };
    registeredAccounts: {
      recipientAccountsCount: number;
      donorAccountsCount: number;
    };
  };
  notes: {
    patientRequestsNote: string;
    deliveryArrivalsNote: string;
    donationInvitationsNote: string;
    donorWillingnessNote: string;
    registeredAccountsNote: string;
    generalDisclaimer: string;
  };
  /**
   * Cryptographic server signature ensuring snapshot integrity between display and export.
   */
  signature: string;
}

export class ReportValidationError extends Error {
  public statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.name = 'ReportValidationError';
    this.statusCode = statusCode;
  }
}

/**
 * Validates a YYYY-MM-DD string representing a real calendar date.
 */
export function isValidCalendarDate(dateStr: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return false;
  const [yearStr, monthStr, dayStr] = dateStr.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const day = Number(dayStr);

  if (year < 2000 || year > 2100) return false;
  if (month < 1 || month > 12) return false;

  // Number of days in given month (month is 1-indexed for Date.UTC(year, month, 0))
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return day >= 1 && day <= daysInMonth;
}

/**
 * Validates and converts inclusive Colombo calendar dates (YYYY-MM-DD)
 * to a UTC start-inclusive / end-exclusive interval.
 * Asia/Colombo is standard UTC+05:30 year-round (no DST).
 */
export function parseColomboDateInterval(from: string, to: string): ColomboDateInterval {
  if (!from || typeof from !== 'string' || !isValidCalendarDate(from.trim())) {
    throw new ReportValidationError("Invalid 'from' date. Must be a valid calendar date in YYYY-MM-DD format.");
  }

  if (!to || typeof to !== 'string' || !isValidCalendarDate(to.trim())) {
    throw new ReportValidationError("Invalid 'to' date. Must be a valid calendar date in YYYY-MM-DD format.");
  }

  const cleanFrom = from.trim();
  const cleanTo = to.trim();

  if (cleanFrom > cleanTo) {
    throw new ReportValidationError("Reversed date range: 'from' date must be on or before 'to' date.");
  }

  // Start in Colombo: cleanFrom at 00:00:00.000+05:30
  const startUtc = new Date(`${cleanFrom}T00:00:00.000+05:30`);

  // End exclusive in Colombo: cleanTo + 1 day at 00:00:00.000+05:30
  const toBase = new Date(`${cleanTo}T00:00:00.000+05:30`);
  const endExclusiveUtc = new Date(toBase.getTime() + 24 * 60 * 60 * 1000);

  return {
    from: cleanFrom,
    to: cleanTo,
    timezone: 'Asia/Colombo (UTC+05:30)',
    startUtc,
    endExclusiveUtc,
  };
}

/**
 * Formats a Date object into a readable Colombo local timestamp string.
 */
export function formatColomboTimestamp(date: Date): string {
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Colombo',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);
}

/**
 * Deterministic canonical serialization of report fields for cryptographic signature.
 */
export function canonicalizeReportData(report: Omit<AdminReportData, 'signature'>): string {
  return JSON.stringify({
    reportTitle: report.reportTitle,
    appliedRange: {
      from: report.appliedRange.from,
      to: report.appliedRange.to,
      timezone: report.appliedRange.timezone,
      startUtcIso: report.appliedRange.startUtcIso,
      endExclusiveUtcIso: report.appliedRange.endExclusiveUtcIso,
    },
    generatedAt: report.generatedAt,
    generatedAtColombo: report.generatedAtColombo,
    metrics: report.metrics,
    notes: report.notes,
  });
}

/**
 * Creates an HMAC-SHA256 signature for a generated report snapshot using backend JWT_SECRET.
 */
export function signReportSnapshot(report: Omit<AdminReportData, 'signature'>): string {
  const canonical = canonicalizeReportData(report);
  const secret = env.JWT_SECRET || 'lifeline_lk_super_secure_jwt_secret_key_2026_dev';
  return crypto.createHmac('sha256', secret).update(canonical).digest('hex');
}

/**
 * Verifies that a client-submitted report snapshot was authentic, unmodified,
 * and signed by this backend server. Rejects altered counts, dates, timestamps, or breakdowns.
 */
export function verifyReportSnapshot(report: unknown): report is AdminReportData {
  if (!report || typeof report !== 'object') return false;
  const candidate = report as Record<string, unknown>;

  if (typeof candidate.signature !== 'string' || !candidate.signature.trim()) {
    return false;
  }

  const { signature, ...rest } = candidate as unknown as AdminReportData;
  let expectedSignature: string;
  try {
    expectedSignature = signReportSnapshot(rest);
  } catch {
    return false;
  }

  if (signature.length !== expectedSignature.length) {
    return false;
  }

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature, 'hex'),
      Buffer.from(expectedSignature, 'hex'),
    );
  } catch {
    return false;
  }
}

/**
 * Computes authoritative aggregate metrics for the specified period.
 * Strictly read-only; does not mutate any records.
 * Returns only anonymous aggregate metrics with server signature.
 */
export async function generateAdminReportData(from: string, to: string): Promise<AdminReportData> {
  const interval = parseColomboDateInterval(from, to);
  const now = new Date();
  const generatedAtColombo = formatColomboTimestamp(now);

  const { startUtc, endExclusiveUtc } = interval;

  // Run all aggregate read queries in parallel for efficiency
  const [
    // A1. Total patient blood requests created in period
    totalPatientRequestsCreated,

    // A2. Status breakdown of requests created in period
    requestsByStatusAgg,

    // A3. Hospital breakdown of requests created in period
    requestsByHospitalAgg,

    // A4. Blood group breakdown of requests created in period
    requestsByBloodGroupAgg,

    // B. Delivery arrivals confirmed in period
    deliveryArrivalsCount,

    // C1. Donation invitations created in period
    donationInvitationsCreatedCount,

    // C2. Donation invitations published in period (including subsequently closed)
    donationInvitationsPublishedCount,

    // C3. Current status breakdown of donation invitations created in period
    donationInvitationsStatusAgg,

    // D1. Accepted donor willingness responses in period
    acceptedOffersCount,

    // D2. Unique responding donors in period
    uniqueDonorsAgg,

    // E1. All-time recipient accounts
    recipientAccountsCount,

    // E2. All-time donor accounts
    donorAccountsCount,
  ] = await Promise.all([
    // A1
    BloodRequest.countDocuments({
      createdAt: { $gte: startUtc, $lt: endExclusiveUtc },
    }),

    // A2
    BloodRequest.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: startUtc, $lt: endExclusiveUtc } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // A3
    BloodRequest.aggregate<{
      _id: { hospitalId: string; hospitalName: string };
      count: number;
      unitsRequired: number;
    }>([
      { $match: { createdAt: { $gte: startUtc, $lt: endExclusiveUtc } } },
      {
        $group: {
          _id: { hospitalId: '$hospitalId', hospitalName: '$hospitalName' },
          count: { $sum: 1 },
          unitsRequired: { $sum: '$unitsRequired' },
        },
      },
      { $sort: { count: -1, '_id.hospitalName': 1 } },
    ]),

    // A4
    BloodRequest.aggregate<{
      _id: BloodGroup;
      count: number;
      unitsRequired: number;
    }>([
      { $match: { createdAt: { $gte: startUtc, $lt: endExclusiveUtc } } },
      {
        $group: {
          _id: '$bloodGroup',
          count: { $sum: 1 },
          unitsRequired: { $sum: '$unitsRequired' },
        },
      },
    ]),

    // B: Delivery arrivals confirmed during the selected period
    BloodRequest.countDocuments({
      'deliveryAssignment.arrivalConfirmedAt': { $gte: startUtc, $lt: endExclusiveUtc },
    }),

    // C1: Donation invitations created in period
    DonationRequest.countDocuments({
      createdAt: { $gte: startUtc, $lt: endExclusiveUtc },
    }),

    // C2: Donation invitations published in period (including subsequently closed)
    DonationRequest.countDocuments({
      publishedAt: { $gte: startUtc, $lt: endExclusiveUtc },
    }),

    // C3: Status breakdown of invitations created in period
    DonationRequest.aggregate<{ _id: string; count: number }>([
      { $match: { createdAt: { $gte: startUtc, $lt: endExclusiveUtc } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),

    // D1: Accepted DonationResponse records in period (status 'accepted')
    DonationResponse.countDocuments({
      status: 'accepted',
      acceptedAt: { $gte: startUtc, $lt: endExclusiveUtc },
    }),

    // D2: Unique responding donors in period
    DonationResponse.aggregate<{ uniqueDonors: number }>([
      {
        $match: {
          status: 'accepted',
          acceptedAt: { $gte: startUtc, $lt: endExclusiveUtc },
        },
      },
      { $group: { _id: '$donorId' } },
      { $count: 'uniqueDonors' },
    ]),

    // E1: All-time recipient accounts
    User.countDocuments({ role: 'recipient' }),

    // E2: All-time donor accounts
    User.countDocuments({ role: 'donor' }),
  ]);

  // Construct complete status breakdown map covering all 6 schema statuses
  const statusBreakdown: Record<RequestStatus, number> = {
    pending_verification: 0,
    verified: 0,
    in_progress: 0,
    fulfilled: 0,
    cancelled: 0,
    rejected: 0,
  };
  for (const row of requestsByStatusAgg) {
    if (row._id in statusBreakdown) {
      statusBreakdown[row._id as RequestStatus] = row.count;
    }
  }

  // Construct hospital breakdown list
  const byHospital = requestsByHospitalAgg.map((row) => ({
    hospitalId: row._id.hospitalId || 'unknown',
    hospitalName: row._id.hospitalName || 'Unknown Hospital',
    count: row.count,
    unitsRequired: row.unitsRequired || 0,
  }));

  // Construct complete blood group breakdown map covering all 8 blood groups
  const byBloodGroup: Record<BloodGroup, { count: number; unitsRequired: number }> = {
    'A+': { count: 0, unitsRequired: 0 },
    'A-': { count: 0, unitsRequired: 0 },
    'B+': { count: 0, unitsRequired: 0 },
    'B-': { count: 0, unitsRequired: 0 },
    'AB+': { count: 0, unitsRequired: 0 },
    'AB-': { count: 0, unitsRequired: 0 },
    'O+': { count: 0, unitsRequired: 0 },
    'O-': { count: 0, unitsRequired: 0 },
  };
  for (const row of requestsByBloodGroupAgg) {
    if (row._id in byBloodGroup) {
      byBloodGroup[row._id] = {
        count: row.count,
        unitsRequired: row.unitsRequired || 0,
      };
    }
  }

  // Construct invitation status breakdown for invitations created in period
  const createdStatusBreakdown = {
    draft: 0,
    published: 0,
    closed: 0,
  };
  for (const row of donationInvitationsStatusAgg) {
    if (row._id in createdStatusBreakdown) {
      createdStatusBreakdown[row._id as 'draft' | 'published' | 'closed'] = row.count;
    }
  }

  const uniqueRespondingDonors = uniqueDonorsAgg[0]?.uniqueDonors ?? 0;

  const baseReport: Omit<AdminReportData, 'signature'> = {
    reportTitle: 'Blood Request & Donation Summary Report',
    appliedRange: {
      from: interval.from,
      to: interval.to,
      timezone: interval.timezone,
      startUtcIso: interval.startUtc.toISOString(),
      endExclusiveUtcIso: interval.endExclusiveUtc.toISOString(),
    },
    generatedAt: now.toISOString(),
    generatedAtColombo,
    metrics: {
      patientRequests: {
        totalCreated: totalPatientRequestsCreated,
        statusBreakdown,
        byHospital,
        byBloodGroup,
      },
      deliveryArrivals: {
        confirmedCount: deliveryArrivalsCount,
      },
      donationInvitations: {
        createdCount: donationInvitationsCreatedCount,
        publishedCount: donationInvitationsPublishedCount,
        createdStatusBreakdown,
      },
      donorWillingness: {
        acceptedOffersCount,
        uniqueRespondingDonors,
      },
      registeredAccounts: {
        recipientAccountsCount,
        donorAccountsCount,
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
  };

  const signature = signReportSnapshot(baseReport);

  return {
    ...baseReport,
    signature,
  };
}

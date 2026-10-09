export interface AdminSummaryCounts {
  pendingPatientRequests: number;
  approvedAwaitingAssignment: number;
  activeAssignedRequests: number;
  recordedArrivalConfirmations: number;
  availableDonationRequests: number;
  donorOffers: number;
  registeredDonors: number;
}

export interface AdminSummaryResponse {
  summary: AdminSummaryCounts;
  refreshedAt: string;
}

export type AdminRequestStatusFilter =
  | 'all'
  | 'pending_verification'
  | 'verified'
  | 'in_progress'
  | 'fulfilled'
  | 'rejected'
  | 'cancelled';

export interface AdminPatientRequestItem {
  id: string;
  patientName: string;
  bloodGroup: string;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalName: string;
  hospitalReferenceAndWard: string;
  urgency: 'Urgent' | 'Scheduled';
  status: 'pending_verification' | 'verified' | 'in_progress' | 'fulfilled' | 'cancelled' | 'rejected';
  hasDeliveryAssignment: boolean;
  deliveryPersonName?: string;
  arrivalConfirmedAt?: string | null;
  isArrivalConfirmed: boolean;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDeliveryAssignmentDetail {
  assignmentId: string;
  deliveryPersonName: string;
  contactPhone: string;
  assignedAt: string;
  assignedBy?: string;
  arrivalConfirmedAt?: string | null;
  isArrivalConfirmed: boolean;
}

export interface AdminPatientRequestDetail {
  id: string;
  patientName: string;
  bloodGroup: string;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalId: string;
  hospitalName: string;
  hospitalReferenceAndWard: string;
  urgency: 'Urgent' | 'Scheduled';
  status: 'pending_verification' | 'verified' | 'in_progress' | 'fulfilled' | 'cancelled' | 'rejected';
  document: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  requester?: {
    id: string;
    name: string;
    email: string;
    phone?: string;
    district?: string;
    city?: string;
  };
  deliveryAssignment?: AdminDeliveryAssignmentDetail | null;
  rejectionReason?: string;
  reviewer?: {
    id: string;
    name: string;
    email: string;
  } | null;
  reviewedBy?:
    | {
        id: string;
        name: string;
        email: string;
      }
    | string
    | null;
  reviewedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminPatientRequestsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface AdminPatientRequestsResponse {
  requests: AdminPatientRequestItem[];
  pagination: AdminPatientRequestsPagination;
}

export interface AssignDeliveryPayload {
  deliveryPersonName: string;
  contactPhone: string;
  expectedAssignmentId?: string;
  confirmReassignment?: boolean;
}

export type AdminDonationStatusFilter = 'all' | 'draft' | 'published' | 'closed';

export interface AdminDonationRequestItem {
  id: string;
  bloodGroup: string;
  unitsRequired: number;
  hospitalId: string;
  hospitalName: string;
  locationDescription: string;
  urgency: 'Urgent' | 'Scheduled';
  neededBy?: string | null;
  status: 'draft' | 'published' | 'closed';
  publishedAt?: string | null;
  closedAt?: string | null;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface AdminDonationRequestDetail extends AdminDonationRequestItem {
  createdByAdmin?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

export interface AdminDonationRequestsCounts {
  draft: number;
  published: number;
  closed: number;
}

export interface AdminDonationRequestsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface AdminDonationRequestsResponse {
  requests: AdminDonationRequestItem[];
  pagination: AdminDonationRequestsPagination;
  counts: AdminDonationRequestsCounts;
}

export interface CreateDonationRequestPayload {
  bloodGroup: string;
  unitsRequired: number;
  hospitalId: string;
  locationDescription: string;
  urgency: 'Urgent' | 'Scheduled';
  neededBy?: string | null;
}

export interface UpdateDonationRequestPayload {
  bloodGroup?: string;
  unitsRequired?: number;
  hospitalId?: string;
  locationDescription?: string;
  urgency?: 'Urgent' | 'Scheduled';
  neededBy?: string | null;
  expectedUpdatedAt?: string;
}

export interface AdminDonorResponseItem {
  responseId: string;
  donorId: string;
  donorName: string;
  donorBloodGroup: string | null;
  donorDistrict: string | null;
  status: 'willing_to_donate';
  acceptedAt: string;
}

export interface AdminDonorResponsesResponse {
  responses: AdminDonorResponseItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export type AdminRequestLifecycleStatus =
  | 'pending_verification'
  | 'verified'
  | 'in_progress'
  | 'fulfilled'
  | 'cancelled'
  | 'rejected';

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
      statusBreakdown: Record<AdminRequestLifecycleStatus, number>;
      byHospital: {
        hospitalId: string;
        hospitalName: string;
        count: number;
        unitsRequired: number;
      }[];
      byBloodGroup: Record<string, { count: number; unitsRequired: number }>;
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
  signature: string;
}

export interface AdminReportResponse {
  report: AdminReportData;
}

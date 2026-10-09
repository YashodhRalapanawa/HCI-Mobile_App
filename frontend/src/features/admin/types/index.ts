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

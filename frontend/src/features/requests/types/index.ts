export interface HospitalOption {
  id: string;
  name: string;
  district: string;
}

export type BloodGroupType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type UrgencyType = 'Urgent' | 'Scheduled';

export interface SelectedDocument {
  uri: string;
  name: string;
  mimeType?: string;
  size?: number;
  file?: any;
}

export type RequestStatus =
  | 'pending_verification'
  | 'verified'
  | 'in_progress'
  | 'fulfilled'
  | 'cancelled'
  | 'rejected';

export interface CreatedRequestResponse {
  id: string;
  patientName: string;
  bloodGroup: string;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalId: string;
  hospitalName: string;
  hospitalReferenceAndWard: string;
  urgency: UrgencyType;
  status: RequestStatus;
  document: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
  };
  deliveryAssignment?: DeliveryAssignmentInfo | null;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface CreateRequestFormValues {
  patientName: string;
  bloodGroup: BloodGroupType;
  unitsRequired: number;
  hospitalId: string;
  hospitalReferenceAndWard: string;
  urgency: UrgencyType;
  document: SelectedDocument | null;
}

export type MyRequestsTab = 'active' | 'completed' | 'rejected';

export interface DeliveryAssignmentInfo {
  assignmentId: string;
  deliveryPersonName: string;
  contactPhone: string;
  assignedAt: string;
  arrivalConfirmedAt?: string | null;
  isArrivalConfirmed?: boolean;
}

export interface RequestDeliveryAssignmentResponse {
  requestId?: string;
  bloodGroup?: BloodGroupType;
  patientName?: string;
  status?: RequestStatus;
  deliveryAssignment: DeliveryAssignmentInfo | null;
  hospitalName?: string;
  hospitalReferenceAndWard?: string;
  message?: string;
}

export interface ConfirmDeliveryArrivalResponse {
  message: string;
  requestId: string;
  assignmentId: string;
  arrivalConfirmedAt: string;
  isArrivalConfirmed: boolean;
  status: RequestStatus;
  deliveryAssignment: DeliveryAssignmentInfo;
}

export interface MyRequestSummaryItem {
  id: string;
  patientName: string;
  bloodGroup: BloodGroupType;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalId: string;
  hospitalName: string;
  hospitalReferenceAndWard: string;
  urgency: UrgencyType;
  status: RequestStatus;
  acceptedDonorsCount?: number;
  hasDeliveryAssignment?: boolean;
  rejectionReason?: string;
  reviewedAt?: string;
  createdAt: string;
}

export interface DonorAcceptanceSummary {
  id: string;
  safeDonorCode: string;
  status: 'accepted' | 'withdrawn' | 'completed';
  acceptedAt: string;
}

export interface RequestAcceptancesResponse {
  request: {
    id: string;
    patientName: string;
    bloodGroup: BloodGroupType;
    unitsRequired: number;
    unitsFulfilled: number;
    hospitalId: string;
    hospitalName: string;
    hospitalReferenceAndWard: string;
    urgency: UrgencyType;
    status: RequestStatus;
    createdAt: string;
  };
  acceptances: DonorAcceptanceSummary[];
  count: number;
}

export interface MyRequestsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface MyRequestsCounts {
  active: number;
  completed: number;
  rejected: number;
}

export interface MyRequestsResponse {
  requests: MyRequestSummaryItem[];
  pagination: MyRequestsPagination;
  counts: MyRequestsCounts;
}

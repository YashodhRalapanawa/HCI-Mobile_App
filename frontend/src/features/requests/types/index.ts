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
  | 'cancelled';

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

export type MyRequestsTab = 'active' | 'completed';

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
  createdAt: string;
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
}

export interface MyRequestsResponse {
  requests: MyRequestSummaryItem[];
  pagination: MyRequestsPagination;
  counts: MyRequestsCounts;
}

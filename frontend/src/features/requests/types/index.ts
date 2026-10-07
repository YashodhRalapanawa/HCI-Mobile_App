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
  status: 'pending_verification';
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

export type DonationRequestUrgency = 'low' | 'medium' | 'high' | 'critical';
export type DonationRequestStatus = 'draft' | 'published' | 'closed';

export interface DonationRequestItem {
  id: string;
  bloodGroup: string;
  unitsRequired: number;
  hospitalId: string;
  hospitalName: string;
  locationDescription: string;
  urgency: DonationRequestUrgency;
  neededBy: string | null;
  status: DonationRequestStatus;
  publishedAt: string;
  createdAt: string;
}

export interface DonationRequestsPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
}

export interface DonationRequestsResponse {
  requests: DonationRequestItem[];
  pagination: DonationRequestsPagination;
}

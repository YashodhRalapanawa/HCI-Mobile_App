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

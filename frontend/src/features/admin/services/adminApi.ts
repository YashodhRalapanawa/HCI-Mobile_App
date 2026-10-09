import { API_BASE_URL, apiRequest } from '@/services/api';
import type {
  AdminSummaryResponse,
  AdminPatientRequestsResponse,
  AdminPatientRequestDetail,
  AdminRequestStatusFilter,
  AssignDeliveryPayload,
  AdminDonationRequestsResponse,
  AdminDonationRequestDetail,
  AdminDonationStatusFilter,
  CreateDonationRequestPayload,
  UpdateDonationRequestPayload,
  AdminDonorResponsesResponse,
} from '../types';

export const adminApi = {
  /**
   * Fetches the real operational summary counts for the Admin Dashboard.
   * Requires verified authentication and trusted admin role.
   */
  getSummary: async (token: string): Promise<AdminSummaryResponse> => {
    return apiRequest<AdminSummaryResponse>('admin/summary', {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Fetches paginated patient blood requests with search and status filtering.
   */
  getPatientRequests: async (
    token: string,
    params: {
      search?: string;
      status?: AdminRequestStatusFilter;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<AdminPatientRequestsResponse> => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const path = `admin/patient-requests${query.toString() ? `?${query.toString()}` : ''}`;
    return apiRequest<AdminPatientRequestsResponse>(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Fetches full review detail for a specific patient request.
   */
  getPatientRequestById: async (
    token: string,
    id: string,
  ): Promise<{ request: AdminPatientRequestDetail }> => {
    return apiRequest<{ request: AdminPatientRequestDetail }>(
      `admin/patient-requests/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },

  /**
   * Authenticated document stream fetcher.
   * Returns a Blob with filename and mimeType from Content-Disposition and Content-Type.
   */
  fetchDocumentBlob: async (
    token: string,
    id: string,
  ): Promise<{ blob: Blob; filename: string; mimeType: string }> => {
    const url = `${API_BASE_URL}/admin/patient-requests/${encodeURIComponent(id)}/document`;
    const res = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      let errorMsg = `Failed to fetch document (${res.status})`;
      try {
        const json = await res.json();
        if (json.message) errorMsg = json.message;
      } catch {
        // ignore
      }
      throw new Error(errorMsg);
    }

    const contentDisposition = res.headers.get('content-disposition');
    let filename = 'document';
    if (contentDisposition) {
      const match = /filename="?([^"]+)"?/.exec(contentDisposition);
      if (match && match[1]) {
        filename = match[1];
      }
    }
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    const blob = await res.blob();
    return { blob, filename, mimeType: contentType };
  },

  /**
   * Approves a pending_verification request, transitioning it to verified.
   * Requires expectedUpdatedAt to prevent stale approvals if patient edited/deleted.
   */
  approvePatientRequest: async (
    token: string,
    id: string,
    expectedUpdatedAt?: string,
  ): Promise<{ message: string; request: AdminPatientRequestDetail }> => {
    return apiRequest<{ message: string; request: AdminPatientRequestDetail }>(
      `admin/patient-requests/${encodeURIComponent(id)}/approve`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expectedUpdatedAt }),
      },
    );
  },

  /**
   * Rejects a pending_verification request with a required reviewer reason.
   */
  rejectPatientRequest: async (
    token: string,
    id: string,
    reason: string,
    expectedUpdatedAt?: string,
  ): Promise<{ message: string; request: AdminPatientRequestDetail }> => {
    return apiRequest<{ message: string; request: AdminPatientRequestDetail }>(
      `admin/patient-requests/${encodeURIComponent(id)}/reject`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason, expectedUpdatedAt }),
      },
    );
  },

  /**
   * Assigns or safely reassigns a delivery person to an approved active request.
   */
  assignDeliveryPerson: async (
    token: string,
    id: string,
    payload: AssignDeliveryPayload,
  ): Promise<{ message: string; request: AdminPatientRequestDetail }> => {
    return apiRequest<{ message: string; request: AdminPatientRequestDetail }>(
      `admin/patient-requests/${encodeURIComponent(id)}/assign-delivery`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );
  },

  /**
   * Fetches paginated donation requests with search and status filtering.
   */
  getDonationRequests: async (
    token: string,
    params: {
      search?: string;
      status?: AdminDonationStatusFilter;
      page?: number;
      limit?: number;
    } = {},
  ): Promise<AdminDonationRequestsResponse> => {
    const query = new URLSearchParams();
    if (params.search) query.append('search', params.search);
    if (params.status && params.status !== 'all') query.append('status', params.status);
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const path = `admin/donation-requests${query.toString() ? `?${query.toString()}` : ''}`;
    return apiRequest<AdminDonationRequestsResponse>(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Fetches full review detail for a specific donation request.
   */
  getDonationRequestById: async (
    token: string,
    id: string,
  ): Promise<{ request: AdminDonationRequestDetail }> => {
    return apiRequest<{ request: AdminDonationRequestDetail }>(
      `admin/donation-requests/${encodeURIComponent(id)}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );
  },

  /**
   * Creates a new donation request as a draft.
   */
  createDonationRequest: async (
    token: string,
    payload: CreateDonationRequestPayload,
  ): Promise<{ message: string; request: AdminDonationRequestDetail }> => {
    return apiRequest<{ message: string; request: AdminDonationRequestDetail }>(
      'admin/donation-requests',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );
  },

  /**
   * Updates an existing draft donation request.
   */
  updateDonationRequest: async (
    token: string,
    id: string,
    payload: UpdateDonationRequestPayload,
  ): Promise<{ message: string; request: AdminDonationRequestDetail }> => {
    return apiRequest<{ message: string; request: AdminDonationRequestDetail }>(
      `admin/donation-requests/${encodeURIComponent(id)}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      },
    );
  },

  /**
   * Publishes an existing draft donation request.
   */
  publishDonationRequest: async (
    token: string,
    id: string,
    expectedUpdatedAt?: string,
  ): Promise<{ message: string; request: AdminDonationRequestDetail }> => {
    return apiRequest<{ message: string; request: AdminDonationRequestDetail }>(
      `admin/donation-requests/${encodeURIComponent(id)}/publish`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expectedUpdatedAt }),
      },
    );
  },

  /**
   * Closes an active published donation request.
   */
  closeDonationRequest: async (
    token: string,
    id: string,
    expectedUpdatedAt?: string,
  ): Promise<{ message: string; request: AdminDonationRequestDetail }> => {
    return apiRequest<{ message: string; request: AdminDonationRequestDetail }>(
      `admin/donation-requests/${encodeURIComponent(id)}/close`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ expectedUpdatedAt }),
      },
    );
  },

  /**
   * Fetches paginated donor responses for a donation request.
   */
  getDonationRequestResponses: async (
    token: string,
    id: string,
    params: { page?: number; limit?: number } = {},
  ): Promise<AdminDonorResponsesResponse> => {
    const query = new URLSearchParams();
    if (params.page) query.append('page', String(params.page));
    if (params.limit) query.append('limit', String(params.limit));

    const path = `admin/donation-requests/${encodeURIComponent(id)}/responses${query.toString() ? `?${query.toString()}` : ''}`;
    return apiRequest<AdminDonorResponsesResponse>(path, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

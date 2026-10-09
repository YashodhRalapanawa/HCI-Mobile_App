import { API_BASE_URL, apiRequest } from '@/services/api';
import type {
  AdminSummaryResponse,
  AdminPatientRequestsResponse,
  AdminPatientRequestDetail,
  AdminRequestStatusFilter,
  AssignDeliveryPayload,
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
};

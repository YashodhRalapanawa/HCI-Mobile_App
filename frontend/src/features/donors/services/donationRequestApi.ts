import { apiRequest } from '@/services/api';
import type {
  DonationAcceptResponse,
  DonationRequestDetailResponse,
  DonationRequestsResponse,
  MyAcceptedRequestsResponse,
} from '../types';

export const donationRequestApi = {
  /**
   * Fetches the paginated list of published, available donation requests.
   * Requires authenticated donor bearer token.
   */
  getPublishedRequests: async (
    token: string,
    page = 1,
    limit = 10,
  ): Promise<DonationRequestsResponse> => {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    }).toString();

    return apiRequest<DonationRequestsResponse>(`donation-requests?${query}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Fetches the details of a single donation request including current donor's response.
   * Requires authenticated donor bearer token.
   */
  getRequestDetails: async (
    token: string,
    id: string,
  ): Promise<DonationRequestDetailResponse> => {
    return apiRequest<DonationRequestDetailResponse>(`donation-requests/${id}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Records the donor's willingness to donate for a published request ("I CAN DONATE").
   * Server derives donor identity and timestamp.
   */
  acceptDonationRequest: async (
    token: string,
    id: string,
  ): Promise<DonationAcceptResponse> => {
    return apiRequest<DonationAcceptResponse>(`donation-requests/${id}/accept`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  cancelDonationResponse: async (
    token: string,
    id: string,
  ): Promise<{ message: string }> => {
    return apiRequest<{ message: string }>(`donation-requests/${id}/accept`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },

  /**
   * Fetches the paginated list of donation requests the authenticated donor has offered to donate for.
   * Requires authenticated donor bearer token.
   */
  getMyAcceptedRequests: async (
    token: string,
    page = 1,
    limit = 10,
  ): Promise<MyAcceptedRequestsResponse> => {
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    }).toString();

    return apiRequest<MyAcceptedRequestsResponse>(`donation-requests/my-accepted?${query}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

import { apiRequest } from '@/services/api';
import type { DonationRequestsResponse } from '../types';

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
};

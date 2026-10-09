import { apiRequest } from '@/services/api';
import type { AdminSummaryResponse } from '../types';

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
};

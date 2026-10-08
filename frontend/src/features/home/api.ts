import { apiRequest } from '@/services/api';
import type { BloodGroup, HomeSummary } from '@/features/inventory/types';

export const homeApi = {
  getSummary: (params: { bloodGroup?: BloodGroup; lat?: number; lng?: number } = {}) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
    return apiRequest<HomeSummary>(`inventory/summary?${query.toString()}`);
  },
};

import { apiRequest } from '@/services/api';
import type { Campaign } from './types';

export const campaignsApi = {
  list: (upcoming = true) => apiRequest<{ campaigns: Campaign[] }>(`campaigns?upcoming=${upcoming}`),
  get: (id: string) => apiRequest<{ campaign: Campaign }>(`campaigns/${id}`),
  register: (id: string, userId?: string) =>
    apiRequest<{ referenceNo: string }>(`campaigns/${id}/register`, {
      method: 'POST',
      body: JSON.stringify(userId ? { userId } : {}),
    }),
  cancelRegistration: (id: string, userId?: string) =>
    apiRequest<void>(`campaigns/${id}/register`, {
      method: 'DELETE',
      body: JSON.stringify(userId ? { userId } : {}),
    }),
};

import { apiRequest } from '@/services/api';
import type { BloodBank, BloodGroup } from './types';

interface BanksResponse { banks: BloodBank[] }
interface BankResponse { bank: BloodBank }

export const inventoryApi = {
  listBanks: (params: { lat?: number; lng?: number; radiusKm?: number; bloodGroup?: BloodGroup; filter?: 'nearest' | 'open' | 'high' }) => {
    const query = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined) query.set(key, String(value));
    });
    return apiRequest<BanksResponse>(`inventory/banks?${query.toString()}`);
  },
  getBank: (id: string) => apiRequest<BankResponse>(`inventory/banks/${id}`),
};

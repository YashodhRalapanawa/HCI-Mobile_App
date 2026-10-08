import type { HomeSummary } from '@/features/inventory/types';

export const mockHomeSummary: HomeSummary = {
  nearbyBanks: 3,
  highStockBanks: 2,
  lowStockBanks: 1,
  criticalAlerts: [{ bankId: 'demo-national-blood-bank', bankName: 'National Blood Bank Colombo', bloodGroup: 'B-', units: 4 }],
};

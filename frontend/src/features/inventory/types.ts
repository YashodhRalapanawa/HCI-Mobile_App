export type BloodGroup = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';
export type StockLevel = 'high' | 'medium' | 'low' | 'out';

export interface StockEntry {
  bloodGroup: BloodGroup;
  units: number;
  status: StockLevel;
}

export interface BloodBank {
  id: string;
  name: string;
  address: string;
  district: string;
  location: { type: 'Point'; coordinates: [number, number] };
  phone: string;
  email: string;
  openHours: string;
  isOpenNow: boolean;
  stock: StockEntry[];
  distanceKm: number | null;
  updatedAt: string;
}

export interface HomeSummary {
  nearbyBanks: number;
  highStockBanks: number;
  lowStockBanks: number;
  criticalAlerts: { bankId: string; bankName: string; bloodGroup: BloodGroup; units: number }[];
}

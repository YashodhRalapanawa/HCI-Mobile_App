import type { BloodBank } from './types';

export const mockBloodBanks: BloodBank[] = [
  {
    id: 'demo-national-blood-bank',
    name: 'National Blood Bank Colombo',
    address: '555/5, De Soysa Hospital Road, Colombo 10',
    district: 'Colombo',
    location: { type: 'Point', coordinates: [79.8662, 6.9271] },
    phone: '+94112691111',
    email: 'info@nbts.health.gov.lk',
    openHours: '08:00-18:00',
    isOpenNow: true,
    stock: [
      { bloodGroup: 'A+', units: 32, status: 'high' },
      { bloodGroup: 'O+', units: 45, status: 'high' },
      { bloodGroup: 'B-', units: 4, status: 'low' },
    ],
    distanceKm: 2.4,
    updatedAt: new Date().toISOString(),
  },
];

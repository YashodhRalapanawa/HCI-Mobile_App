import type { Campaign } from './types';

export const mockCampaigns: Campaign[] = [
  {
    id: 'demo-independence-drive',
    title: 'Independence Day Drive',
    description: 'Celebrate Sri Lanka by giving the gift of life.',
    imageUrl: '',
    venue: 'Viharamahadevi Park, Colombo',
    location: { type: 'Point', coordinates: [79.8612, 6.9147] },
    date: '2026-11-07T00:00:00.000Z',
    startTime: '09:00',
    endTime: '16:00',
    organizer: 'National Blood Transfusion Service',
    capacity: 150,
    registeredCount: 0,
    spotsRemaining: 150,
  },
];

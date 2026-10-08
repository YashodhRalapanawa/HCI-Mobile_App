import 'dotenv/config';
import { connectDatabase, disconnectDatabase } from '../../config/database.js';
import { env } from '../../config/env.js';
import { BloodBank } from './blood-bank.model.js';
import { Campaign } from '../campaigns/campaign.model.js';

const bloodBanks = [
  {
    name: 'National Blood Bank Colombo',
    address: '555/5, De Soysa Hospital Road, Colombo 10',
    district: 'Colombo',
    location: { type: 'Point' as const, coordinates: [79.8662, 6.9271] as [number, number] },
    phone: '+94112691111',
    email: 'info@nbts.health.gov.lk',
    openHours: '08:00-18:00',
    stock: [
      { bloodGroup: 'A+', units: 32 }, { bloodGroup: 'A-', units: 7 },
      { bloodGroup: 'B+', units: 24 }, { bloodGroup: 'B-', units: 4 },
      { bloodGroup: 'AB+', units: 12 }, { bloodGroup: 'AB-', units: 2 },
      { bloodGroup: 'O+', units: 45 }, { bloodGroup: 'O-', units: 6 },
    ],
  },
  {
    name: 'City Blood Centre',
    address: '21 Duplication Road, Colombo 03',
    district: 'Colombo',
    location: { type: 'Point' as const, coordinates: [79.8547, 6.8939] as [number, number] },
    phone: '+94112555555',
    email: 'contact@cityblood.lk',
    openHours: '09:00-17:00',
    stock: [
      { bloodGroup: 'A+', units: 18 }, { bloodGroup: 'A-', units: 5 },
      { bloodGroup: 'B+', units: 9 }, { bloodGroup: 'B-', units: 0 },
      { bloodGroup: 'AB+', units: 21 }, { bloodGroup: 'AB-', units: 3 },
      { bloodGroup: 'O+', units: 16 }, { bloodGroup: 'O-', units: 1 },
    ],
  },
  {
    name: 'General Hospital Blood Unit',
    address: 'Regent Street, Colombo 08',
    district: 'Colombo',
    location: { type: 'Point' as const, coordinates: [79.8737, 6.9147] as [number, number] },
    phone: '+94112691111',
    email: 'bloodunit@nhsl.health.gov.lk',
    openHours: '07:00-20:00',
    stock: [
      { bloodGroup: 'A+', units: 6 }, { bloodGroup: 'A-', units: 2 },
      { bloodGroup: 'B+', units: 28 }, { bloodGroup: 'B-', units: 5 },
      { bloodGroup: 'AB+', units: 8 }, { bloodGroup: 'AB-', units: 0 },
      { bloodGroup: 'O+', units: 22 }, { bloodGroup: 'O-', units: 4 },
    ],
  },
];

const campaigns = [
  {
    title: 'Independence Day Drive',
    description: 'Celebrate Sri Lanka by giving the gift of life.',
    imageUrl: '',
    venue: 'Viharamahadevi Park, Colombo',
    location: { type: 'Point' as const, coordinates: [79.8612, 6.9147] as [number, number] },
    date: new Date('2026-11-07T00:00:00.000Z'),
    startTime: '09:00',
    endTime: '16:00',
    organizer: 'National Blood Transfusion Service',
    capacity: 150,
    registeredCount: 0,
  },
  {
    title: 'University Blood Camp',
    description: 'A student-led donation camp open to the whole community.',
    imageUrl: '',
    venue: 'University of Colombo, College House',
    location: { type: 'Point' as const, coordinates: [79.8615, 6.9022] as [number, number] },
    date: new Date('2026-11-21T00:00:00.000Z'),
    startTime: '08:30',
    endTime: '15:00',
    organizer: 'University Health Society',
    capacity: 100,
    registeredCount: 0,
  },
  {
    title: 'National Donation Day',
    description: 'Join donors across the country for National Donation Day.',
    imageUrl: '',
    venue: 'BMICH, Bauddhaloka Mawatha, Colombo 07',
    location: { type: 'Point' as const, coordinates: [79.8771, 6.9067] as [number, number] },
    date: new Date('2026-12-12T00:00:00.000Z'),
    startTime: '08:00',
    endTime: '17:00',
    organizer: 'LifeLine LK Community',
    capacity: 300,
    registeredCount: 0,
  },
];

async function seed(): Promise<void> {
  if (!env.MONGODB_URI) {
    console.error('[seed] MONGODB_URI is required to seed Member 4 data.');
    process.exitCode = 1;
    return;
  }
  await connectDatabase(env.MONGODB_URI);
  await Promise.all(
    bloodBanks.map((bank) => BloodBank.findOneAndUpdate({ name: bank.name }, bank, { upsert: true, new: true })),
  );
  await Promise.all(
    campaigns.map((campaign) => Campaign.findOneAndUpdate({ title: campaign.title }, campaign, { upsert: true, new: true })),
  );
  console.log('[seed] Member 4 blood banks and campaigns seeded.');
}

try {
  await seed();
} finally {
  await disconnectDatabase();
}

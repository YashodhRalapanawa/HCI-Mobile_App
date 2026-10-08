import { BloodBank, getStockStatus, type BloodGroup, type BloodBankDocument } from './blood-bank.model.js';
import type { InventoryQuery } from './inventory.schema.js';

export class InventoryServiceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
  ) {
    super(message);
  }
}

function distanceKm(from: [number, number], to: [number, number]): number {
  const [fromLng, fromLat] = from;
  const [toLng, toLat] = to;
  const earthRadiusKm = 6371;
  const latitudeDelta = ((toLat - fromLat) * Math.PI) / 180;
  const longitudeDelta = ((toLng - fromLng) * Math.PI) / 180;
  const a =
    Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos((fromLat * Math.PI) / 180) *
      Math.cos((toLat * Math.PI) / 180) *
      Math.sin(longitudeDelta / 2) ** 2;
  return earthRadiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function stockFor(bank: BloodBankDocument, bloodGroup?: BloodGroup) {
  const entries = bloodGroup ? bank.stock.filter((entry) => entry.bloodGroup === bloodGroup) : bank.stock;
  return entries.map((entry) => ({
    bloodGroup: entry.bloodGroup,
    units: entry.units,
    status: getStockStatus(entry.units),
  }));
}

function serializeBank(bank: BloodBankDocument, query: InventoryQuery) {
  const distance =
    query.lat !== undefined && query.lng !== undefined
      ? distanceKm([query.lng, query.lat], bank.location.coordinates)
      : undefined;
  return {
    id: bank._id.toString(),
    name: bank.name,
    address: bank.address,
    district: bank.district,
    location: bank.location,
    phone: bank.phone,
    email: bank.email,
    openHours: bank.openHours,
    isOpenNow: bank.isOpenNow,
    stock: stockFor(bank, query.bloodGroup),
    distanceKm: distance === undefined ? null : Number(distance.toFixed(2)),
    updatedAt: bank.updatedAt.toISOString(),
  };
}

export async function listBanks(query: InventoryQuery) {
  const banks = await BloodBank.find().sort({ name: 1 });
  const filtered = banks
    .map((bank) => ({ bank, result: serializeBank(bank, query) }))
    .filter(({ result }) => {
      if (query.lat === undefined || query.lng === undefined) return true;
      return result.distanceKm !== null && result.distanceKm <= query.radiusKm;
    })
    .filter(({ result }) => {
      if (query.filter === 'open') return result.isOpenNow;
      if (query.filter === 'high') return result.stock.some((entry) => entry.status === 'high');
      return true;
    })
    .sort((left, right) => {
      if (left.result.distanceKm === null) return 1;
      if (right.result.distanceKm === null) return -1;
      return left.result.distanceKm - right.result.distanceKm;
    });
  return filtered.map(({ result }) => result);
}

export async function getBank(id: string) {
  const bank = await BloodBank.findById(id);
  if (!bank) throw new InventoryServiceError('BANK_NOT_FOUND', 'Blood bank was not found.', 404);
  return serializeBank(bank, { filter: 'nearest', radiusKm: 25 });
}

export async function getSummary(bloodGroup: BloodGroup | undefined, lat?: number, lng?: number) {
  const banks = await listBanks({ bloodGroup, lat, lng, radiusKm: 25, filter: 'nearest' });
  const selected = banks.map((bank) => ({
    bank,
    stock: bloodGroup ? bank.stock : bank.stock,
  }));
  const highStockBanks = selected.filter(({ stock }) => stock.some((entry) => entry.status === 'high')).length;
  const lowStockBanks = selected.filter(({ stock }) => stock.some((entry) => entry.status === 'low')).length;
  const criticalAlerts = selected.flatMap(({ bank, stock }) =>
    stock
      .filter((entry) => entry.units < 5)
      .map((entry) => ({ bankId: bank.id, bankName: bank.name, bloodGroup: entry.bloodGroup, units: entry.units })),
  );
  return { nearbyBanks: banks.length, highStockBanks, lowStockBanks, criticalAlerts };
}

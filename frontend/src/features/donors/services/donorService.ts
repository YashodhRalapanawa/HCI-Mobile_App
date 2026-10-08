import { apiRequest } from '@/services/api';
import type { BloodGroup, ChatMessage, Donor, DonorRequest, NotificationItem, SavedSearch } from '../types';

const mockDonors: Donor[] = [
  { id: 'mock-donor-1', name: 'Nimal Perera', avatarInitials: 'NP', distanceKm: 2.1, bloodGroup: 'O+', eligible: true, available: true, lastDonation: null },
  { id: 'mock-donor-2', name: 'Sanduni Silva', avatarInitials: 'SS', distanceKm: 4.8, bloodGroup: 'O+', eligible: true, available: false, lastDonation: new Date(Date.now() - 50 * 86400000).toISOString() },
];
let localSearches: SavedSearch[] = [];
let localRequests: DonorRequest[] = [];
let localNotifications: NotificationItem[] = [];
let localMessages: ChatMessage[] = [];
async function fallback<T>(remote: () => Promise<T>, local: () => T): Promise<T> { try { return await remote(); } catch { return local(); } }
function authInit(token: string | null, init: RequestInit = {}): RequestInit { return { ...init, headers: { ...(init.headers ?? {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) } }; }

export const donorService = {
  search: (token: string | null, params: { bloodGroup: BloodGroup; radiusKm: number; eligibleOnly: boolean; availableNow: boolean }) =>
    fallback(() => apiRequest<{ donors: Donor[] }>(`donors/search?bloodGroup=${encodeURIComponent(params.bloodGroup)}&radiusKm=${params.radiusKm}&eligibleOnly=${params.eligibleOnly}&availableNow=${params.availableNow}`, authInit(token)).then((r) => r.donors),
      () => mockDonors.filter((d) => d.bloodGroup === params.bloodGroup && d.distanceKm <= params.radiusKm && (!params.eligibleOnly || d.eligible) && (!params.availableNow || d.available))),
  listSearches: (token: string | null) => fallback(() => apiRequest<{ searches: SavedSearch[] }>('saved-searches', authInit(token)).then((r) => r.searches), () => localSearches),
  saveSearch: (token: string | null, body: Omit<SavedSearch, '_id'>, id?: string) => fallback(() => apiRequest<{ search: SavedSearch }>(id ? `saved-searches/${id}` : 'saved-searches', authInit(token, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) })).then((r) => r.search), () => { const item = { ...body, _id: id ?? `local-${Date.now()}` }; localSearches = id ? localSearches.map((s) => s._id === id ? item : s) : [item, ...localSearches]; return item; }),
  deleteSearch: (token: string | null, id: string) => fallback(() => apiRequest<void>(`saved-searches/${id}`, authInit(token, { method: 'DELETE' })).then(() => undefined), () => { localSearches = localSearches.filter((s) => s._id !== id); }),
  listRequests: (token: string | null) => fallback(() => apiRequest<{ requests: DonorRequest[] }>('requests', authInit(token)).then((r) => r.requests), () => localRequests),
  request: (token: string | null, donorId: string) => fallback(() => apiRequest<{ request: DonorRequest }>('requests', authInit(token, { method: 'POST', body: JSON.stringify({ donorId }) })).then((r) => r.request), () => { const r = { id: `local-${Date.now()}`, donorId, status: 'pending' }; localRequests = [r, ...localRequests]; return r; }),
  cancelRequest: (token: string | null, donorId: string) => fallback(() => apiRequest<void>(`requests/${donorId}`, authInit(token, { method: 'DELETE' })).then(() => undefined), () => { localRequests = localRequests.filter((r) => r.donorId !== donorId); }),
  listNotifications: (token: string | null) => fallback(() => apiRequest<{ notifications: NotificationItem[] }>('notifications', authInit(token)).then((r) => r.notifications), () => localNotifications),
  readNotification: (token: string | null, id: string) => fallback(() => apiRequest<void>(`notifications/${id}/read`, authInit(token, { method: 'PATCH' })).then(() => undefined), () => { localNotifications = localNotifications.map((n) => n._id === id ? { ...n, read: true } : n); }),
  readAll: (token: string | null) => fallback(() => apiRequest<void>('notifications/read-all', authInit(token, { method: 'PATCH' })).then(() => undefined), () => { localNotifications = localNotifications.map((n) => ({ ...n, read: true })); }),
  respond: (token: string | null, id: string, response: 'accepted' | 'declined') => fallback(() => apiRequest<void>(`notifications/${id}/respond`, authInit(token, { method: 'POST', body: JSON.stringify({ response }) })).then(() => undefined), () => undefined),
  deleteNotification: (token: string | null, id: string) => fallback(() => apiRequest<void>(`notifications/${id}`, authInit(token, { method: 'DELETE' })).then(() => undefined), () => { localNotifications = localNotifications.filter((n) => n._id !== id); }),
  getChat: (token: string | null, donorId: string) => fallback(() => apiRequest<{ chat: { id: string } }>('chats', authInit(token, { method: 'POST', body: JSON.stringify({ donorId }) })).then((r) => r.chat.id), () => 'local-chat'),
  messages: (token: string | null, chatId: string) => fallback(() => apiRequest<{ messages: ChatMessage[] }>(`chats/${chatId}/messages`, authInit(token)).then((r) => r.messages), () => localMessages),
  sendMessage: (token: string | null, chatId: string, text: string) => fallback(() => apiRequest<{ message: ChatMessage }>(`chats/${chatId}/messages`, authInit(token, { method: 'POST', body: JSON.stringify({ text }) })).then((r) => r.message), () => { const m = { _id: `local-${Date.now()}`, senderId: 'me', text: text.trim(), createdAt: new Date().toISOString() }; localMessages = [...localMessages, m]; return m; }),
  editMessage: (token: string | null, chatId: string, messageId: string, text: string) => fallback(() => apiRequest<{ message: ChatMessage }>(`chats/${chatId}/messages/${messageId}`, authInit(token, { method: 'PATCH', body: JSON.stringify({ text }) })).then((r) => r.message), () => { localMessages = localMessages.map((m) => m._id === messageId ? { ...m, text } : m); return localMessages.find((m) => m._id === messageId)!; }),
  deleteMessage: (token: string | null, chatId: string, messageId: string) => fallback(() => apiRequest<void>(`chats/${chatId}/messages/${messageId}`, authInit(token, { method: 'DELETE' })).then(() => undefined), () => { localMessages = localMessages.filter((m) => m._id !== messageId); }),
  startCall: (token: string | null, donorId: string) => apiRequest<{ proxyNumber: string; expiresAt: string }>('calls/start', authInit(token, { method: 'POST', body: JSON.stringify({ donorId }) })),
};

/**
 * Minimal API helper using the built-in fetch.
 *
 * EXPO_PUBLIC_API_URL must be the backend base URL *including* `/api`,
 * e.g. http://192.168.1.20:5000/api. EXPO_PUBLIC_* values are embedded in the
 * app bundle and are visible to users — never put secrets here.
 */
import { Platform } from 'react-native';

const rawBaseUrl = process.env.EXPO_PUBLIC_API_URL;
let resolvedUrl = rawBaseUrl ? rawBaseUrl.replace(/\/+$/, '') : 'http://localhost:5000/api';
if (Platform.OS === 'web' && resolvedUrl.includes('10.0.2.2')) {
  resolvedUrl = resolvedUrl.replace('10.0.2.2', 'localhost');
}

export const API_BASE_URL: string = resolvedUrl;

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  if (!API_BASE_URL) {
    throw new Error('EXPO_PUBLIC_API_URL is not set. Copy frontend/.env.example to frontend/.env.');
  }

  const url = `${API_BASE_URL}/${path.replace(/^\/+/, '')}`;
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body !== undefined && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, { ...init, headers });
  const text = await response.text();
  let body: unknown = undefined;
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!response.ok) {
    throw new ApiError(`Request failed with status ${response.status}`, response.status, body);
  }
  return body as T;
}

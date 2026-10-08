import { useCallback, useEffect, useState } from 'react';
import { campaignsApi } from './api';
import { mockCampaigns } from './mock';
import type { Campaign } from './types';
import { ApiError } from '@/services/api';

export function useCampaigns(upcoming = true) {
  const [data, setData] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineDemo, setIsOfflineDemo] = useState(false);
  const refetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await campaignsApi.list(upcoming);
      setData(response.campaigns); setIsOfflineDemo(false);
    } catch (cause) {
      console.error('[campaigns] List request failed:', cause);
      const demo = process.env.NODE_ENV !== 'production';
      setData(demo ? mockCampaigns : []); setIsOfflineDemo(demo);
      if (!demo) setError('Campaigns could not be loaded.');
    } finally { setLoading(false); }
  }, [upcoming]);
  useEffect(() => {
    const timer = setTimeout(() => void refetch(), 0);
    return () => clearTimeout(timer);
  }, [refetch]);
  return { data, loading, error, isOfflineDemo, refetch };
}

export function useCampaignRegistration() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineDemo, setIsOfflineDemo] = useState(false);
  const [referenceNo, setReferenceNo] = useState<string | null>(null);
  const register = useCallback(async (campaignId: string, userId?: string) => {
    setLoading(true); setError(null);
    try {
      const response = await campaignsApi.register(campaignId, userId);
      setReferenceNo(response.referenceNo); setIsOfflineDemo(false);
      return response.referenceNo;
    } catch (cause) {
      console.error('[campaigns] Registration request failed:', cause);
      if (cause instanceof ApiError && (cause.status === 400 || cause.status === 409)) {
        const body = cause.body;
        const message =
          typeof body === 'object' && body !== null && 'error' in body &&
          typeof body.error === 'object' && body.error !== null && 'message' in body.error &&
          typeof body.error.message === 'string'
            ? body.error.message
            : cause.status === 409 ? 'You are already registered for this campaign.' : 'This campaign is full.';
        setError(message);
        return null;
      }
      if (process.env.NODE_ENV !== 'production') {
        const demoReference = `DEMO-${campaignId}`;
        setReferenceNo(demoReference); setIsOfflineDemo(true);
        return demoReference;
      }
      setError('Registration could not be completed.'); return null;
    } finally { setLoading(false); }
  }, []);
  const cancel = useCallback(async (campaignId: string, userId?: string) => {
    setLoading(true); setError(null);
    try {
      await campaignsApi.cancelRegistration(campaignId, userId); setIsOfflineDemo(false); return true;
    } catch (cause) {
      console.error('[campaigns] Cancellation request failed:', cause);
      if (process.env.NODE_ENV !== 'production') { setIsOfflineDemo(true); return true; }
      setError('Registration could not be cancelled.'); return false;
    } finally { setLoading(false); }
  }, []);
  return { register, cancel, loading, error, isOfflineDemo, referenceNo };
}

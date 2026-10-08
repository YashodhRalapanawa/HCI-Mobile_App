import { useCallback, useEffect, useMemo, useState } from 'react';
import { homeApi } from './api';
import { mockHomeSummary } from './mock';
import type { HomeSummary } from './types';
import type { BloodGroup } from '@/features/inventory/types';

export function useHomeSummary(params: { bloodGroup?: BloodGroup; lat?: number; lng?: number } = {}) {
  const { bloodGroup, lat, lng } = params;
  const stableParams = useMemo(() => ({ bloodGroup, lat, lng }), [bloodGroup, lat, lng]);
  const [data, setData] = useState<HomeSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineDemo, setIsOfflineDemo] = useState(false);
  const refetch = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const response = await homeApi.getSummary(stableParams);
      setData(response); setIsOfflineDemo(false);
    } catch (cause) {
      console.error('[home] Summary request failed:', cause);
      const demo = process.env.NODE_ENV !== 'production';
      setData(demo ? mockHomeSummary : null); setIsOfflineDemo(demo);
      if (!demo) setError('The home summary could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, [stableParams]);
  useEffect(() => {
    const timer = setTimeout(() => void refetch(), 0);
    return () => clearTimeout(timer);
  }, [refetch]);
  return { data, loading, error, isOfflineDemo, refetch };
}

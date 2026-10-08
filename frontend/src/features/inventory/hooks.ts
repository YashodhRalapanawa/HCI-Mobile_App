import { useCallback, useEffect, useMemo, useState } from 'react';
import { inventoryApi } from './api';
import { mockBloodBanks } from './mock';
import type { BloodBank, BloodGroup } from './types';

const isDevelopment = process.env.NODE_ENV !== 'production';
type HookState<T> = { data: T; loading: boolean; error: string | null; isOfflineDemo: boolean };

export function useBloodBanks(params: Parameters<typeof inventoryApi.listBanks>[0] = {}) {
  const { bloodGroup, filter, lat, lng, radiusKm } = params;
  const stableParams = useMemo(() => ({ bloodGroup, filter, lat, lng, radiusKm }), [bloodGroup, filter, lat, lng, radiusKm]);
  const [state, setState] = useState<HookState<BloodBank[]>>({ data: [], loading: true, error: null, isOfflineDemo: false });
  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await inventoryApi.listBanks(stableParams);
      setState({ data: response.banks, loading: false, error: null, isOfflineDemo: false });
    } catch (cause) {
      console.error('[inventory] Banks request failed:', cause);
      setState({
        data: isDevelopment ? mockBloodBanks : [],
        loading: false,
        error: isDevelopment ? null : 'Blood banks could not be loaded.',
        isOfflineDemo: isDevelopment,
      });
    }
  }, [stableParams]);
  useEffect(() => {
    const timer = setTimeout(() => void refetch(), 0);
    return () => clearTimeout(timer);
  }, [refetch]);
  return { ...state, refetch };
}

export function useBloodBank(id: string) {
  const [state, setState] = useState<HookState<BloodBank | null>>({ data: null, loading: true, error: null, isOfflineDemo: false });
  const refetch = useCallback(async () => {
    setState((current) => ({ ...current, loading: true, error: null }));
    try {
      const response = await inventoryApi.getBank(id);
      setState({ data: response.bank, loading: false, error: null, isOfflineDemo: false });
    } catch (cause) {
      console.error('[inventory] Bank request failed:', cause);
      setState({
        data: isDevelopment ? mockBloodBanks.find((bank) => bank.id === id) ?? mockBloodBanks[0] ?? null : null,
        loading: false,
        error: isDevelopment ? null : 'Blood bank could not be loaded.',
        isOfflineDemo: isDevelopment,
      });
    }
  }, [id]);
  useEffect(() => {
    const timer = setTimeout(() => void refetch(), 0);
    return () => clearTimeout(timer);
  }, [refetch]);
  return { ...state, refetch };
}

export type { BloodGroup };

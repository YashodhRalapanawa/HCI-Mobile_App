import { useCallback, useState } from 'react';
import { susApi } from './api';
import { mockSusSubmission } from './mock';
import type { SusPayload, SusSubmission } from './types';

export function useSusSubmit() {
  const [data, setData] = useState<SusSubmission | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineDemo, setIsOfflineDemo] = useState(false);
  const submit = useCallback(async (payload: SusPayload) => {
    setLoading(true); setError(null);
    try {
      const response = await susApi.submit(payload);
      setData(response.response); setIsOfflineDemo(false); return response.response;
    } catch (cause) {
      console.error('[sus] Submission request failed:', cause);
      if (process.env.NODE_ENV !== 'production') {
        setData(mockSusSubmission); setIsOfflineDemo(true); return mockSusSubmission;
      }
      setError('Feedback could not be submitted.'); return null;
    } finally { setLoading(false); }
  }, []);
  return { submit, data, loading, error, isOfflineDemo };
}

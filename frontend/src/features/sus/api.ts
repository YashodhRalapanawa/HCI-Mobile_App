import { apiRequest } from '@/services/api';
import type { SusPayload, SusSubmission } from './types';

export const susApi = {
  submit: (payload: SusPayload) => apiRequest<{ response: SusSubmission }>('community/sus', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
};

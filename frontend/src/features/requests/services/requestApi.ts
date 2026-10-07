import { apiRequest } from '@/services/api';
import type { HospitalOption, CreatedRequestResponse, CreateRequestFormValues } from '../types';

export const requestApi = {
  getHospitals: async (): Promise<HospitalOption[]> => {
    const res = await apiRequest<{ hospitals: HospitalOption[] }>('requests/hospitals');
    return res.hospitals;
  },

  createRequest: async (
    token: string,
    values: CreateRequestFormValues,
  ): Promise<{ message: string; request: CreatedRequestResponse }> => {
    if (!values.document) {
      throw new Error('A hospital verification document is required.');
    }

    const formData = new FormData();
    formData.append('patientName', values.patientName.trim());
    formData.append('bloodGroup', values.bloodGroup);
    formData.append('unitsRequired', String(values.unitsRequired));
    formData.append('hospitalId', values.hospitalId);
    formData.append('hospitalReferenceAndWard', values.hospitalReferenceAndWard.trim());
    formData.append('urgency', values.urgency);

    // Support both Web (Blob/File) and Mobile (React Native URI object)
    if (typeof window !== 'undefined' && (values.document.file instanceof Blob || (typeof File !== 'undefined' && values.document.file instanceof File))) {
      formData.append('document', values.document.file, values.document.name);
    } else if (typeof window !== 'undefined' && values.document.uri && (values.document.uri.startsWith('blob:') || values.document.uri.startsWith('data:'))) {
      try {
        const fetched = await fetch(values.document.uri);
        const blob = await fetched.blob();
        formData.append('document', blob, values.document.name);
      } catch {
        const fileObj: any = {
          uri: values.document.uri,
          name: values.document.name,
          type: values.document.mimeType || 'application/octet-stream',
        };
        formData.append('document', fileObj);
      }
    } else {
      // React Native Mobile
      const fileObj: any = {
        uri: values.document.uri,
        name: values.document.name,
        type: values.document.mimeType || 'application/octet-stream',
      };
      formData.append('document', fileObj);
    }

    return apiRequest<{ message: string; request: CreatedRequestResponse }>('requests', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  },
};

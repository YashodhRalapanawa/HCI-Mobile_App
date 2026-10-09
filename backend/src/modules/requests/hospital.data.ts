export interface HospitalItem {
  id: string;
  name: string;
  district: string;
  isSample: true;
}

/**
 * Development-only hospital catalogue with stable identifiers.
 * In production, this would be backed by the National Blood Transfusion Service / Ministry of Health registry.
 */
export const SAMPLE_HOSPITALS: HospitalItem[] = [
  {
    id: 'hosp-colombo-city',
    name: 'City Hospital, Colombo',
    district: 'Colombo',
    isSample: true,
  },
  {
    id: 'hosp-nbts-narahenpita',
    name: 'National Blood Transfusion Service, Narahenpita',
    district: 'Colombo',
    isSample: true,
  },
  {
    id: 'hosp-cnh-colombo',
    name: 'Colombo National Hospital Blood Bank',
    district: 'Colombo',
    isSample: true,
  },
  {
    id: 'hosp-sjh-kotte',
    name: 'Sri Jayewardenepura General Hospital',
    district: 'Colombo',
    isSample: true,
  },
  {
    id: 'hosp-kandy-gen',
    name: 'Kandy National Hospital',
    district: 'Kandy',
    isSample: true,
  },
  {
    id: 'hosp-karapitiya-galle',
    name: 'Karapitiya Teaching Hospital, Galle',
    district: 'Galle',
    isSample: true,
  },
];

export function getHospitalById(id: string): HospitalItem | undefined {
  return SAMPLE_HOSPITALS.find((h) => h.id === id);
}

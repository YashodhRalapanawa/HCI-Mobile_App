import { z } from 'zod';
import { getHospitalById } from './hospital.data.js';

export const createBloodRequestSchema = z.object({
  patientName: z
    .string()
    .trim()
    .min(2, 'Patient name must be at least 2 characters')
    .max(100, 'Patient name cannot exceed 100 characters'),
  bloodGroup: z.enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const),
  unitsRequired: z.coerce
    .number()
    .int('Units must be a whole number')
    .min(1, 'At least 1 unit is required')
    .max(10, 'Development limit: maximum 10 units per request'),
  hospitalId: z
    .string()
    .trim()
    .min(1, 'Hospital location is required')
    .refine((id) => Boolean(getHospitalById(id)), 'Please select a valid hospital from the list'),
  hospitalReferenceAndWard: z
    .string()
    .trim()
    .min(2, 'Hospital reference / ward must be at least 2 characters')
    .max(150, 'Hospital reference / ward cannot exceed 150 characters'),
  urgency: z.enum(['Urgent', 'Scheduled'] as const),
});

export type CreateBloodRequestInput = z.infer<typeof createBloodRequestSchema>;

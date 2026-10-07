import { Router, type Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { SAMPLE_HOSPITALS, getHospitalById } from './hospital.data.js';
import { BloodRequest, type BloodRequestDocument } from './request.model.js';
import { createBloodRequestSchema } from './request.validation.js';
import {
  documentUpload,
  validateFileSignature,
  removeUploadedFile,
  MAX_FILE_SIZE_BYTES,
} from './upload.middleware.js';

export const requestRouter = Router();

function serializeRequest(reqDoc: BloodRequestDocument) {
  return {
    id: reqDoc._id.toString(),
    patientName: reqDoc.patientName,
    bloodGroup: reqDoc.bloodGroup,
    unitsRequired: reqDoc.unitsRequired,
    unitsFulfilled: reqDoc.unitsFulfilled,
    hospitalId: reqDoc.hospitalId,
    hospitalName: reqDoc.hospitalName,
    hospitalReferenceAndWard: reqDoc.hospitalReferenceAndWard,
    urgency: reqDoc.urgency,
    status: reqDoc.status,
    document: {
      originalName: reqDoc.document.originalName,
      mimeType: reqDoc.document.mimeType,
      sizeBytes: reqDoc.document.sizeBytes,
    },
    createdAt: reqDoc.createdAt.toISOString(),
  };
}

/**
 * GET /api/requests/hospitals
 * Public / authenticated lookup for development hospital catalogue.
 */
requestRouter.get('/hospitals', (_req, res: Response) => {
  res.status(200).json({
    hospitals: SAMPLE_HOSPITALS,
  });
});

/**
 * POST /api/requests
 * Creates a new blood request with document proof.
 * Authenticated via real JWT (authenticate middleware).
 */
requestRouter.post(
  '/',
  authenticate,
  (req: AuthenticatedRequest, res: Response, next) => {
    documentUpload.single('document')(req, res, (err) => {
      if (err) {
        if (err instanceof multer.MulterError) {
          if (err.code === 'LIMIT_FILE_SIZE') {
            res.status(400).json({
              message: `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_BYTES / (1024 * 1024)} MB.`,
            });
            return;
          }
          res.status(400).json({ message: `Upload error: ${err.message}` });
          return;
        }
        res.status(400).json({ message: err.message || 'Error uploading document' });
        return;
      }
      next();
    });
  },
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const uploadedFile = req.file;

    // 1. File presence check
    if (!uploadedFile) {
      res.status(400).json({
        message: 'A hospital verification document (PDF, JPG, or PNG) is required.',
      });
      return;
    }

    try {
      // 2. Validate file magic bytes signature
      const isSignatureValid = await validateFileSignature(uploadedFile.path);
      if (!isSignatureValid) {
        removeUploadedFile(uploadedFile.path);
        res.status(400).json({
          message:
            'Invalid file content. The uploaded document does not match a valid PDF, JPEG, or PNG format.',
        });
        return;
      }

      // 3. Validate request fields with Zod
      const parseResult = createBloodRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        removeUploadedFile(uploadedFile.path);
        const firstError = parseResult.error.issues[0]?.message || 'Invalid form data';
        res.status(400).json({
          message: firstError,
          errors: parseResult.error.flatten().fieldErrors,
        });
        return;
      }

      const validatedData = parseResult.data;
      const hospital = getHospitalById(validatedData.hospitalId);
      if (!hospital) {
        removeUploadedFile(uploadedFile.path);
        res.status(400).json({ message: 'Selected hospital could not be identified.' });
        return;
      }

      // 4. Server-enforced fields:
      // - requesterId derived exclusively from req.user!._id
      // - status is strictly 'pending_verification'
      // - unitsFulfilled is strictly 0
      const newRequest = new BloodRequest({
        requesterId: req.user!._id,
        patientName: validatedData.patientName,
        bloodGroup: validatedData.bloodGroup,
        unitsRequired: validatedData.unitsRequired,
        unitsFulfilled: 0,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        hospitalReferenceAndWard: validatedData.hospitalReferenceAndWard,
        urgency: validatedData.urgency,
        document: {
          originalName: uploadedFile.originalname,
          mimeType: uploadedFile.mimetype,
          sizeBytes: uploadedFile.size,
          storageKey: uploadedFile.filename,
        },
        status: 'pending_verification',
      });

      const savedRequest = await newRequest.save();

      res.status(201).json({
        message: 'Blood request submitted successfully and is awaiting hospital verification.',
        request: serializeRequest(savedRequest),
      });
    } catch (error) {
      removeUploadedFile(uploadedFile.path);
      console.error('[requests] Error creating request:', error);
      res.status(500).json({
        message: 'An error occurred while saving the blood request. Please try again.',
      });
    }
  },
);

/**
 * GET /api/requests/:id
 * Retrieves owner-protected blood request detail summary.
 * Authenticated via JWT. Checks requester ownership.
 */
requestRouter.get(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      if (!mongoose.isValidObjectId(id)) {
        res.status(400).json({ message: 'Invalid request ID format.' });
        return;
      }

      const bloodRequest = await BloodRequest.findById(id);
      if (!bloodRequest) {
        res.status(404).json({ message: 'Blood request not found.' });
        return;
      }

      // Enforce owner-only access: only the original requester can view this request confirmation
      if (bloodRequest.requesterId.toString() !== req.user!._id.toString()) {
        res.status(403).json({ message: 'You do not have permission to view this request.' });
        return;
      }

      res.status(200).json({
        request: serializeRequest(bloodRequest),
      });
    } catch (error) {
      console.error('[requests] Error fetching request by ID:', error);
      res.status(500).json({ message: 'An error occurred while fetching the blood request.' });
    }
  },
);

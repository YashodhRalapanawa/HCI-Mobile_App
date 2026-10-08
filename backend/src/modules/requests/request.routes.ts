import { Router, type Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { SAMPLE_HOSPITALS, getHospitalById } from './hospital.data.js';
import { BloodRequest, type BloodRequestDocument, type RequestStatus } from './request.model.js';
import { DonorAcceptance } from './donorAcceptance.model.js';
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

function serializeRequestSummary(reqDoc: BloodRequestDocument, acceptedDonorsCount: number = 0) {
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
    acceptedDonorsCount,
    createdAt: reqDoc.createdAt.toISOString(),
  };
}

/**
 * GET /api/requests/my
 * Retrieves authenticated user's blood requests list filtered by tab (active or completed).
 * Protected by authenticate middleware. Derives ownership exclusively from req.user._id.
 */
requestRouter.get(
  '/my',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const MAX_LIMIT = 50;
      const DEFAULT_LIMIT = 20;

      const tabParam = req.query.tab ? String(req.query.tab).toLowerCase() : 'active';
      if (tabParam !== 'active' && tabParam !== 'completed') {
        res.status(400).json({
          message: "Invalid tab parameter. Must be 'active' or 'completed'.",
        });
        return;
      }

      let page = 1;
      if (req.query.page !== undefined) {
        const parsedPage = Number(req.query.page);
        if (!Number.isInteger(parsedPage) || parsedPage < 1) {
          res.status(400).json({
            message: 'Invalid page number. Must be an integer greater than or equal to 1.',
          });
          return;
        }
        page = parsedPage;
      }

      let limit = DEFAULT_LIMIT;
      if (req.query.limit !== undefined) {
        const parsedLimit = Number(req.query.limit);
        if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
          res.status(400).json({
            message: 'Invalid limit number. Must be an integer greater than or equal to 1.',
          });
          return;
        }
        if (parsedLimit > MAX_LIMIT) {
          res.status(400).json({
            message: `Limit exceeds maximum allowed of ${MAX_LIMIT}.`,
          });
          return;
        }
        limit = parsedLimit;
      }

      const userId = req.user!._id;

      // Active tab: pending_verification, verified, in_progress
      // Completed tab: fulfilled only
      // Cancelled requests are excluded from both tabs
      const activeStatuses: RequestStatus[] = ['pending_verification', 'verified', 'in_progress'];
      const completedStatuses: RequestStatus[] = ['fulfilled'];

      const activeFilter: Record<string, unknown> = {
        requesterId: userId,
        status: { $in: activeStatuses },
      };
      const completedFilter: Record<string, unknown> = {
        requesterId: userId,
        status: { $in: completedStatuses },
      };

      const [activeCount, completedCount] = await Promise.all([
        BloodRequest.countDocuments(activeFilter),
        BloodRequest.countDocuments(completedFilter),
      ]);

      const currentFilter = tabParam === 'active' ? activeFilter : completedFilter;
      const total = tabParam === 'active' ? activeCount : completedCount;
      const skip = (page - 1) * limit;

      const items = await BloodRequest.find(currentFilter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit);

      const requestIds = items.map((item) => item._id);
      const acceptanceCounts = await DonorAcceptance.aggregate<{ _id: mongoose.Types.ObjectId; count: number }>([
        { $match: { requestId: { $in: requestIds }, status: 'accepted' } },
        { $group: { _id: '$requestId', count: { $sum: 1 } } },
      ]);
      const countMap = new Map<string, number>();
      for (const entry of acceptanceCounts) {
        countMap.set(entry._id.toString(), entry.count);
      }

      res.status(200).json({
        requests: items.map((item) =>
          serializeRequestSummary(
            item as unknown as BloodRequestDocument,
            countMap.get(item._id.toString()) || 0,
          ),
        ),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasNextPage: page * limit < total,
        },
        counts: {
          active: activeCount,
          completed: completedCount,
        },
      });
    } catch (error) {
      console.error('[requests] Error listing user requests:', error);
      res.status(500).json({
        message: 'An error occurred while loading your blood requests.',
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

/**
 * GET /api/requests/:id/acceptances
 * Retrieves owner-protected donor acceptance summaries for a blood request.
 * Authenticated via JWT. Validates ownership (req.user._id === bloodRequest.requesterId).
 * Returns only safe fields for Member 2.4 modal: safeDonorCode, status, acceptedAt.
 * Never exposes donor credentials, contact info, coordinates, or internal storage keys.
 * Strictly read-only: does not modify request status, unitsFulfilled, or donor records.
 */
requestRouter.get(
  '/:id/acceptances',
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

      // Enforce owner-only access: only the original requester can view acceptances
      if (bloodRequest.requesterId.toString() !== req.user!._id.toString()) {
        res.status(403).json({ message: 'You do not have permission to view acceptances for this request.' });
        return;
      }

      const acceptances = await DonorAcceptance.find({
        requestId: bloodRequest._id,
        status: 'accepted',
      }).sort({ createdAt: 1 });

      res.status(200).json({
        request: {
          id: bloodRequest._id.toString(),
          patientName: bloodRequest.patientName,
          bloodGroup: bloodRequest.bloodGroup,
          unitsRequired: bloodRequest.unitsRequired,
          unitsFulfilled: bloodRequest.unitsFulfilled,
          hospitalId: bloodRequest.hospitalId,
          hospitalName: bloodRequest.hospitalName,
          hospitalReferenceAndWard: bloodRequest.hospitalReferenceAndWard,
          urgency: bloodRequest.urgency,
          status: bloodRequest.status,
          createdAt: bloodRequest.createdAt.toISOString(),
        },
        acceptances: acceptances.map((acc) => ({
          id: acc._id.toString(),
          safeDonorCode: acc.safeDonorCode,
          status: acc.status,
          acceptedAt: acc.createdAt.toISOString(),
        })),
        count: acceptances.length,
      });
    } catch (error) {
      console.error('[requests] Error fetching acceptances:', error);
      res.status(500).json({ message: 'An error occurred while fetching donor acceptances.' });
    }
  },
);

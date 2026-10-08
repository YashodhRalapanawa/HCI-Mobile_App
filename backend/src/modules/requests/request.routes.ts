import path from 'node:path';
import { Router, type Response } from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { SAMPLE_HOSPITALS, getHospitalById } from './hospital.data.js';
import {
  BloodRequest,
  type BloodRequestDocument,
  type RequestDocumentMetadata,
  type RequestStatus,
} from './request.model.js';
import { DonorAcceptance } from './donorAcceptance.model.js';
import { createBloodRequestSchema } from './request.validation.js';
import {
  documentUpload,
  validateFileSignature,
  removeUploadedFile,
  MAX_FILE_SIZE_BYTES,
  UPLOAD_DIR,
} from './upload.middleware.js';

interface RequestWithExistingDoc extends AuthenticatedRequest {
  existingBloodRequest?: BloodRequestDocument;
}

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
    deliveryAssignment: reqDoc.deliveryAssignment
      ? {
          assignmentId: reqDoc.deliveryAssignment.assignmentId,
          deliveryPersonName: reqDoc.deliveryAssignment.deliveryPersonName,
          contactPhone: reqDoc.deliveryAssignment.contactPhone,
          assignedAt: reqDoc.deliveryAssignment.assignedAt.toISOString(),
        }
      : null,
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
    hasDeliveryAssignment: Boolean(reqDoc.deliveryAssignment?.assignmentId),
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
 * PATCH /api/requests/:id
 * Updates an existing blood request owned by the authenticated requester.
 * Allowed strictly if status is 'pending_verification'.
 * Re-validates all fields against catalogue and schema.
 * Supports optional replacement of verification document with cleanup.
 * Atomic condition guarantees hospital verification cannot be overwritten.
 */
requestRouter.patch(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response, next): Promise<void> => {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid request ID format.' });
      return;
    }
    try {
      const existingRequest = await BloodRequest.findById(id);
      if (!existingRequest) {
        res.status(404).json({ message: 'Blood request not found.' });
        return;
      }
      if (existingRequest.requesterId.toString() !== req.user!._id.toString()) {
        res.status(403).json({ message: 'You do not have permission to edit this request.' });
        return;
      }
      if (existingRequest.status !== 'pending_verification') {
        res.status(409).json({
          message: 'This request is no longer editable as it has already been processed by the hospital.',
        });
        return;
      }
      (req as RequestWithExistingDoc).existingBloodRequest = existingRequest;
      next();
    } catch (error) {
      console.error('[requests] Error verifying edit eligibility:', error);
      res.status(500).json({ message: 'An error occurred while verifying request eligibility.' });
    }
  },
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
    const existingRequest = (req as RequestWithExistingDoc).existingBloodRequest as BloodRequestDocument;

    try {
      // 2. Validate replacement file if provided
      let newDocumentMeta: RequestDocumentMetadata | null = null;
      if (uploadedFile) {
        const isSignatureValid = await validateFileSignature(uploadedFile.path);
        if (!isSignatureValid) {
          removeUploadedFile(uploadedFile.path);
          res.status(400).json({
            message:
              'Invalid file content. The uploaded document does not match a valid PDF, JPEG, or PNG format.',
          });
          return;
        }

        newDocumentMeta = {
          originalName: uploadedFile.originalname,
          mimeType: uploadedFile.mimetype,
          sizeBytes: uploadedFile.size,
          storageKey: uploadedFile.filename,
        };
      }

      // 3. Validate form fields with Zod
      const parseResult = createBloodRequestSchema.safeParse(req.body);
      if (!parseResult.success) {
        if (uploadedFile) removeUploadedFile(uploadedFile.path);
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
        if (uploadedFile) removeUploadedFile(uploadedFile.path);
        res.status(400).json({ message: 'Selected hospital could not be identified.' });
        return;
      }

      // 4. Atomic conditional update enforcing ownership and pending status
      const previousStorageKey = existingRequest.document?.storageKey;
      const updateFields: Record<string, unknown> = {
        patientName: validatedData.patientName,
        bloodGroup: validatedData.bloodGroup,
        unitsRequired: validatedData.unitsRequired,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        hospitalReferenceAndWard: validatedData.hospitalReferenceAndWard,
        urgency: validatedData.urgency,
      };

      if (newDocumentMeta) {
        updateFields.document = newDocumentMeta;
      }

      const updatedRequest = await BloodRequest.findOneAndUpdate(
        {
          _id: existingRequest._id,
          requesterId: req.user!._id,
          status: 'pending_verification',
        },
        { $set: updateFields },
        { returnDocument: 'after', runValidators: true },
      );

      if (!updatedRequest) {
        if (uploadedFile) removeUploadedFile(uploadedFile.path);
        res.status(409).json({
          message: 'This request is no longer editable as it has already been processed by the hospital.',
        });
        return;
      }

      // 5. Clean up old document file only AFTER successful update
      if (newDocumentMeta && previousStorageKey) {
        try {
          const oldFilePath = path.join(UPLOAD_DIR, previousStorageKey);
          removeUploadedFile(oldFilePath);
        } catch (cleanupErr) {
          console.warn('[requests] Warning: could not delete previous document file:', cleanupErr);
        }
      }

      res.status(200).json({
        message: 'Blood request updated successfully.',
        request: serializeRequest(updatedRequest),
      });
    } catch (error) {
      if (uploadedFile) removeUploadedFile(uploadedFile.path);
      console.error('[requests] Error updating request:', error);
      res.status(500).json({
        message: 'An error occurred while updating the blood request. Please try again.',
      });
    }
  },
);

/**
 * DELETE /api/requests/:id
 * Deletes a pending blood request owned by the authenticated requester.
 * Allowed strictly if status is 'pending_verification'.
 * Rejects deletion safely if dependent operational records (e.g. DonorAcceptance) exist.
 * Atomically verifies ownership and pending status during database removal.
 * Cleans up associated verification document from disk upon successful DB removal.
 */
requestRouter.delete(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      // 1. Valid request ID format
      if (!mongoose.isValidObjectId(id)) {
        res.status(400).json({ message: 'Invalid request ID format.' });
        return;
      }

      // 2. Fetch existing request for preliminary lifecycle inspection
      const existingRequest = await BloodRequest.findById(id);
      if (!existingRequest) {
        res.status(404).json({ message: 'Blood request not found.' });
        return;
      }

      // 3. Ownership check derived exclusively from authenticated user
      if (existingRequest.requesterId.toString() !== req.user!._id.toString()) {
        res.status(403).json({ message: 'You do not have permission to delete this request.' });
        return;
      }

      // 4. Status check: only pending_verification requests may be deleted
      if (existingRequest.status !== 'pending_verification') {
        res.status(409).json({
          message: 'This request cannot be deleted because it is no longer pending verification.',
        });
        return;
      }

      // 5. Inspect existing dependent operational relationships
      // If an unexpected acceptance or other dependent record exists, reject deletion safely
      const dependentAcceptance = await DonorAcceptance.findOne({ requestId: existingRequest._id });
      if (dependentAcceptance) {
        console.warn(
          `[requests] Lifecycle inconsistency: Request ${id} has dependent DonorAcceptance ${dependentAcceptance._id}. Rejecting deletion.`,
        );
        res.status(409).json({
          message: 'This request cannot be deleted because dependent operational donor records exist.',
        });
        return;
      }

      // 6. Atomic database deletion enforcing ownership and pending status
      const deletedRequest = await BloodRequest.findOneAndDelete({
        _id: existingRequest._id,
        requesterId: req.user!._id,
        status: 'pending_verification',
      });

      if (!deletedRequest) {
        res.status(409).json({
          message: 'This request cannot be deleted because it has already been processed by the hospital or changed status.',
        });
        return;
      }

      // 7. Associated document cleanup strictly within UPLOAD_DIR
      const storageKey = deletedRequest.document?.storageKey;
      if (storageKey) {
        try {
          const safeFilename = path.basename(storageKey);
          const resolvedPath = path.resolve(UPLOAD_DIR, safeFilename);
          if (resolvedPath.startsWith(UPLOAD_DIR)) {
            removeUploadedFile(resolvedPath);
          } else {
            console.warn(`[requests] Storage path traversal rejected for file cleanup: ${storageKey}`);
          }
        } catch (cleanupErr) {
          // If file cleanup fails after DB deletion, log failure safely; do not misreport that request exists
          console.warn('[requests] Warning: could not delete document file for deleted request:', cleanupErr);
        }
      }

      res.status(200).json({
        message: 'Blood request deleted successfully.',
        id: deletedRequest._id.toString(),
      });
    } catch (error) {
      console.error('[requests] Error deleting blood request:', error);
      res.status(500).json({
        message: 'An error occurred while deleting the blood request. Please try again.',
      });
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

/**
 * GET /api/requests/:id/delivery-assignment
 * Retrieves owner-protected delivery person assignment details for a blood request.
 * Authenticated via JWT. Validates ownership (req.user._id === bloodRequest.requesterId).
 * Returns assigned delivery person details along with saved hospital context.
 * Strictly read-only: does not modify request status or any database records.
 */
requestRouter.get(
  '/:id/delivery-assignment',
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

      // Enforce owner-only access: only the original requester can view delivery assignment
      if (bloodRequest.requesterId.toString() !== req.user!._id.toString()) {
        res.status(403).json({
          message: 'You do not have permission to view delivery assignment for this request.',
        });
        return;
      }

      if (!bloodRequest.deliveryAssignment) {
        res.status(200).json({
          deliveryAssignment: null,
          hospitalName: bloodRequest.hospitalName,
          hospitalReferenceAndWard: bloodRequest.hospitalReferenceAndWard,
          message: 'No delivery person assigned to this request yet.',
        });
        return;
      }

      res.status(200).json({
        deliveryAssignment: {
          assignmentId: bloodRequest.deliveryAssignment.assignmentId,
          deliveryPersonName: bloodRequest.deliveryAssignment.deliveryPersonName,
          contactPhone: bloodRequest.deliveryAssignment.contactPhone,
          assignedAt: bloodRequest.deliveryAssignment.assignedAt.toISOString(),
        },
        hospitalName: bloodRequest.hospitalName,
        hospitalReferenceAndWard: bloodRequest.hospitalReferenceAndWard,
      });
    } catch (error) {
      console.error('[requests] Error fetching delivery assignment:', error);
      res.status(500).json({
        message: 'An error occurred while fetching delivery assignment details.',
      });
    }
  },
);


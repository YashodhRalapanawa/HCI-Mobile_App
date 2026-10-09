import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Router, type Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../../middleware/auth.js';
import { BloodRequest, type BloodRequestDocument, type RequestStatus } from '../requests/request.model.js';
import { User } from '../users/user.model.js';
import { UPLOAD_DIR } from '../requests/upload.middleware.js';

export const adminPatientRequestRouter = Router();

// Apply auth + requireAdmin to every route in this router
adminPatientRequestRouter.use(authenticate, requireAdmin);

function serializeAdminRequest(reqDoc: BloodRequestDocument) {
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
    rejectionReason: reqDoc.rejectionReason || null,
    reviewedAt: reqDoc.reviewedAt ? reqDoc.reviewedAt.toISOString() : null,
    reviewedBy: reqDoc.reviewedBy ? reqDoc.reviewedBy.toString() : null,
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
          arrivalConfirmedAt: reqDoc.deliveryAssignment.arrivalConfirmedAt
            ? reqDoc.deliveryAssignment.arrivalConfirmedAt.toISOString()
            : null,
          isArrivalConfirmed: Boolean(reqDoc.deliveryAssignment.arrivalConfirmedAt),
        }
      : null,
    createdAt: reqDoc.createdAt.toISOString(),
    updatedAt: reqDoc.updatedAt.toISOString(),
  };
}

async function serializeAdminRequestDetail(requestDoc: BloodRequestDocument) {
  const [requester, reviewer] = await Promise.all([
    User.findById(requestDoc.requesterId, {
      name: 1,
      email: 1,
      phone: 1,
      bloodGroup: 1,
      district: 1,
      city: 1,
    }),
    requestDoc.reviewedBy
      ? User.findById(requestDoc.reviewedBy, { name: 1, email: 1 })
      : null,
  ]);

  return {
    ...serializeAdminRequest(requestDoc),
    requester: requester
      ? {
          id: requester._id.toString(),
          name: requester.name,
          email: requester.email,
          phone: requester.phone || '',
          district: requester.district,
          city: requester.city || '',
        }
      : {
          id: requestDoc.requesterId.toString(),
          name: 'Requester Unavailable',
          email: '',
          phone: '',
          district: '',
          city: '',
        },
    reviewer: reviewer
      ? {
          id: reviewer._id.toString(),
          name: reviewer.name,
          email: reviewer.email,
        }
      : null,
  };
}

/**
 * GET /api/admin/patient-requests
 * Paginated list of patient blood requests with search and status filtering.
 */
adminPatientRequestRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const MAX_LIMIT = 50;
    const DEFAULT_LIMIT = 10;

    let page = 1;
    if (req.query.page !== undefined) {
      const parsedPage = Number(req.query.page);
      if (!Number.isInteger(parsedPage) || parsedPage < 1) {
        res.status(400).json({ message: 'Invalid page number. Must be an integer >= 1.' });
        return;
      }
      page = parsedPage;
    }

    let limit = DEFAULT_LIMIT;
    if (req.query.limit !== undefined) {
      const parsedLimit = Number(req.query.limit);
      if (!Number.isInteger(parsedLimit) || parsedLimit < 1) {
        res.status(400).json({ message: 'Invalid limit. Must be an integer >= 1.' });
        return;
      }
      limit = Math.min(parsedLimit, MAX_LIMIT);
    }

    const filter: Record<string, unknown> = {};

    // 1. Status Filter
    const statusParam = req.query.status ? String(req.query.status).trim().toLowerCase() : 'all';
    const validStatuses: RequestStatus[] = [
      'pending_verification',
      'verified',
      'in_progress',
      'fulfilled',
      'cancelled',
      'rejected',
    ];

    if (statusParam !== 'all') {
      if (!validStatuses.includes(statusParam as RequestStatus)) {
        res.status(400).json({
          message: `Invalid status filter. Allowed values: all, ${validStatuses.join(', ')}`,
        });
        return;
      }
      filter.status = statusParam;
    }

    // 2. Safe Escaped Search
    if (req.query.search) {
      const searchRaw = String(req.query.search).trim();
      if (searchRaw.length > 100) {
        res.status(400).json({ message: 'Search query cannot exceed 100 characters.' });
        return;
      }
      if (searchRaw.length > 0) {
        const escaped = searchRaw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const searchRegex = new RegExp(escaped, 'i');

        const orConditions: Record<string, unknown>[] = [
          { patientName: searchRegex },
          { hospitalName: searchRegex },
          { hospitalReferenceAndWard: searchRegex },
        ];

        if (mongoose.isValidObjectId(searchRaw)) {
          orConditions.push({ _id: new mongoose.Types.ObjectId(searchRaw) });
        }

        filter.$or = orConditions;
      }
    }

    const skip = (page - 1) * limit;

    const [items, total, pendingCount, verifiedCount, inProgressCount, rejectedCount] = await Promise.all([
      BloodRequest.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      BloodRequest.countDocuments(filter),
      BloodRequest.countDocuments({ status: 'pending_verification' }),
      BloodRequest.countDocuments({ status: 'verified' }),
      BloodRequest.countDocuments({ status: 'in_progress' }),
      BloodRequest.countDocuments({ status: 'rejected' }),
    ]);

    res.status(200).json({
      requests: items.map(serializeAdminRequest),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
      },
      counts: {
        pending: pendingCount,
        verified: verifiedCount,
        inProgress: inProgressCount,
        rejected: rejectedCount,
      },
    });
  } catch (error) {
    console.error('[admin] Error fetching patient requests:', error);
    res.status(500).json({ message: 'Failed to load patient requests.' });
  }
});

/**
 * GET /api/admin/patient-requests/:id
 * Detailed record for review, including requester contact info.
 */
adminPatientRequestRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid request ID format.' });
      return;
    }

    const requestDoc = await BloodRequest.findById(id);
    if (!requestDoc) {
      res.status(404).json({ message: 'Blood request not found.' });
      return;
    }

    const detail = await serializeAdminRequestDetail(requestDoc);
    res.status(200).json({ request: detail });
  } catch (error) {
    console.error('[admin] Error fetching patient request detail:', error);
    res.status(500).json({ message: 'Failed to load request detail.' });
  }
});

/**
 * GET /api/admin/patient-requests/:id/document
 * Authenticated stream of the medical document.
 * Storage keys and filesystem paths are never exposed in JSON.
 */
adminPatientRequestRouter.get('/:id/document', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid request ID format.' });
      return;
    }

    const requestDoc = await BloodRequest.findById(id);
    if (!requestDoc) {
      res.status(404).json({ message: 'Blood request not found.' });
      return;
    }

    const storageKey = requestDoc.document?.storageKey;
    if (!storageKey) {
      res.status(404).json({ message: 'No document record attached to this request.' });
      return;
    }

    const safeFilename = path.basename(storageKey);
    const resolvedPath = path.resolve(UPLOAD_DIR, safeFilename);

    if (!resolvedPath.startsWith(UPLOAD_DIR) || !fs.existsSync(resolvedPath)) {
      res.status(404).json({ message: 'Verification document file not found on storage server.' });
      return;
    }

    const mimeType = requestDoc.document.mimeType || 'application/octet-stream';
    const originalName = requestDoc.document.originalName || safeFilename;

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(originalName)}"`);
    res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    fs.createReadStream(resolvedPath).pipe(res);
  } catch (error) {
    console.error('[admin] Error serving document:', error);
    res.status(500).json({ message: 'Failed to stream verification document.' });
  }
});

/**
 * POST /api/admin/patient-requests/:id/approve
 * Approves a pending request and transitions status to 'verified'.
 * Atomic conditional update guarantees concurrency safety against requester edits/deletions.
 */
adminPatientRequestRouter.post('/:id/approve', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid request ID format.' });
      return;
    }

    const { expectedUpdatedAt } = req.body || {};

    // 1. Lifecycle verification
    const existing = await BloodRequest.findById(id);
    if (!existing) {
      res.status(404).json({ message: 'Blood request not found.' });
      return;
    }

    if (existing.status !== 'pending_verification') {
      res.status(409).json({
        message: `This request is currently in '${existing.status}' status and cannot be approved. Only pending requests can be approved.`,
      });
      return;
    }

    if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      res.status(409).json({
        message: 'This request was modified by the requester since it was loaded. Please refresh the page before reviewing.',
      });
      return;
    }

    // 2. Atomic conditional approval
    const condition: Record<string, unknown> = {
      _id: id,
      status: 'pending_verification',
    };
    if (expectedUpdatedAt) {
      condition.updatedAt = new Date(expectedUpdatedAt);
    }

    const updated = await BloodRequest.findOneAndUpdate(
      condition,
      {
        $set: {
          status: 'verified',
          reviewedBy: req.user!._id,
          reviewedAt: new Date(),
        },
      },
      { returnDocument: 'after' as const },
    );

    if (!updated) {
      res.status(409).json({
        message: 'Review conflict: the request status or content changed concurrently. Please refresh the page.',
      });
      return;
    }

    const detail = await serializeAdminRequestDetail(updated);
    res.status(200).json({
      message: 'Blood request approved successfully. Request is now verified.',
      request: detail,
    });
  } catch (error) {
    console.error('[admin] Error approving patient request:', error);
    res.status(500).json({ message: 'Failed to approve request.' });
  }
});

/**
 * POST /api/admin/patient-requests/:id/reject
 * Rejects a pending request with a required, bounded reason.
 */
adminPatientRequestRouter.post('/:id/reject', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid request ID format.' });
      return;
    }

    const { reason, expectedUpdatedAt } = req.body || {};
    if (typeof reason !== 'string' || reason.trim().length < 3 || reason.trim().length > 300) {
      res.status(400).json({
        message: 'A rejection reason between 3 and 300 characters is required.',
      });
      return;
    }

    const trimmedReason = reason.trim();

    // 1. Lifecycle verification
    const existing = await BloodRequest.findById(id);
    if (!existing) {
      res.status(404).json({ message: 'Blood request not found.' });
      return;
    }

    if (existing.status !== 'pending_verification') {
      res.status(409).json({
        message: `This request is currently in '${existing.status}' status and cannot be rejected. Only pending requests can be rejected.`,
      });
      return;
    }

    if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      res.status(409).json({
        message: 'This request was modified by the requester since it was loaded. Please refresh the page before reviewing.',
      });
      return;
    }

    // 2. Atomic conditional rejection
    const condition: Record<string, unknown> = {
      _id: id,
      status: 'pending_verification',
    };
    if (expectedUpdatedAt) {
      condition.updatedAt = new Date(expectedUpdatedAt);
    }

    const updated = await BloodRequest.findOneAndUpdate(
      condition,
      {
        $set: {
          status: 'rejected',
          rejectionReason: trimmedReason,
          reviewedBy: req.user!._id,
          reviewedAt: new Date(),
        },
      },
      { returnDocument: 'after' as const },
    );

    if (!updated) {
      res.status(409).json({
        message: 'Review conflict: the request status or content changed concurrently. Please refresh the page.',
      });
      return;
    }

    const detail = await serializeAdminRequestDetail(updated);
    res.status(200).json({
      message: 'Blood request rejected.',
      request: detail,
    });
  } catch (error) {
    console.error('[admin] Error rejecting patient request:', error);
    res.status(500).json({ message: 'Failed to reject request.' });
  }
});

/**
 * POST /api/admin/patient-requests/:id/assign-delivery
 * Assigns or reassigns a delivery person contact record to an approved request.
 * - Allowed only for status 'verified' or 'in_progress'.
 * - Reassignment allowed only if current assignment has NO confirmed arrival.
 * - Atomic conditional update guarantees race conditions with patient arrival confirmation are safely rejected.
 */
adminPatientRequestRouter.post('/:id/assign-delivery', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid request ID format.' });
      return;
    }

    const { deliveryPersonName, contactPhone, expectedAssignmentId, confirmReassignment } = req.body || {};

    if (
      typeof deliveryPersonName !== 'string' ||
      deliveryPersonName.trim().length < 2 ||
      deliveryPersonName.trim().length > 100
    ) {
      res.status(400).json({ message: 'Delivery person name must be between 2 and 100 characters.' });
      return;
    }

    if (typeof contactPhone !== 'string') {
      res.status(400).json({ message: 'Valid contact phone number is required.' });
      return;
    }

    const phoneClean = contactPhone.trim().replace(/\s+/g, '');
    const phoneRegex = /^(\+94\d{9}|0\d{9})$/;
    if (!phoneRegex.test(phoneClean)) {
      res.status(400).json({
        message: 'Invalid contact phone number. Use standard 10-digit Sri Lanka mobile format (e.g. 0771234567 or +94771234567).',
      });
      return;
    }

    // 1. Lifecycle verification
    const existing = await BloodRequest.findById(id);
    if (!existing) {
      res.status(404).json({ message: 'Blood request not found.' });
      return;
    }

    if (!['verified', 'in_progress'].includes(existing.status)) {
      res.status(409).json({
        message: `Delivery personnel can only be assigned to approved requests. Current status is '${existing.status}'.`,
      });
      return;
    }

    const hasExistingAssignment = Boolean(existing.deliveryAssignment?.assignmentId);
    const now = new Date();

    if (hasExistingAssignment) {
      // Reassignment flow
      if (existing.deliveryAssignment?.arrivalConfirmedAt) {
        res.status(409).json({
          message: 'Cannot reassign delivery person because the requester has already confirmed delivery arrival.',
        });
        return;
      }

      if (!expectedAssignmentId || typeof expectedAssignmentId !== 'string') {
        res.status(400).json({
          message: 'Reassignment requires specifying the expected current assignment ID to prevent overwriting concurrent updates.',
        });
        return;
      }

      if (!confirmReassignment) {
        res.status(400).json({
          message: 'Please explicitly confirm that you want to replace the current delivery assignment.',
        });
        return;
      }

      if (existing.deliveryAssignment?.assignmentId !== expectedAssignmentId.trim()) {
        res.status(409).json({
          message: 'The current delivery assignment has changed. Please refresh the page before reassigning.',
        });
        return;
      }

      const newAssignmentId = `assign-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

      // Atomic conditional reassignment: enforces status, matching assignmentId, and NO arrival confirmation
      const updated = await BloodRequest.findOneAndUpdate(
        {
          _id: id,
          status: { $in: ['verified', 'in_progress'] },
          'deliveryAssignment.assignmentId': expectedAssignmentId.trim(),
          'deliveryAssignment.arrivalConfirmedAt': { $in: [null, undefined] },
        },
        {
          $set: {
            deliveryAssignment: {
              assignmentId: newAssignmentId,
              deliveryPersonName: deliveryPersonName.trim(),
              contactPhone: phoneClean,
              assignedAt: now,
              arrivalConfirmedAt: null,
              arrivalConfirmedBy: null,
            },
          },
        },
        { returnDocument: 'after' as const },
      );

      if (!updated) {
        const check = await BloodRequest.findById(id);
        if (check?.deliveryAssignment?.arrivalConfirmedAt) {
          res.status(409).json({
            message: 'Requester has just confirmed arrival of the delivery person. Reassignment was rejected.',
          });
          return;
        }
        res.status(409).json({
          message: 'Reassignment failed due to a concurrent update. Please refresh the page.',
        });
        return;
      }

      const detail = await serializeAdminRequestDetail(updated);
      res.status(200).json({
        message: 'Delivery person reassigned successfully.',
        request: detail,
      });
      return;
    }

    // Initial assignment flow
    const assignmentId = `assign-${Date.now()}-${crypto.randomBytes(4).toString('hex')}`;

    const updated = await BloodRequest.findOneAndUpdate(
      {
        _id: id,
        status: { $in: ['verified', 'in_progress'] },
        $or: [
          { deliveryAssignment: { $exists: false } },
          { deliveryAssignment: null },
          { 'deliveryAssignment.assignmentId': { $exists: false } },
          { 'deliveryAssignment.assignmentId': null },
        ],
      },
      {
        $set: {
          deliveryAssignment: {
            assignmentId,
            deliveryPersonName: deliveryPersonName.trim(),
            contactPhone: phoneClean,
            assignedAt: now,
            arrivalConfirmedAt: null,
            arrivalConfirmedBy: null,
          },
        },
      },
      { returnDocument: 'after' as const },
    );

    if (!updated) {
      res.status(409).json({
        message: 'Assignment conflict: this request may have already been assigned by another administrator. Please refresh.',
      });
      return;
    }

    const detail = await serializeAdminRequestDetail(updated);
    res.status(200).json({
      message: 'Delivery person assigned successfully.',
      request: detail,
    });
  } catch (error) {
    console.error('[admin] Error assigning delivery person:', error);
    res.status(500).json({ message: 'Failed to assign delivery person.' });
  }
});

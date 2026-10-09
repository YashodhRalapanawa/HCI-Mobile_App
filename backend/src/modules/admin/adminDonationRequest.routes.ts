import { Router, type Response } from 'express';
import mongoose from 'mongoose';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../../middleware/auth.js';
import { DonationRequest, type DonationRequestDocument, type DonationRequestPublicationStatus } from '../donors/donationRequest.model.js';
import { DonationResponse } from '../donors/donationResponse.model.js';
import { User, type BloodGroup } from '../users/user.model.js';
import { getHospitalById } from '../requests/hospital.data.js';

export const adminDonationRequestRouter = Router();

// Apply auth + requireAdmin to every route in this router
adminDonationRequestRouter.use(authenticate, requireAdmin);

const VALID_BLOOD_GROUPS: BloodGroup[] = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const VALID_URGENCIES = ['Urgent', 'Scheduled'] as const;

function serializeAdminDonationRequest(reqDoc: DonationRequestDocument) {
  return {
    id: reqDoc._id.toString(),
    bloodGroup: reqDoc.bloodGroup,
    unitsRequired: reqDoc.unitsRequired,
    hospitalId: reqDoc.hospitalId,
    hospitalName: reqDoc.hospitalName,
    locationDescription: reqDoc.locationDescription,
    urgency: reqDoc.urgency,
    neededBy: reqDoc.neededBy ? reqDoc.neededBy.toISOString() : null,
    status: reqDoc.status,
    publishedAt: reqDoc.publishedAt ? reqDoc.publishedAt.toISOString() : null,
    closedAt: reqDoc.closedAt ? reqDoc.closedAt.toISOString() : null,
    responseCount: reqDoc.responseCount,
    createdAt: reqDoc.createdAt.toISOString(),
    updatedAt: reqDoc.updatedAt.toISOString(),
  };
}

async function serializeAdminDonationRequestDetail(reqDoc: DonationRequestDocument) {
  const creator = reqDoc.createdByAdminId
    ? await User.findById(reqDoc.createdByAdminId, { name: 1, email: 1 })
    : null;

  return {
    ...serializeAdminDonationRequest(reqDoc),
    createdByAdmin: creator
      ? {
          id: creator._id.toString(),
          name: creator.name,
          email: creator.email,
        }
      : null,
  };
}

/**
 * GET /api/admin/donation-requests
 * Paginated list of donation requests with status filter and search.
 */
adminDonationRequestRouter.get('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
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
    const validStatuses: DonationRequestPublicationStatus[] = ['draft', 'published', 'closed'];

    if (statusParam !== 'all') {
      if (!validStatuses.includes(statusParam as DonationRequestPublicationStatus)) {
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
          { hospitalName: searchRegex },
          { locationDescription: searchRegex },
          { bloodGroup: searchRegex },
        ];

        if (mongoose.isValidObjectId(searchRaw)) {
          orConditions.push({ _id: new mongoose.Types.ObjectId(searchRaw) });
        }

        filter.$or = orConditions;
      }
    }

    const skip = (page - 1) * limit;

    const [items, total, draftCount, publishedCount, closedCount] = await Promise.all([
      DonationRequest.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit),
      DonationRequest.countDocuments(filter),
      DonationRequest.countDocuments({ status: 'draft' }),
      DonationRequest.countDocuments({ status: 'published' }),
      DonationRequest.countDocuments({ status: 'closed' }),
    ]);

    res.status(200).json({
      requests: items.map(serializeAdminDonationRequest),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
      },
      counts: {
        draft: draftCount,
        published: publishedCount,
        closed: closedCount,
      },
    });
  } catch (error) {
    console.error('[admin] Error fetching donation requests:', error);
    res.status(500).json({ message: 'Failed to load donation requests.' });
  }
});

/**
 * GET /api/admin/donation-requests/:id
 * Detailed record of a single donation request for review.
 */
adminDonationRequestRouter.get('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid donation request ID format.' });
      return;
    }

    const requestDoc = await DonationRequest.findById(id);
    if (!requestDoc) {
      res.status(404).json({ message: 'Donation request not found.' });
      return;
    }

    const detail = await serializeAdminDonationRequestDetail(requestDoc);
    res.status(200).json({ request: detail });
  } catch (error) {
    console.error('[admin] Error fetching donation request detail:', error);
    res.status(500).json({ message: 'Failed to load donation request detail.' });
  }
});

/**
 * POST /api/admin/donation-requests
 * Creates a new donation request as a draft.
 */
adminDonationRequestRouter.post('/', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { bloodGroup, unitsRequired, hospitalId, locationDescription, urgency, neededBy } = req.body || {};

    // 1. Validate Blood Group
    if (!bloodGroup || !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      res.status(400).json({
        message: `Invalid blood group. Allowed values: ${VALID_BLOOD_GROUPS.join(', ')}`,
      });
      return;
    }

    // 2. Validate Units
    const parsedUnits = Number(unitsRequired);
    if (!Number.isInteger(parsedUnits) || parsedUnits < 1 || parsedUnits > 100) {
      res.status(400).json({
        message: 'Units required must be an integer between 1 and 100.',
      });
      return;
    }

    // 3. Validate Hospital from Catalogue
    if (typeof hospitalId !== 'string' || !hospitalId.trim()) {
      res.status(400).json({ message: 'A hospital must be selected from the catalogue.' });
      return;
    }
    const hospital = getHospitalById(hospitalId.trim());
    if (!hospital) {
      res.status(400).json({
        message: 'Selected hospital is not recognized in the hospital catalogue.',
      });
      return;
    }

    // 4. Validate Location Description
    if (
      typeof locationDescription !== 'string' ||
      locationDescription.trim().length < 2 ||
      locationDescription.trim().length > 200
    ) {
      res.status(400).json({
        message: 'Location description must be between 2 and 200 characters.',
      });
      return;
    }

    // 5. Validate Urgency
    const chosenUrgency = urgency || 'Urgent';
    if (!VALID_URGENCIES.includes(chosenUrgency)) {
      res.status(400).json({
        message: `Urgency must be one of: ${VALID_URGENCIES.join(', ')}`,
      });
      return;
    }

    // 6. Validate NeededBy Date
    let parsedNeededBy: Date | null = null;
    if (neededBy !== undefined && neededBy !== null && neededBy !== '') {
      const d = new Date(neededBy);
      if (Number.isNaN(d.getTime())) {
        res.status(400).json({ message: 'Invalid needed-by date format.' });
        return;
      }
      if (d <= new Date()) {
        res.status(400).json({ message: 'Needed-by date must be set in the future.' });
        return;
      }
      parsedNeededBy = d;
    }

    // 7. Create as Draft
    const created = await DonationRequest.create({
      bloodGroup,
      unitsRequired: parsedUnits,
      hospitalId: hospital.id,
      hospitalName: hospital.name,
      locationDescription: locationDescription.trim(),
      urgency: chosenUrgency,
      neededBy: parsedNeededBy,
      status: 'draft',
      responseCount: 0,
      createdByAdminId: req.user!._id,
      publishedAt: null,
      closedAt: null,
    });

    const detail = await serializeAdminDonationRequestDetail(created);
    res.status(201).json({
      message: 'Donation request draft created successfully.',
      request: detail,
    });
  } catch (error) {
    console.error('[admin] Error creating donation request:', error);
    res.status(500).json({ message: 'Failed to create donation request.' });
  }
});

/**
 * PATCH /api/admin/donation-requests/:id
 * Edits an existing donation request draft.
 * Only draft requests can be edited.
 */
adminDonationRequestRouter.patch('/:id', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid donation request ID format.' });
      return;
    }

    const {
      bloodGroup,
      unitsRequired,
      hospitalId,
      locationDescription,
      urgency,
      neededBy,
      expectedUpdatedAt,
    } = req.body || {};

    const existing = await DonationRequest.findById(id);
    if (!existing) {
      res.status(404).json({ message: 'Donation request not found.' });
      return;
    }

    if (existing.status !== 'draft') {
      res.status(409).json({
        message: `Only draft donation requests can be edited. This request is currently in '${existing.status}' status.`,
      });
      return;
    }

    if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      res.status(409).json({
        message: 'This donation request was modified concurrently. Please refresh the page before editing.',
      });
      return;
    }

    const updateFields: Record<string, unknown> = {};

    if (bloodGroup !== undefined) {
      if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
        res.status(400).json({
          message: `Invalid blood group. Allowed values: ${VALID_BLOOD_GROUPS.join(', ')}`,
        });
        return;
      }
      updateFields.bloodGroup = bloodGroup;
    }

    if (unitsRequired !== undefined) {
      const parsedUnits = Number(unitsRequired);
      if (!Number.isInteger(parsedUnits) || parsedUnits < 1 || parsedUnits > 100) {
        res.status(400).json({
          message: 'Units required must be an integer between 1 and 100.',
        });
        return;
      }
      updateFields.unitsRequired = parsedUnits;
    }

    if (hospitalId !== undefined) {
      if (typeof hospitalId !== 'string' || !hospitalId.trim()) {
        res.status(400).json({ message: 'A hospital must be selected.' });
        return;
      }
      const hospital = getHospitalById(hospitalId.trim());
      if (!hospital) {
        res.status(400).json({ message: 'Selected hospital is not recognized in catalogue.' });
        return;
      }
      updateFields.hospitalId = hospital.id;
      updateFields.hospitalName = hospital.name;
    }

    if (locationDescription !== undefined) {
      if (
        typeof locationDescription !== 'string' ||
        locationDescription.trim().length < 2 ||
        locationDescription.trim().length > 200
      ) {
        res.status(400).json({
          message: 'Location description must be between 2 and 200 characters.',
        });
        return;
      }
      updateFields.locationDescription = locationDescription.trim();
    }

    if (urgency !== undefined) {
      if (!VALID_URGENCIES.includes(urgency)) {
        res.status(400).json({
          message: `Urgency must be one of: ${VALID_URGENCIES.join(', ')}`,
        });
        return;
      }
      updateFields.urgency = urgency;
    }

    if (neededBy !== undefined) {
      if (neededBy === null || neededBy === '') {
        updateFields.neededBy = null;
      } else {
        const d = new Date(neededBy);
        if (Number.isNaN(d.getTime())) {
          res.status(400).json({ message: 'Invalid needed-by date format.' });
          return;
        }
        if (d <= new Date()) {
          res.status(400).json({ message: 'Needed-by date must be set in the future.' });
          return;
        }
        updateFields.neededBy = d;
      }
    }

    // Atomic conditional update
    const condition: Record<string, unknown> = {
      _id: id,
      status: 'draft',
    };
    if (expectedUpdatedAt) {
      condition.updatedAt = new Date(expectedUpdatedAt);
    }

    const updated = await DonationRequest.findOneAndUpdate(
      condition,
      { $set: updateFields },
      { returnDocument: 'after' as const },
    );

    if (!updated) {
      res.status(409).json({
        message: 'Update conflict: the request status or content changed concurrently. Please refresh the page.',
      });
      return;
    }

    const detail = await serializeAdminDonationRequestDetail(updated);
    res.status(200).json({
      message: 'Donation request draft updated successfully.',
      request: detail,
    });
  } catch (error) {
    console.error('[admin] Error updating donation request draft:', error);
    res.status(500).json({ message: 'Failed to update donation request.' });
  }
});

/**
 * POST /api/admin/donation-requests/:id/publish
 * Transitions a draft request to published.
 * Validates that deadline is in the future.
 */
adminDonationRequestRouter.post('/:id/publish', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid donation request ID format.' });
      return;
    }

    const { expectedUpdatedAt } = req.body || {};

    const existing = await DonationRequest.findById(id);
    if (!existing) {
      res.status(404).json({ message: 'Donation request not found.' });
      return;
    }

    if (existing.status !== 'draft') {
      res.status(409).json({
        message: `Only draft donation requests can be published. Current status is '${existing.status}'.`,
      });
      return;
    }

    if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      res.status(409).json({
        message: 'This donation request was modified concurrently. Please refresh the page before publishing.',
      });
      return;
    }

    // Deadline check: reject if deadline is set and already in past
    if (existing.neededBy && new Date(existing.neededBy) <= new Date()) {
      res.status(400).json({
        message: 'Cannot publish a donation request with an expired deadline. Please update the needed-by date first.',
      });
      return;
    }

    const condition: Record<string, unknown> = {
      _id: id,
      status: 'draft',
    };
    if (expectedUpdatedAt) {
      condition.updatedAt = new Date(expectedUpdatedAt);
    }

    const now = new Date();
    const updated = await DonationRequest.findOneAndUpdate(
      condition,
      {
        $set: {
          status: 'published',
          publishedAt: now,
        },
      },
      { returnDocument: 'after' as const },
    );

    if (!updated) {
      res.status(409).json({
        message: 'Publish conflict: the request status was modified concurrently. Please refresh the page.',
      });
      return;
    }

    const detail = await serializeAdminDonationRequestDetail(updated);
    res.status(200).json({
      message: 'Donation request published successfully. Request is now visible to eligible blood donors.',
      request: detail,
    });
  } catch (error) {
    console.error('[admin] Error publishing donation request:', error);
    res.status(500).json({ message: 'Failed to publish donation request.' });
  }
});

/**
 * POST /api/admin/donation-requests/:id/close
 * Closes an active published donation request.
 * Coordinates atomically with donor acceptance transactions.
 */
adminDonationRequestRouter.post('/:id/close', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid donation request ID format.' });
      return;
    }

    const { expectedUpdatedAt } = req.body || {};

    const existing = await DonationRequest.findById(id);
    if (!existing) {
      res.status(404).json({ message: 'Donation request not found.' });
      return;
    }

    if (existing.status !== 'published') {
      res.status(409).json({
        message: `Only published donation requests can be closed. Current status is '${existing.status}'.`,
      });
      return;
    }

    if (expectedUpdatedAt && existing.updatedAt.toISOString() !== expectedUpdatedAt) {
      res.status(409).json({
        message: 'This donation request was modified concurrently. Please refresh the page before closing.',
      });
      return;
    }

    // Atomic closure write on DonationRequest:
    // If acceptance transaction runs concurrently, one will acquire document lock first.
    // If closure commits first, concurrent acceptance findOneAndUpdate({ status: 'published' }) matches 0 and aborts.
    // If acceptance commits first, responseCount is incremented, and this closure sets status: 'closed'.
    const condition: Record<string, unknown> = {
      _id: id,
      status: 'published',
    };
    if (expectedUpdatedAt) {
      condition.updatedAt = new Date(expectedUpdatedAt);
    }

    const now = new Date();
    const updated = await DonationRequest.findOneAndUpdate(
      condition,
      {
        $set: {
          status: 'closed',
          closedAt: now,
        },
      },
      { returnDocument: 'after' as const },
    );

    if (!updated) {
      res.status(409).json({
        message: 'Closure conflict: the request status was modified concurrently. Please refresh the page.',
      });
      return;
    }

    const detail = await serializeAdminDonationRequestDetail(updated);
    res.status(200).json({
      message: 'Donation request closed. It is no longer accepting new donor responses.',
      request: detail,
    });
  } catch (error) {
    console.error('[admin] Error closing donation request:', error);
    res.status(500).json({ message: 'Failed to close donation request.' });
  }
});

/**
 * GET /api/admin/donation-requests/:id/responses
 * Returns paginated donor willingness responses for a selected donation request.
 * Safe projections only: hides passwordHash, tokens, contact phone, and health records.
 */
adminDonationRequestRouter.get('/:id/responses', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      res.status(400).json({ message: 'Invalid donation request ID format.' });
      return;
    }

    const requestDoc = await DonationRequest.findById(id);
    if (!requestDoc) {
      res.status(404).json({ message: 'Donation request not found.' });
      return;
    }

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

    const skip = (page - 1) * limit;

    const [responses, total] = await Promise.all([
      DonationResponse.find({ donationRequestId: id })
        .sort({ acceptedAt: -1, _id: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      DonationResponse.countDocuments({ donationRequestId: id }),
    ]);

    // Batch resolve donor names safely without exposing sensitive profile or contact fields
    const donorIds = responses.map((r) => r.donorId);
    const donors = await User.find(
      { _id: { $in: donorIds } },
      { name: 1, bloodGroup: 1, district: 1 },
    ).lean();

    const donorMap = new Map(donors.map((d) => [d._id.toString(), d]));

    const mappedResponses = responses.map((r) => {
      const donor = donorMap.get(r.donorId.toString());
      return {
        responseId: r._id.toString(),
        donorId: r.donorId.toString(),
        donorName: donor ? donor.name : 'Anonymous Donor',
        donorBloodGroup: donor ? donor.bloodGroup : null,
        donorDistrict: donor ? donor.district : null,
        status: 'willing_to_donate' as const,
        acceptedAt: r.acceptedAt.toISOString(),
      };
    });

    res.status(200).json({
      responses: mappedResponses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
        hasNextPage: page * limit < total,
      },
    });
  } catch (error) {
    console.error('[admin] Error fetching donation responses:', error);
    res.status(500).json({ message: 'Failed to load donor responses.' });
  }
});

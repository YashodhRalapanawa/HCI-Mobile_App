import mongoose from 'mongoose';
import { Router, type Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { DonationRequest } from './donationRequest.model.js';
import { DonationResponse } from './donationResponse.model.js';

export const donationRequestRouter = Router();

/**
 * GET /api/donation-requests
 * Authenticated, donor-role authorized list of published donation requests.
 * Excludes draft, closed, and expired requests.
 * Uses deterministic descending order and safe field projection.
 * Strictly read-only: does not modify any database records.
 */
donationRequestRouter.get(
  '/',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      // 1. Enforce donor role authorization
      if (req.user?.role !== 'donor') {
        res.status(403).json({
          message: 'Access restricted to registered blood donors.',
        });
        return;
      }

      // 2. Validate and bound pagination parameters
      const rawPage = req.query.page;
      const rawLimit = req.query.limit;

      let page = 1;
      let limit = 10;

      if (rawPage !== undefined) {
        const parsedPage = Number(rawPage);
        if (!Number.isInteger(parsedPage) || parsedPage < 1) {
          res.status(400).json({ message: 'Page query parameter must be a positive integer.' });
          return;
        }
        page = parsedPage;
      }

      if (rawLimit !== undefined) {
        const parsedLimit = Number(rawLimit);
        if (!Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 50) {
          res.status(400).json({
            message: 'Limit query parameter must be an integer between 1 and 50.',
          });
          return;
        }
        limit = parsedLimit;
      }

      // 3. Build truthful query filter: only published requests whose needed-by deadline has not passed
      const now = new Date();
      const filter: Record<string, unknown> = {
        status: 'published',
        $or: [
          { neededBy: { $exists: false } },
          { neededBy: null },
          { neededBy: { $gte: now } },
        ],
      };

      const skip = (page - 1) * limit;

      // 4. Query total count and paginated items in parallel with deterministic sort
      const [total, items] = await Promise.all([
        DonationRequest.countDocuments(filter),
        DonationRequest.find(filter)
          .sort({ publishedAt: -1, createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
      ]);

      const totalPages = Math.ceil(total / limit) || 1;

      // 5. Safe projection: exclude internal patient links, admin creators, and internal IDs
      const safeRequests = items.map((doc) => ({
        id: doc._id.toString(),
        bloodGroup: doc.bloodGroup,
        unitsRequired: doc.unitsRequired,
        hospitalId: doc.hospitalId,
        hospitalName: doc.hospitalName,
        locationDescription: doc.locationDescription,
        urgency: doc.urgency,
        neededBy: doc.neededBy ? doc.neededBy.toISOString() : null,
        status: doc.status,
        publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : doc.createdAt.toISOString(),
        createdAt: doc.createdAt.toISOString(),
      }));

      res.status(200).json({
        requests: safeRequests,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
        },
      });
    } catch (error) {
      console.error('[donation-requests] Error fetching published requests:', error);
      res.status(500).json({
        message: 'An error occurred while loading donation requests.',
      });
    }
  },
);

/**
 * GET /api/donation-requests/:id
 * Authenticated, donor-role authorized detail endpoint.
 * Returns safe details of a donation request plus the current authenticated donor's response.
 * - Draft requests return 404.
 * - Published (and expired or closed) requests return safe details with an `isAvailable` boolean flag.
 */
donationRequestRouter.get(
  '/:id',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (req.user?.role !== 'donor') {
        res.status(403).json({
          message: 'Access restricted to registered blood donors.',
        });
        return;
      }

      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        res.status(400).json({ message: 'Invalid donation request ID format.' });
        return;
      }

      const doc = await DonationRequest.findById(id).lean();
      if (!doc || doc.status === 'draft') {
        res.status(404).json({ message: 'Donation request not found.' });
        return;
      }

      const now = new Date();
      const isPastDeadline = doc.neededBy ? new Date(doc.neededBy) < now : false;
      const isAvailable = doc.status === 'published' && !isPastDeadline;

      const existingResponse = await DonationResponse.findOne({
        donationRequestId: doc._id,
        donorId: req.user._id,
      }).lean();

      res.status(200).json({
        request: {
          id: doc._id.toString(),
          bloodGroup: doc.bloodGroup,
          unitsRequired: doc.unitsRequired,
          hospitalId: doc.hospitalId,
          hospitalName: doc.hospitalName,
          locationDescription: doc.locationDescription,
          urgency: doc.urgency,
          neededBy: doc.neededBy ? doc.neededBy.toISOString() : null,
          status: doc.status,
          publishedAt: doc.publishedAt ? doc.publishedAt.toISOString() : doc.createdAt.toISOString(),
          createdAt: doc.createdAt.toISOString(),
          isAvailable,
          donorResponse: existingResponse
            ? {
                status: existingResponse.status,
                acceptedAt: existingResponse.acceptedAt.toISOString(),
              }
            : null,
        },
      });
    } catch (error) {
      console.error('[donation-requests] Error fetching request details:', error);
      res.status(500).json({
        message: 'An error occurred while loading donation request details.',
      });
    }
  },
);

/**
 * POST /api/donation-requests/:id/accept
 * Authenticated, donor-role authorized action: "I CAN DONATE".
 * Records the donor's willingness to donate for a published, available request.
 * - Server derives donor identity and timestamp.
 * - Idempotent on repeat requests (returns existing acceptance with 200).
 * - E11000 race protection via unique compound index { donationRequestId: 1, donorId: 1 }.
 * - Closed/expired requests reject new acceptances with 400.
 */
donationRequestRouter.post(
  '/:id/accept',
  authenticate,
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      if (!req.user || req.user.role !== 'donor') {
        res.status(403).json({
          message: 'Access restricted to registered blood donors.',
        });
        return;
      }

      const { id } = req.params;
      if (!mongoose.isValidObjectId(id)) {
        res.status(400).json({ message: 'Invalid donation request ID format.' });
        return;
      }

      const donorId = req.user._id;

      // 1. Idempotency check: if this donor already accepted, return existing record
      const existing = await DonationResponse.findOne({
        donationRequestId: id,
        donorId,
      });

      if (existing) {
        res.status(200).json({
          message: 'You have already offered to donate for this request.',
          donorResponse: {
            status: existing.status,
            acceptedAt: existing.acceptedAt.toISOString(),
          },
        });
        return;
      }

      // 2. Fetch and verify request eligibility
      const now = new Date();
      const rawRequest = await DonationRequest.findById(id);

      if (!rawRequest || rawRequest.status === 'draft') {
        res.status(404).json({ message: 'Donation request not found.' });
        return;
      }

      if (rawRequest.status === 'closed') {
        res.status(400).json({
          message: 'This donation request is closed and is no longer accepting donations.',
        });
        return;
      }

      if (rawRequest.neededBy && new Date(rawRequest.neededBy) < now) {
        res.status(400).json({
          message: 'This donation request has expired and is no longer accepting donations.',
        });
        return;
      }

      // 3. Concurrency guard: Coordinate acceptance with DonationRequest using an ACID transaction
      // and conditional revision increment ($inc: { responseCount: 1 }).
      // Admin request-closing convention: Admin atomically sets { status: 'closed', closedAt: now }.
      // If admin closure commits first, findOneAndUpdate matches 0 documents and transaction aborts.
      // If acceptance commits first, responseCount is incremented and closure cleanly follows.
      const session = await mongoose.startSession();
      try {
        const txResult = await session.withTransaction<{ acceptedAt: Date; isNew: boolean }>(async () => {
          // Check if this donor already accepted inside transaction (concurrency race guard)
          const existingInTx = await DonationResponse.findOne({
            donationRequestId: id,
            donorId,
          }).session(session);

          if (existingInTx) {
            return { acceptedAt: existingInTx.acceptedAt, isNew: false };
          }

          const txNow = new Date();

          // Real conditional write on DonationRequest that will write-conflict with concurrent admin closure
          const updatedRequest = await DonationRequest.findOneAndUpdate(
            {
              _id: id,
              status: 'published',
              $or: [
                { neededBy: { $exists: false } },
                { neededBy: null },
                { neededBy: { $gte: txNow } },
              ],
            },
            {
              $inc: { responseCount: 1 },
            },
            {
              session,
              returnDocument: 'after',
            },
          );

          if (!updatedRequest) {
            throw new Error('DONATION_REQUEST_NOT_AVAILABLE');
          }

          const created = await DonationResponse.create(
            [
              {
                donationRequestId: updatedRequest._id,
                donorId,
                status: 'accepted',
                acceptedAt: txNow,
              },
            ],
            { session },
          );

          return { acceptedAt: created[0]!.acceptedAt, isNew: true };
        });

        if (txResult?.isNew) {
          res.status(201).json({
            message: 'Thank you! Your willingness to donate has been recorded.',
            donorResponse: {
              status: 'accepted',
              acceptedAt: txResult.acceptedAt.toISOString(),
            },
          });
        } else if (txResult) {
          res.status(200).json({
            message: 'You have already offered to donate for this request.',
            donorResponse: {
              status: 'accepted',
              acceptedAt: txResult.acceptedAt.toISOString(),
            },
          });
        }
      } catch (txError: unknown) {
        if ((txError as Error)?.message === 'DONATION_REQUEST_NOT_AVAILABLE') {
          res.status(400).json({
            message: 'This donation request is no longer available.',
          });
          return;
        }

        if ((txError as { code?: number })?.code === 11000) {
          const raceExisting = await DonationResponse.findOne({
            donationRequestId: id,
            donorId,
          });
          if (raceExisting) {
            res.status(200).json({
              message: 'You have already offered to donate for this request.',
              donorResponse: {
                status: raceExisting.status,
                acceptedAt: raceExisting.acceptedAt.toISOString(),
              },
            });
            return;
          }
        }
        throw txError;
      } finally {
        await session.endSession();
      }
    } catch (error) {
      console.error('[donation-requests] Error processing donation acceptance:', error);
      res.status(500).json({
        message: 'An error occurred while recording your willingness to donate.',
      });
    }
  },
);

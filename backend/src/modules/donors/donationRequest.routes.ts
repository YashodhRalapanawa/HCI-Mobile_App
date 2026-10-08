import { Router, type Response } from 'express';
import { authenticate, type AuthenticatedRequest } from '../../middleware/auth.js';
import { DonationRequest } from './donationRequest.model.js';

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

import { Router, type Response } from 'express';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../../middleware/auth.js';
import { BloodRequest } from '../requests/request.model.js';
import { DonationRequest } from '../donors/donationRequest.model.js';
import { DonationResponse } from '../donors/donationResponse.model.js';
import { User } from '../users/user.model.js';
import { adminPatientRequestRouter } from './adminPatientRequest.routes.js';
import { adminDonationRequestRouter } from './adminDonationRequest.routes.js';
import { adminReportRouter } from './adminReport.routes.js';

export const adminRouter = Router();

// Subroutes
adminRouter.use('/patient-requests', adminPatientRequestRouter);
adminRouter.use('/donation-requests', adminDonationRequestRouter);
adminRouter.use('/reports', adminReportRouter);

/**
 * GET /api/admin/summary
 * Protected read endpoint returning authoritative operational counts for the admin dashboard.
 * - Requires verified authentication and trusted admin role.
 * - Counts:
 *   1. pendingPatientRequests: Patient BloodRequests in 'pending_verification' status.
 *   2. approvedAwaitingAssignment: Patient BloodRequests in 'verified' status without an assigned delivery person.
 *   3. activeAssignedRequests: Verified/in_progress patient requests with an assigned delivery person awaiting physical arrival.
 *   4. recordedArrivalConfirmations: Requests where requester confirmed arrival of the assigned delivery person.
 *      (Note: Arrival confirmation is strictly delivery check, NOT clinical fulfillment).
 *   5. availableDonationRequests: Published donation requests not past neededBy deadline.
 *   6. donorOffers: Accepted willingness responses in DonationResponse (not completed donations; excludes legacy patient DonorAcceptance).
 *   7. registeredDonors: Registered accounts with role 'donor'.
 * - Strictly read-only: does not modify any records.
 * - Excludes all patient identities, donor contact info, medical documents, and admin credentials.
 */
adminRouter.get(
  '/summary',
  authenticate,
  requireAdmin,
  async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const now = new Date();

      const [
        pendingPatientRequests,
        approvedAwaitingAssignment,
        activeAssignedRequests,
        recordedArrivalConfirmations,
        availableDonationRequests,
        donorOffers,
        registeredDonors,
      ] = await Promise.all([
        // 1. Pending patient requests: status pending_verification
        BloodRequest.countDocuments({ status: 'pending_verification' }),

        // 2. Approved patient requests awaiting assignment: status verified with no delivery assignment
        BloodRequest.countDocuments({
          status: 'verified',
          $or: [
            { deliveryAssignment: { $exists: false } },
            { deliveryAssignment: null },
            { 'deliveryAssignment.assignmentId': { $exists: false } },
            { 'deliveryAssignment.assignmentId': null },
          ],
        }),

        // 3. Active assigned patient requests: verified/in_progress with assignment and no arrival confirmation
        BloodRequest.countDocuments({
          status: { $in: ['verified', 'in_progress'] },
          'deliveryAssignment.assignmentId': { $exists: true, $ne: null },
          $or: [
            { 'deliveryAssignment.arrivalConfirmedAt': { $exists: false } },
            { 'deliveryAssignment.arrivalConfirmedAt': null },
          ],
        }),

        // 4. Recorded arrival confirmations: requests with a saved current-assignment arrivalConfirmedAt
        BloodRequest.countDocuments({
          'deliveryAssignment.arrivalConfirmedAt': { $exists: true, $ne: null },
        }),

        // 5. Available donation requests: published and not past neededBy (consistent with donor API)
        DonationRequest.countDocuments({
          status: 'published',
          $or: [
            { neededBy: { $exists: false } },
            { neededBy: null },
            { neededBy: { $gte: now } },
          ],
        }),

        // 6. Donor offers: accepted DonationResponse records (not completed donations; excludes legacy patient DonorAcceptance)
        DonationResponse.countDocuments({ status: 'accepted' }),

        // 7. Registered donor accounts: User role donor
        User.countDocuments({ role: 'donor' }),
      ]);

      res.status(200).json({
        summary: {
          pendingPatientRequests,
          approvedAwaitingAssignment,
          activeAssignedRequests,
          recordedArrivalConfirmations,
          availableDonationRequests,
          donorOffers,
          registeredDonors,
        },
        refreshedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('[admin] Error fetching dashboard summary:', error);
      res.status(500).json({ message: 'Failed to fetch admin dashboard summary.' });
    }
  },
);

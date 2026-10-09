import { Router, type Response } from 'express';
import { authenticate, requireAdmin, type AuthenticatedRequest } from '../../middleware/auth.js';
import { generateAdminReportData, verifyReportSnapshot, type AdminReportData } from './reports.service.js';
import { generateReportPdf } from './pdfGenerator.js';

export const adminReportRouter = Router();

// Enforce auth + admin role across all report routes
adminReportRouter.use(authenticate, requireAdmin);

/**
 * GET /api/admin/reports
 * Fetches authoritative aggregate metrics for the given Colombo date range.
 * Strictly read-only; returns non-identifying aggregate metrics.
 */
function extractErrorInfo(error: unknown): { status: number; message: string } {
  let status = 500;
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof (error as { statusCode: unknown }).statusCode === 'number'
  ) {
    status = (error as { statusCode: number }).statusCode;
  }
  const message = error instanceof Error ? error.message : 'An error occurred during report processing.';
  return { status, message };
}

adminReportRouter.get(
  '/',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const from = typeof req.query.from === 'string' ? req.query.from : '';
      const to = typeof req.query.to === 'string' ? req.query.to : '';

      const report = await generateAdminReportData(from, to);
      res.status(200).json({ report });
    } catch (error: unknown) {
      const { status, message } = extractErrorInfo(error);
      if (status >= 500) {
        console.error('[adminReport] Error generating report:', error);
      }
      res.status(status).json({ message });
    }
  },
);

/**
 * GET /api/admin/reports/pdf
 * Generates and streams a downloadable vector PDF report for the given Colombo date range.
 */
adminReportRouter.get(
  '/pdf',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const from = typeof req.query.from === 'string' ? req.query.from : '';
      const to = typeof req.query.to === 'string' ? req.query.to : '';

      const report = await generateAdminReportData(from, to);
      const pdfBuffer = generateReportPdf(report);

      const filename = `Blood_Request_and_Donation_Summary_Report_${report.appliedRange.from}_to_${report.appliedRange.to}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.status(200).send(pdfBuffer);
    } catch (error: unknown) {
      const { status, message } = extractErrorInfo(error);
      if (status >= 500) {
        console.error('[adminReport] Error generating PDF from query:', error);
      }
      res.status(status).json({ message });
    }
  },
);

/**
 * POST /api/admin/reports/pdf
 * Generates and downloads a PDF directly from an existing displayed report snapshot,
 * guaranteeing 100% agreement between on-screen data and the exported file.
 */
adminReportRouter.post(
  '/pdf',
  async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      let report: AdminReportData;

      if (req.body?.report && typeof req.body.report === 'object') {
        // Verify server-signed snapshot integrity before exporting
        if (!verifyReportSnapshot(req.body.report)) {
          res.status(400).json({
            message: 'Invalid or tampered report snapshot. The server signature could not be verified.',
          });
          return;
        }
        report = req.body.report;
      } else if (req.body?.from && req.body?.to) {
        // Re-generate fresh snapshot for requested dates
        report = await generateAdminReportData(String(req.body.from), String(req.body.to));
      } else {
        res.status(400).json({
          message: "A valid server-signed report snapshot or 'from' and 'to' date parameters must be provided.",
        });
        return;
      }

      const pdfBuffer = generateReportPdf(report);
      const filename = `Blood_Request_and_Donation_Summary_Report_${report.appliedRange.from}_to_${report.appliedRange.to}.pdf`;

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.status(200).send(pdfBuffer);
    } catch (error: unknown) {
      const { status, message } = extractErrorInfo(error);
      if (status >= 500) {
        console.error('[adminReport] Error exporting PDF from snapshot:', error);
      }
      res.status(status).json({ message });
    }
  },
);

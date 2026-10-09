import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/users/user.model.js';
import { BloodRequest } from '../src/modules/requests/request.model.js';
import { DonationRequest } from '../src/modules/donors/donationRequest.model.js';
import { DonationResponse } from '../src/modules/donors/donationResponse.model.js';
import type { AdminReportData } from '../src/modules/admin/reports.service.js';

test('Admin Page 4 — Reports & PDF Generation Integration', async (t) => {
  if (!env.MONGODB_URI) {
    t.skip('MONGODB_URI not configured, skipping DB-backed integration tests');
    return;
  }

  await connectDatabase(env.MONGODB_URI);

  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}/api/admin/reports`;

  const jwtSecret = env.JWT_SECRET || 'dev-secret-key-change-in-production';

  const testIds: {
    adminUserId?: string;
    donorUserId?: string;
    secondDonorUserId?: string;
    recipientUserId?: string;
    requestIds: mongoose.Types.ObjectId[];
    donationRequestIds: mongoose.Types.ObjectId[];
    donationResponseIds: mongoose.Types.ObjectId[];
  } = {
    requestIds: [],
    donationRequestIds: [],
    donationResponseIds: [],
  };

  try {
    // 1. Create test users
    const adminUser = await User.create({
      name: 'Report Test Administrator',
      email: `admin.report.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_test',
      role: 'admin',
      bloodGroup: 'O+',
      district: 'Colombo',
      isAvailable: false,
      isEligible: false,
      donationCount: 0,
    });
    testIds.adminUserId = adminUser._id.toString();
    const adminToken = jwt.sign({ id: adminUser._id.toString() }, jwtSecret, { expiresIn: '1h' });

    const donorUser = await User.create({
      name: 'Report Test Donor 1',
      email: `donor1.report.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_test',
      role: 'donor',
      bloodGroup: 'A+',
      district: 'Colombo',
      isAvailable: true,
      isEligible: true,
      donationCount: 2,
    });
    testIds.donorUserId = donorUser._id.toString();
    const donorToken = jwt.sign({ id: donorUser._id.toString() }, jwtSecret, { expiresIn: '1h' });

    const secondDonorUser = await User.create({
      name: 'Report Test Donor 2',
      email: `donor2.report.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_test',
      role: 'donor',
      bloodGroup: 'B+',
      district: 'Kandy',
      isAvailable: true,
      isEligible: true,
      donationCount: 0,
    });
    testIds.secondDonorUserId = secondDonorUser._id.toString();

    const recipientUser = await User.create({
      name: 'Report Test Recipient',
      email: `recipient.report.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_test',
      role: 'recipient',
      bloodGroup: 'O-',
      district: 'Galle',
      isAvailable: false,
      isEligible: false,
      donationCount: 0,
    });
    testIds.recipientUserId = recipientUser._id.toString();

    // Setup dates for isolated testing interval:
    // Period: 2026-10-15 to 2026-10-15 (a single Colombo day!)
    // Colombo start: 2026-10-15T00:00:00+05:30 -> UTC 2026-10-14T18:30:00.000Z
    // Colombo end: 2026-10-16T00:00:00+05:30 -> UTC 2026-10-15T18:30:00.000Z
    const testDateFrom = '2026-10-15';
    const testDateTo = '2026-10-15';

    const insidePeriodUtc = new Date('2026-10-15T06:00:00.000Z'); // 11:30 AM Colombo on Oct 15
    const justBeforePeriodUtc = new Date('2026-10-14T18:29:59.000Z'); // 23:59:59 Colombo on Oct 14 (outside!)
    const justAfterPeriodUtc = new Date('2026-10-15T18:30:01.000Z'); // 00:00:01 Colombo on Oct 16 (outside!)

    // Create Patient Blood Requests:
    // R1: Inside period, status pending_verification, hospital: Colombo National Hospital, bloodGroup: A+, units: 2
    const req1 = await BloodRequest.create({
      requesterId: recipientUser._id,
      patientName: 'Test Patient 1',
      bloodGroup: 'A+',
      unitsRequired: 2,
      hospitalId: 'hosp-cnh-colombo',
      hospitalName: 'Colombo National Hospital Blood Bank',
      hospitalReferenceAndWard: 'Ward 4B / Ref 1001',
      urgency: 'Urgent',
      document: {
        originalName: 'med1.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageKey: 'med1-key',
      },
      status: 'pending_verification',
      createdAt: insidePeriodUtc,
    });
    testIds.requestIds.push(req1._id);

    // R2: Inside period, status in_progress, with arrivalConfirmedAt inside period!
    const req2 = await BloodRequest.create({
      requesterId: recipientUser._id,
      patientName: 'Test Patient 2',
      bloodGroup: 'O+',
      unitsRequired: 3,
      hospitalId: 'hosp-kandy-gen',
      hospitalName: 'Kandy National Hospital',
      hospitalReferenceAndWard: 'Ward 2 / Ref 1002',
      urgency: 'Scheduled',
      document: {
        originalName: 'med2.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 2048,
        storageKey: 'med2-key',
      },
      status: 'in_progress',
      deliveryAssignment: {
        assignmentId: 'asg-test-1',
        deliveryPersonName: 'Courier Nimal',
        contactPhone: '+94771234567',
        assignedAt: insidePeriodUtc,
        arrivalConfirmedAt: insidePeriodUtc,
        arrivalConfirmedBy: recipientUser._id,
      },
      createdAt: insidePeriodUtc,
    });
    testIds.requestIds.push(req2._id);

    // R3: Outside period (before), status fulfilled, arrivalConfirmedAt also outside period
    const req3 = await BloodRequest.create({
      requesterId: recipientUser._id,
      patientName: 'Test Patient Outside',
      bloodGroup: 'B+',
      unitsRequired: 1,
      hospitalId: 'hosp-cnh-colombo',
      hospitalName: 'Colombo National Hospital Blood Bank',
      hospitalReferenceAndWard: 'Ward 1 / Ref 1000',
      urgency: 'Urgent',
      document: {
        originalName: 'med3.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 512,
        storageKey: 'med3-key',
      },
      status: 'fulfilled',
      createdAt: justBeforePeriodUtc,
    });
    testIds.requestIds.push(req3._id);

    // Create Donation Invitations (DonationRequest):
    // Inv1: Created inside period, status published, publishedAt inside period
    const inv1 = await DonationRequest.create({
      bloodGroup: 'A+',
      unitsRequired: 5,
      hospitalId: 'hosp-cnh-colombo',
      hospitalName: 'Colombo National Hospital Blood Bank',
      locationDescription: 'Blood Bank Donor Lounge',
      urgency: 'Urgent',
      status: 'published',
      publishedAt: insidePeriodUtc,
      createdAt: insidePeriodUtc,
      responseCount: 1,
    });
    testIds.donationRequestIds.push(inv1._id);

    // Inv2: Created inside period, but closed! (Status: closed, publishedAt inside period)
    const inv2 = await DonationRequest.create({
      bloodGroup: 'O+',
      unitsRequired: 2,
      hospitalId: 'hosp-kandy-gen',
      hospitalName: 'Kandy National Hospital',
      locationDescription: 'Main Wing',
      urgency: 'Scheduled',
      status: 'closed',
      publishedAt: insidePeriodUtc,
      closedAt: insidePeriodUtc,
      createdAt: insidePeriodUtc,
      responseCount: 1,
    });
    testIds.donationRequestIds.push(inv2._id);

    // Inv3: Created before period, but published inside period!
    const inv3 = await DonationRequest.create({
      bloodGroup: 'AB+',
      unitsRequired: 4,
      hospitalId: 'hosp-sjh-kotte',
      hospitalName: 'Sri Jayewardenepura General Hospital',
      locationDescription: 'Transfusion Unit',
      urgency: 'Urgent',
      status: 'published',
      publishedAt: insidePeriodUtc,
      createdAt: justBeforePeriodUtc,
      responseCount: 0,
    });
    testIds.donationRequestIds.push(inv3._id);

    // Create Donation Responses (DonationResponse):
    // Donor 1 accepts Inv 1 inside period
    const resp1 = await DonationResponse.create({
      donationRequestId: inv1._id,
      donorId: donorUser._id,
      status: 'accepted',
      acceptedAt: insidePeriodUtc,
    });
    testIds.donationResponseIds.push(resp1._id);

    // Donor 1 ALSO accepts Inv 2 inside period (multiple offers from same donor!)
    const resp2 = await DonationResponse.create({
      donationRequestId: inv2._id,
      donorId: donorUser._id,
      status: 'accepted',
      acceptedAt: insidePeriodUtc,
    });
    testIds.donationResponseIds.push(resp2._id);

    // Donor 2 accepts Inv 2 outside period (should not be counted in period)
    const resp3 = await DonationResponse.create({
      donationRequestId: inv2._id,
      donorId: secondDonorUser._id,
      status: 'accepted',
      acceptedAt: justAfterPeriodUtc,
    });
    testIds.donationResponseIds.push(resp3._id);

    await t.test('1. Authorization: Rejects unauthenticated and non-admin requests on all report endpoints', async () => {
      // GET /api/admin/reports
      const resUnauth = await fetch(`${baseUrl}?from=${testDateFrom}&to=${testDateTo}`);
      assert.equal(resUnauth.status, 401);

      const resDonor = await fetch(`${baseUrl}?from=${testDateFrom}&to=${testDateTo}`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(resDonor.status, 403);

      // GET /api/admin/reports/pdf
      const resPdfUnauth = await fetch(`${baseUrl}/pdf?from=${testDateFrom}&to=${testDateTo}`);
      assert.equal(resPdfUnauth.status, 401);

      const resPdfDonor = await fetch(`${baseUrl}/pdf?from=${testDateFrom}&to=${testDateTo}`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(resPdfDonor.status, 403);

      // POST /api/admin/reports/pdf
      const resPostUnauth = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: testDateFrom, to: testDateTo }),
      });
      assert.equal(resPostUnauth.status, 401);

      const resPostDonor = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${donorToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ from: testDateFrom, to: testDateTo }),
      });
      assert.equal(resPostDonor.status, 403);
    });

    await t.test('2. Date Validation: Rejects invalid, malformed, and reversed date ranges', async () => {
      // Missing params
      const resMissing = await fetch(baseUrl, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(resMissing.status, 400);

      // Malformed format
      const resMalformed = await fetch(`${baseUrl}?from=15-10-2026&to=2026-10-15`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(resMalformed.status, 400);

      // Non-existent calendar date (Feb 30)
      const resFakeDate = await fetch(`${baseUrl}?from=2026-02-30&to=2026-02-30`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(resFakeDate.status, 400);

      // Reversed range (from > to)
      const resReversed = await fetch(`${baseUrl}?from=2026-10-20&to=2026-10-10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(resReversed.status, 400);
      const jsonReversed = (await resReversed.json()) as { message: string };
      assert.match(jsonReversed.message, /reversed/i);
    });

    await t.test('3. Colombo Boundary Accuracy and Metrics Verification', async () => {
      const res = await fetch(`${baseUrl}?from=${testDateFrom}&to=${testDateTo}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);

      const json = (await res.json()) as { report: AdminReportData };
      const report: AdminReportData = json.report;

      assert.ok(report);
      assert.equal(report.reportTitle, 'Blood Request & Donation Summary Report');
      assert.equal(report.appliedRange.from, '2026-10-15');
      assert.equal(report.appliedRange.to, '2026-10-15');
      assert.equal(report.appliedRange.timezone, 'Asia/Colombo (UTC+05:30)');

      // Section A: Patient Blood Requests created in period
      // Total created in period must be 2 (req1 and req2; req3 is excluded)
      assert.equal(report.metrics.patientRequests.totalCreated, 2);

      // Status breakdown must cover all 6 statuses
      const statusMap = report.metrics.patientRequests.statusBreakdown;
      assert.equal(statusMap.pending_verification, 1); // req1
      assert.equal(statusMap.in_progress, 1); // req2
      assert.equal(statusMap.verified, 0);
      assert.equal(statusMap.fulfilled, 0); // req3 was fulfilled but outside period!
      assert.equal(statusMap.cancelled, 0);
      assert.equal(statusMap.rejected, 0);

      // Hospital breakdown
      const hospitals = report.metrics.patientRequests.byHospital;
      assert.equal(hospitals.length, 2);
      const cnh = hospitals.find((h) => h.hospitalId === 'hosp-cnh-colombo');
      const kandy = hospitals.find((h) => h.hospitalId === 'hosp-kandy-gen');
      assert.ok(cnh);
      assert.equal(cnh?.count, 1);
      assert.equal(cnh?.unitsRequired, 2);
      assert.ok(kandy);
      assert.equal(kandy?.count, 1);
      assert.equal(kandy?.unitsRequired, 3);

      // Blood group breakdown: A+ has 1 (2 units), O+ has 1 (3 units), others have 0
      assert.equal(report.metrics.patientRequests.byBloodGroup['A+'].count, 1);
      assert.equal(report.metrics.patientRequests.byBloodGroup['A+'].unitsRequired, 2);
      assert.equal(report.metrics.patientRequests.byBloodGroup['O+'].count, 1);
      assert.equal(report.metrics.patientRequests.byBloodGroup['O+'].unitsRequired, 3);
      assert.equal(report.metrics.patientRequests.byBloodGroup['B+'].count, 0); // req3 was B+ but outside period!

      // Section B: Delivery arrivals confirmed during selected period
      // req2 has arrivalConfirmedAt inside period -> confirmedCount = 1
      assert.equal(report.metrics.deliveryArrivals.confirmedCount, 1);

      // Section C: Donation invitations
      // Created in period: inv1 and inv2 = 2 (inv3 was created before period!)
      assert.equal(report.metrics.donationInvitations.createdCount, 2);
      // Published in period: inv1, inv2, and inv3 were all published inside period = 3!
      // (Closed invitation inv2 retained its publication count!)
      assert.equal(report.metrics.donationInvitations.publishedCount, 3);
      // Status breakdown of invitations created in period:
      // inv1 is published (1), inv2 is closed (1), draft is 0
      assert.equal(report.metrics.donationInvitations.createdStatusBreakdown.published, 1);
      assert.equal(report.metrics.donationInvitations.createdStatusBreakdown.closed, 1);
      assert.equal(report.metrics.donationInvitations.createdStatusBreakdown.draft, 0);

      // Section D: Donor willingness
      // resp1 and resp2 were submitted by donor1 in period -> acceptedOffersCount = 2
      assert.equal(report.metrics.donorWillingness.acceptedOffersCount, 2);
      // Both offers came from donor1 -> uniqueRespondingDonors = 1 (donor2 was outside period)
      assert.equal(report.metrics.donorWillingness.uniqueRespondingDonors, 1);

      // Section E: Registered accounts
      // Current registered accounts — all dates (outside date filter)
      assert.ok(report.metrics.registeredAccounts.recipientAccountsCount >= 1);
      assert.ok(report.metrics.registeredAccounts.donorAccountsCount >= 2);

      // Check notes are present
      assert.ok(report.notes.patientRequestsNote.length > 20);
      assert.ok(report.notes.deliveryArrivalsNote.includes('courier'));
      assert.ok(report.notes.generalDisclaimer.includes('Permanently deleted records'));
      assert.ok(report.notes.registeredAccountsNote.includes('Current registered accounts — all dates'));
      assert.ok(!report.notes.registeredAccountsNote.includes('all-time cumulative'));

      // Server cryptographic signature check
      assert.ok(typeof report.signature === 'string' && report.signature.length === 64);

      // Check data safety: NO patient or donor personal names or phone numbers returned in report
      const reportStr = JSON.stringify(report);
      assert.ok(!reportStr.includes('Test Patient 1'));
      assert.ok(!reportStr.includes('Test Patient 2'));
      assert.ok(!reportStr.includes('+94771234567'));
      assert.ok(!reportStr.includes('Courier Nimal'));
      assert.ok(!reportStr.includes('med1-key'));
    });

    await t.test('4. Empty-period returns genuine zero data gracefully', async () => {
      // Query a past period where no test activity exists: 2025-01-01 to 2025-01-02
      const res = await fetch(`${baseUrl}?from=2025-01-01&to=2025-01-02`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);

      const json = (await res.json()) as { report: AdminReportData };
      const report: AdminReportData = json.report;

      assert.equal(report.metrics.patientRequests.totalCreated, 0);
      assert.equal(report.metrics.deliveryArrivals.confirmedCount, 0);
      assert.equal(report.metrics.donationInvitations.createdCount, 0);
      assert.equal(report.metrics.donationInvitations.publishedCount, 0);
      assert.equal(report.metrics.donorWillingness.acceptedOffersCount, 0);
      assert.equal(report.metrics.donorWillingness.uniqueRespondingDonors, 0);
      assert.equal(report.metrics.patientRequests.byHospital.length, 0);
      // Status breakdown must still have all 6 keys initialized to 0
      assert.equal(report.metrics.patientRequests.statusBreakdown.pending_verification, 0);
      // Registered accounts still reflect system totals
      assert.ok(report.metrics.registeredAccounts.donorAccountsCount >= 2);
    });

    await t.test('5. PDF Endpoint: Generates valid vector PDF matching report data', async () => {
      // GET /api/admin/reports/pdf
      const resPdf = await fetch(`${baseUrl}/pdf?from=${testDateFrom}&to=${testDateTo}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(resPdf.status, 200);
      assert.equal(resPdf.headers.get('content-type'), 'application/pdf');
      assert.match(resPdf.headers.get('content-disposition') || '', /Blood_Request_and_Donation_Summary_Report_2026-10-15_to_2026-10-15\.pdf/);

      const pdfArrayBuffer = await resPdf.arrayBuffer();
      const pdfBuffer = Buffer.from(pdfArrayBuffer);

      assert.ok(pdfBuffer.length > 500, 'PDF buffer must have meaningful size');
      const pdfText = pdfBuffer.toString('latin1');
      assert.ok(pdfText.startsWith('%PDF-1.4'), 'PDF must start with %PDF-1.4');
      assert.ok(pdfText.includes('%%EOF'), 'PDF must end with %%EOF marker');
      assert.ok(pdfText.includes('Blood Request & Donation Summary Report'));
      assert.ok(pdfText.includes('Colombo National Hospital Blood Bank'));

      // Non-admin rejection for PDF endpoint
      const resPdfUnauth = await fetch(`${baseUrl}/pdf?from=${testDateFrom}&to=${testDateTo}`);
      assert.equal(resPdfUnauth.status, 401);

      // POST /api/admin/reports/pdf snapshot generation
      const sampleReportResponse = await fetch(`${baseUrl}?from=${testDateFrom}&to=${testDateTo}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      const sampleReport = (await sampleReportResponse.json()) as { report: AdminReportData };

      const resPostPdf = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: sampleReport.report }),
      });
      assert.equal(resPostPdf.status, 200);
      assert.equal(resPostPdf.headers.get('content-type'), 'application/pdf');
      const postPdfBuffer = Buffer.from(await resPostPdf.arrayBuffer());
      assert.ok(postPdfBuffer.toString('latin1').startsWith('%PDF-1.4'));
    });

    await t.test('6. Snapshot Verification & Tamper Protection: Rejects altered counts, dates, breakdowns, or notes', async () => {
      // 1. Fetch valid server-signed report
      const resReport = await fetch(`${baseUrl}?from=${testDateFrom}&to=${testDateTo}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(resReport.status, 200);
      const { report: validReport } = (await resReport.json()) as { report: AdminReportData };
      assert.ok(validReport.signature);

      // 2. Unchanged server-generated snapshot exports successfully
      const resValidPdf = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: validReport }),
      });
      assert.equal(resValidPdf.status, 200);
      assert.equal(resValidPdf.headers.get('content-type'), 'application/pdf');

      // 3. Reject altered count (totalCreated)
      const tamperedCount = JSON.parse(JSON.stringify(validReport)) as AdminReportData;
      tamperedCount.metrics.patientRequests.totalCreated = 99999;
      const resTamperedCount = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: tamperedCount }),
      });
      assert.equal(resTamperedCount.status, 400);
      const jsonTamperedCount = (await resTamperedCount.json()) as { message: string };
      assert.match(jsonTamperedCount.message, /tampered|signature/i);

      // 4. Reject altered date interval
      const tamperedDates = JSON.parse(JSON.stringify(validReport)) as AdminReportData;
      tamperedDates.appliedRange.from = '2020-01-01';
      const resTamperedDates = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: tamperedDates }),
      });
      assert.equal(resTamperedDates.status, 400);

      // 5. Reject altered breakdown
      const tamperedBreakdown = JSON.parse(JSON.stringify(validReport)) as AdminReportData;
      tamperedBreakdown.metrics.patientRequests.byBloodGroup['A+'].unitsRequired = 999;
      const resTamperedBreakdown = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: tamperedBreakdown }),
      });
      assert.equal(resTamperedBreakdown.status, 400);

      // 6. Reject altered timestamp
      const tamperedTimestamp = JSON.parse(JSON.stringify(validReport)) as AdminReportData;
      tamperedTimestamp.generatedAt = new Date('2020-01-01T00:00:00.000Z').toISOString();
      const resTamperedTimestamp = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: tamperedTimestamp }),
      });
      assert.equal(resTamperedTimestamp.status, 400);

      // 7. Reject altered notes
      const tamperedNotes = JSON.parse(JSON.stringify(validReport)) as AdminReportData;
      tamperedNotes.notes.generalDisclaimer = 'Forged disclaimer.';
      const resTamperedNotes = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: tamperedNotes }),
      });
      assert.equal(resTamperedNotes.status, 400);

      // 8. Reject missing signature
      const missingSig = JSON.parse(JSON.stringify(validReport)) as Record<string, unknown>;
      delete missingSig.signature;
      const resMissingSig = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: missingSig }),
      });
      assert.equal(resMissingSig.status, 400);

      // 9. Reject forged signature
      const forgedSig = JSON.parse(JSON.stringify(validReport)) as AdminReportData;
      forgedSig.signature = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
      const resForgedSig = await fetch(`${baseUrl}/pdf`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ report: forgedSig }),
      });
      assert.equal(resForgedSig.status, 400);
    });

    await t.test('7. Strictly Read-Only: Report generation performs zero database mutations', async () => {
      const countReqsBefore = await BloodRequest.countDocuments();
      const countInvsBefore = await DonationRequest.countDocuments();
      const countRespsBefore = await DonationResponse.countDocuments();
      const countUsersBefore = await User.countDocuments();

      // Invoke report generation multiple times
      await fetch(`${baseUrl}?from=${testDateFrom}&to=${testDateTo}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      await fetch(`${baseUrl}/pdf?from=${testDateFrom}&to=${testDateTo}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });

      const countReqsAfter = await BloodRequest.countDocuments();
      const countInvsAfter = await DonationRequest.countDocuments();
      const countRespsAfter = await DonationResponse.countDocuments();
      const countUsersAfter = await User.countDocuments();

      assert.equal(countReqsAfter, countReqsBefore);
      assert.equal(countInvsAfter, countInvsBefore);
      assert.equal(countRespsAfter, countRespsBefore);
      assert.equal(countUsersAfter, countUsersBefore);
    });
  } finally {
    // Teardown test fixtures
    for (const rId of testIds.requestIds) {
      await BloodRequest.findByIdAndDelete(rId);
    }
    for (const dId of testIds.donationRequestIds) {
      await DonationRequest.findByIdAndDelete(dId);
    }
    for (const respId of testIds.donationResponseIds) {
      await DonationResponse.findByIdAndDelete(respId);
    }
    if (testIds.adminUserId) {
      await User.findByIdAndDelete(testIds.adminUserId);
    }
    if (testIds.donorUserId) {
      await User.findByIdAndDelete(testIds.donorUserId);
    }
    if (testIds.secondDonorUserId) {
      await User.findByIdAndDelete(testIds.secondDonorUserId);
    }
    if (testIds.recipientUserId) {
      await User.findByIdAndDelete(testIds.recipientUserId);
    }
    server.close();
    await mongoose.disconnect();
  }
});

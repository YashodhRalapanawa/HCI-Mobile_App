import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/users/user.model.js';
import { DonationRequest } from '../src/modules/donors/donationRequest.model.js';
import { DonationResponse } from '../src/modules/donors/donationResponse.model.js';
import { BloodRequest } from '../src/modules/requests/request.model.js';

interface TestDonationRequestItem {
  id: string;
  bloodGroup: string;
  unitsRequired: number;
  hospitalId: string;
  hospitalName: string;
  locationDescription: string;
  urgency: string;
  neededBy?: string | null;
  status: string;
  publishedAt?: string | null;
  closedAt?: string | null;
  responseCount: number;
  createdAt: string;
  updatedAt: string;
}

interface TestDonationRequestDetail extends TestDonationRequestItem {
  createdByAdmin?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

interface TestDonorResponseItem {
  responseId: string;
  donorId: string;
  donorName: string;
  donorBloodGroup: string | null;
  donorDistrict: string | null;
  status: string;
  acceptedAt: string;
  passwordHash?: string;
  phone?: string;
  email?: string;
}

interface TestAcceptedHistoryItem {
  donationRequestId: string;
  acceptedAt: string;
  availability: string;
}

test('Admin Donation Requests Management API Integration', async (t) => {
  if (!env.MONGODB_URI) {
    t.skip('MONGODB_URI not configured, skipping DB-backed integration tests');
    return;
  }

  await connectDatabase(env.MONGODB_URI);

  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;

  const jwtSecret = env.JWT_SECRET || 'dev-secret-key-change-in-production';

  const testIds: {
    adminUserId?: mongoose.Types.ObjectId;
    donorUserId?: mongoose.Types.ObjectId;
    donor2UserId?: mongoose.Types.ObjectId;
    recipientUserId?: mongoose.Types.ObjectId;
    requestIds: mongoose.Types.ObjectId[];
    responseIds: mongoose.Types.ObjectId[];
  } = {
    requestIds: [],
    responseIds: [],
  };

  try {
    // 1. Create isolated fixtures
    const adminUser = await User.create({
      name: 'Dr. Admin Test',
      email: `admin.donation.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_admin_test',
      role: 'admin',
    });
    testIds.adminUserId = adminUser._id as mongoose.Types.ObjectId;

    const donorUser = await User.create({
      name: 'Kamal Donor',
      email: `kamal.donor.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_donor_test',
      role: 'donor',
      bloodGroup: 'B+',
      district: 'Colombo',
      phone: '0712345678',
    });
    testIds.donorUserId = donorUser._id as mongoose.Types.ObjectId;

    const donor2User = await User.create({
      name: 'Nimal Donor',
      email: `nimal.donor.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_donor2_test',
      role: 'donor',
      bloodGroup: 'B+',
      district: 'Gampaha',
      phone: '0778899001',
    });
    testIds.donor2UserId = donor2User._id as mongoose.Types.ObjectId;

    const recipientUser = await User.create({
      name: 'Sunil Recipient',
      email: `sunil.recipient.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_recip_test',
      role: 'recipient',
    });
    testIds.recipientUserId = recipientUser._id as mongoose.Types.ObjectId;

    const adminToken = jwt.sign(
      { id: adminUser._id.toString() },
      jwtSecret,
      { expiresIn: '1h' },
    );

    const donorToken = jwt.sign(
      { id: donorUser._id.toString() },
      jwtSecret,
      { expiresIn: '1h' },
    );

    const donor2Token = jwt.sign(
      { id: donor2User._id.toString() },
      jwtSecret,
      { expiresIn: '1h' },
    );

    const recipientToken = jwt.sign(
      { id: recipientUser._id.toString() },
      jwtSecret,
      { expiresIn: '1h' },
    );

    // Baseline count of patient BloodRequests to verify no side effects
    const initialBloodRequestCount = await BloodRequest.countDocuments();

    await t.test('1. Protected endpoints reject unauthenticated and non-admin callers', async () => {
      // Unauthenticated
      const unauthRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests`, {
        method: 'GET',
      });
      assert.equal(unauthRes.status, 401);

      // Donor caller (forbidden)
      const donorRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(donorRes.status, 403);

      // Recipient caller (forbidden)
      const recipRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${recipientToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bloodGroup: 'B+',
          unitsRequired: 2,
          hospitalId: 'hosp_colombo_nhsl',
          locationDescription: 'Ward 4',
          urgency: 'Urgent',
        }),
      });
      assert.equal(recipRes.status, 403);
    });

    let draftRequestId: string = '';
    let draftUpdatedAt: string = '';

    await t.test('2. Admin draft creation with catalogue resolution and validation', async () => {
      // Rejection of invalid hospitalId
      const badHospRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bloodGroup: 'B+',
          unitsRequired: 2,
          hospitalId: 'unknown_hospital_id',
          locationDescription: 'ICU',
          urgency: 'Urgent',
        }),
      });
      assert.equal(badHospRes.status, 400);

      // Rejection of invalid unitsRequired (> 50)
      const badUnitsRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bloodGroup: 'B+',
          unitsRequired: 101,
          hospitalId: 'hosp-cnh-colombo',
          locationDescription: 'ICU',
          urgency: 'Urgent',
        }),
      });
      assert.equal(badUnitsRes.status, 400);

      // Rejection of past neededBy
      const pastDate = new Date(Date.now() - 3600000).toISOString();
      const pastDeadlineRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bloodGroup: 'B+',
          unitsRequired: 3,
          hospitalId: 'hosp-cnh-colombo',
          locationDescription: 'Emergency Ward',
          urgency: 'Urgent',
          neededBy: pastDate,
        }),
      });
      assert.equal(pastDeadlineRes.status, 400);

      // Successful draft creation
      const futureDate = new Date(Date.now() + 48 * 3600000).toISOString();
      const validCreateRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          bloodGroup: 'B+',
          unitsRequired: 3,
          hospitalId: 'hosp-cnh-colombo',
          locationDescription: 'Emergency Ward, Floor 2',
          urgency: 'Urgent',
          neededBy: futureDate,
        }),
      });
      assert.equal(validCreateRes.status, 201);
      const createBody = (await validCreateRes.json()) as { request: TestDonationRequestItem };
      draftRequestId = createBody.request.id;
      draftUpdatedAt = createBody.request.updatedAt;
      testIds.requestIds.push(new mongoose.Types.ObjectId(draftRequestId));

      assert.equal(createBody.request.status, 'draft');
      assert.equal(createBody.request.bloodGroup, 'B+');
      assert.equal(createBody.request.unitsRequired, 3);
      assert.equal(createBody.request.hospitalId, 'hosp-cnh-colombo');
      assert.equal(createBody.request.hospitalName, 'Colombo National Hospital Blood Bank');
      assert.equal(createBody.request.locationDescription, 'Emergency Ward, Floor 2');
      assert.equal(createBody.request.urgency, 'Urgent');
      assert.equal(createBody.request.responseCount, 0);
      assert.equal(createBody.request.publishedAt, null);
      assert.equal(createBody.request.closedAt, null);

      // Verify server derived createdByAdminId on database document
      const dbDoc = await DonationRequest.findById(draftRequestId);
      assert.equal(dbDoc?.createdByAdminId?.toString(), adminUser._id.toString());
    });

    await t.test('3. Draft privacy: not exposed to donor dashboard or acceptance', async () => {
      // Donor available requests query must not contain the draft
      const donorListRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests?bloodGroup=B%2B`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(donorListRes.status, 200);
      const donorListBody = (await donorListRes.json()) as { requests: TestDonationRequestItem[] };
      const foundInDonorList = donorListBody.requests.some((r) => r.id === draftRequestId);
      assert.equal(foundInDonorList, false, 'Draft request must not appear in donor list');

      // Donor cannot accept a draft (draft returns 404 for donors)
      const acceptRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${draftRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(acceptRes.status, 404);
      const acceptBody = (await acceptRes.json()) as { message: string };
      assert.ok(acceptBody.message);
    });

    await t.test('4. Draft editing and optimistic concurrency conflict protection', async () => {
      // Concurrency conflict: wrong expectedUpdatedAt
      const conflictRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationDescription: 'Updated Ward 3',
          expectedUpdatedAt: new Date(Date.now() - 500000).toISOString(),
        }),
      });
      assert.equal(conflictRes.status, 409);
      const conflictBody = (await conflictRes.json()) as { message: string };
      assert.ok(conflictBody.message);

      // Successful update with matching expectedUpdatedAt
      const okUpdateRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationDescription: 'Updated Ward 3, Bed 12',
          unitsRequired: 4,
          expectedUpdatedAt: draftUpdatedAt,
        }),
      });
      assert.equal(okUpdateRes.status, 200);
      const updateBody = (await okUpdateRes.json()) as { request: TestDonationRequestItem };
      assert.equal(updateBody.request.locationDescription, 'Updated Ward 3, Bed 12');
      assert.equal(updateBody.request.unitsRequired, 4);
      draftUpdatedAt = updateBody.request.updatedAt;
    });

    await t.test('5. Admin publication and edit restriction on published requests', async () => {
      // Publish with stale expectedUpdatedAt fails with 409
      const stalePubRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expectedUpdatedAt: new Date(Date.now() - 500000).toISOString(),
        }),
      });
      assert.equal(stalePubRes.status, 409);

      // Regression: Publish non-existent ID fails with 404
      const nonExistentId = new mongoose.Types.ObjectId();
      const notFoundPubRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${nonExistentId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      assert.equal(notFoundPubRes.status, 404);

      // Regression: Publish with invalid ID format fails with 400
      const badIdPubRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/invalid-mongo-id/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      assert.equal(badIdPubRes.status, 400);

      // Regression: Publish draft with expired deadline fails with 400
      const expiredDraft = await DonationRequest.create({
        bloodGroup: 'O-',
        unitsRequired: 2,
        hospitalId: 'hosp-cnh-colombo',
        hospitalName: 'Colombo National Hospital Blood Bank',
        locationDescription: 'ICU Unit 4',
        urgency: 'Urgent',
        neededBy: new Date(Date.now() - 3600000), // 1 hour in past
        status: 'draft',
        publishedAt: null,
        responseCount: 0,
        createdByAdminId: adminUser._id,
      });
      testIds.requestIds.push(expiredDraft._id as mongoose.Types.ObjectId);

      const expiredPubRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${expiredDraft._id}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      assert.equal(expiredPubRes.status, 400);
      const expiredDb = await DonationRequest.findById(expiredDraft._id);
      assert.equal(expiredDb?.status, 'draft', 'Expired draft must remain in draft status on rejection');

      // Successful publication
      const pubRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expectedUpdatedAt: draftUpdatedAt,
        }),
      });
      assert.equal(pubRes.status, 200);
      const pubBody = (await pubRes.json()) as { request: TestDonationRequestItem };
      assert.equal(pubBody.request.status, 'published');
      assert.ok(pubBody.request.publishedAt, 'publishedAt must be set on server');
      draftUpdatedAt = pubBody.request.updatedAt;

      // Cannot publish already published request
      const doublePubRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}/publish`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expectedUpdatedAt: draftUpdatedAt,
        }),
      });
      assert.equal(doublePubRes.status, 409);

      // Cannot edit published request via PATCH
      const editPubRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationDescription: 'Should not allow',
          expectedUpdatedAt: draftUpdatedAt,
        }),
      });
      assert.equal(editPubRes.status, 409);
      const editPubBody = (await editPubRes.json()) as { message: string };
      assert.ok(editPubBody.message);
    });

    await t.test('6. Donor flow integration: published request accept and admin response inspection', async () => {
      // Create additional requests: one published with no deadline, one expired
      const noDeadlineReq = await DonationRequest.create({
        bloodGroup: 'AB+',
        unitsRequired: 1,
        hospitalId: 'hosp-cnh-colombo',
        hospitalName: 'Colombo National Hospital Blood Bank',
        locationDescription: 'Blood Bank Counter 1',
        urgency: 'Scheduled',
        neededBy: null,
        status: 'published',
        publishedAt: new Date(),
        responseCount: 0,
        createdByAdminId: adminUser._id,
      });
      testIds.requestIds.push(noDeadlineReq._id as mongoose.Types.ObjectId);

      const expiredReq = await DonationRequest.create({
        bloodGroup: 'O+',
        unitsRequired: 2,
        hospitalId: 'hosp-cnh-colombo',
        hospitalName: 'Colombo National Hospital Blood Bank',
        locationDescription: 'Emergency Intake',
        urgency: 'Urgent',
        neededBy: new Date(Date.now() - 3600000), // 1 hour in the past
        status: 'published',
        publishedAt: new Date(Date.now() - 7200000),
        responseCount: 0,
        createdByAdminId: adminUser._id,
      });
      testIds.requestIds.push(expiredReq._id as mongoose.Types.ObjectId);

      // 1. Published requests appear in donor dashboard list via exact frontend call (?page=1&limit=10)
      const donorListRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(donorListRes.status, 200);
      const donorListBody = (await donorListRes.json()) as { requests: TestDonationRequestItem[] };
      const foundInDonorList = donorListBody.requests.some((r) => r.id === draftRequestId);
      assert.equal(foundInDonorList, true, 'Published request with future deadline must appear in donor list');

      const foundNoDeadline = donorListBody.requests.some((r) => r.id === noDeadlineReq._id.toString());
      assert.equal(foundNoDeadline, true, 'Published request without deadline (null) must appear in donor list');

      const foundExpired = donorListBody.requests.some((r) => r.id === expiredReq._id.toString());
      assert.equal(foundExpired, false, 'Expired request must NOT appear in donor list');

      // 2. Donor 1 accepts
      const acceptRes1 = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${draftRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(acceptRes1.status, 201);

      // 3. Donor 2 accepts
      const acceptRes2 = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${draftRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donor2Token}` },
      });
      assert.equal(acceptRes2.status, 201);

      // 4. Admin detail endpoint reflects updated responseCount (2)
      const detailRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(detailRes.status, 200);
      const detailBody = (await detailRes.json()) as { request: TestDonationRequestDetail };
      assert.equal(detailBody.request.responseCount, 2);
      draftUpdatedAt = detailBody.request.updatedAt;

      // 5. Admin queries donor responses
      const respRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}/responses?page=1&limit=10`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(respRes.status, 200);
      const respBody = (await respRes.json()) as { responses: TestDonorResponseItem[]; pagination: { total: number } };
      assert.equal(respBody.responses.length, 2);
      assert.equal(respBody.pagination.total, 2);

      const donor1Resp = respBody.responses.find((r) => r.donorName === 'Kamal Donor');
      assert.ok(donor1Resp, 'Kamal Donor must be in responses');
      assert.equal(donor1Resp.donorBloodGroup, 'B+');
      assert.equal(donor1Resp.donorDistrict, 'Colombo');
      assert.equal(donor1Resp.status, 'willing_to_donate');
      assert.ok(donor1Resp.acceptedAt);

      // Ensure privacy: no password, tokens, or phone leaked in donor response
      assert.equal(donor1Resp.passwordHash, undefined);
      assert.equal(donor1Resp.phone, undefined);
      assert.equal(donor1Resp.email, undefined);
    });

    await t.test('7. Admin closure preserves concurrency, history, and rejects new acceptance', async () => {
      // 1. Stale closure conflict
      const staleCloseRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}/close`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expectedUpdatedAt: new Date(Date.now() - 500000).toISOString(),
        }),
      });
      assert.equal(staleCloseRes.status, 409);

      // 2. Successful closure
      const okCloseRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}/close`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expectedUpdatedAt: draftUpdatedAt,
        }),
      });
      assert.equal(okCloseRes.status, 200);
      const closeBody = (await okCloseRes.json()) as { request: TestDonationRequestItem };
      assert.equal(closeBody.request.status, 'closed');
      assert.ok(closeBody.request.closedAt);
      assert.equal(closeBody.request.responseCount, 2, 'responseCount must be preserved after closure');
      draftUpdatedAt = closeBody.request.updatedAt;

      // 3. Request leaves donor available list
      const donorListAfterClose = await fetch(`http://127.0.0.1:${port}/api/donation-requests?bloodGroup=B%2B`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      const donorListAfterCloseBody = (await donorListAfterClose.json()) as { requests: TestDonationRequestItem[] };
      const inList = donorListAfterCloseBody.requests.some((r) => r.id === draftRequestId);
      assert.equal(inList, false, 'Closed request must not appear in donor available list');

      // 4. New donor cannot accept closed request
      const thirdDonor = await User.create({
        name: 'Third Donor',
        email: `third.donor.${Date.now()}@example.com`,
        passwordHash: 'hashed_pw_3',
        role: 'donor',
        bloodGroup: 'B+',
      });
      const thirdDonorToken = jwt.sign(
        { id: thirdDonor._id.toString() },
        jwtSecret,
        { expiresIn: '1h' },
      );
      const rejectAcceptAfterClose = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${draftRequestId}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${thirdDonorToken}` },
      });
      assert.equal(rejectAcceptAfterClose.status, 400);
      const rejectBody = (await rejectAcceptAfterClose.json()) as { message: string };
      assert.ok(rejectBody.message);
      await User.findByIdAndDelete(thirdDonor._id);

      // 5. Existing donor acceptance history remains accessible and marked closed
      const donorHistoryRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/my-accepted`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(donorHistoryRes.status, 200);
      const donorHistoryBody = (await donorHistoryRes.json()) as { acceptedRequests: TestAcceptedHistoryItem[] };
      const myItem = donorHistoryBody.acceptedRequests.find((item) => item.donationRequestId === draftRequestId);
      assert.ok(myItem, 'Donor must still find accepted request in history');
      assert.equal(myItem.availability, 'closed');

      // 6. Cannot close an already closed request
      const doubleCloseRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}/close`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          expectedUpdatedAt: draftUpdatedAt,
        }),
      });
      assert.equal(doubleCloseRes.status, 409);

      // 7. Cannot edit a closed request
      const editClosedRes = await fetch(`http://127.0.0.1:${port}/api/admin/donation-requests/${draftRequestId}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          locationDescription: 'Should fail',
          expectedUpdatedAt: draftUpdatedAt,
        }),
      });
      assert.equal(editClosedRes.status, 409);
    });

    await t.test('8. Preservation check: no patient requests or fulfillments altered', async () => {
      const finalBloodRequestCount = await BloodRequest.countDocuments();
      assert.equal(
        finalBloodRequestCount,
        initialBloodRequestCount,
        'No patient blood requests should be created, altered, or deleted',
      );
    });
  } finally {
    // Teardown isolated test fixtures
    if (testIds.adminUserId) await User.findByIdAndDelete(testIds.adminUserId);
    if (testIds.donorUserId) await User.findByIdAndDelete(testIds.donorUserId);
    if (testIds.donor2UserId) await User.findByIdAndDelete(testIds.donor2UserId);
    if (testIds.recipientUserId) await User.findByIdAndDelete(testIds.recipientUserId);

    if (testIds.requestIds.length > 0) {
      await DonationRequest.deleteMany({ _id: { $in: testIds.requestIds } });
      await DonationResponse.deleteMany({ donationRequestId: { $in: testIds.requestIds } });
    }

    server.close();
    await mongoose.disconnect();
  }
});

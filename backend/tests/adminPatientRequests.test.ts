import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/users/user.model.js';
import { BloodRequest } from '../src/modules/requests/request.model.js';

interface AdminListItem {
  id: string;
  patientName: string;
  bloodGroup: string;
  unitsRequired: number;
  unitsFulfilled: number;
  hospitalId: string;
  hospitalName: string;
  hospitalReferenceAndWard: string;
  urgency: string;
  status: string;
  rejectionReason: string | null;
  reviewedAt: string | null;
  reviewedBy: string | null;
  document: {
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    storageKey?: string;
  };
  storageKey?: string;
  deliveryAssignment: {
    assignmentId: string;
    deliveryPersonName: string;
    contactPhone: string;
    assignedAt: string;
    arrivalConfirmedAt: string | null;
    isArrivalConfirmed: boolean;
  } | null;
  createdAt: string;
  updatedAt: string;
}

interface AdminListResponse {
  requests: AdminListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
  counts: {
    pending: number;
    verified: number;
    inProgress: number;
    rejected: number;
  };
}

interface AdminDetailResponse {
  message?: string;
  request: AdminListItem & {
    requester: {
      id: string;
      name: string;
      email: string;
      phone: string;
      district: string;
      city: string;
      passwordHash?: string;
    };
    reviewer: {
      id: string;
      name: string;
      email: string;
    } | null;
  };
}

interface OwnerRequestsResponse {
  requests: Array<{
    id: string;
    status: string;
    patientName: string;
    rejectionReason?: string | null;
  }>;
  counts: {
    pending: number;
    active: number;
    fulfilled: number;
    rejected: number;
  };
}

function parseAdminListResponse(json: unknown): AdminListResponse {
  assert.ok(json && typeof json === 'object', 'Response must be an object');
  const record = json as Record<string, unknown>;
  assert.ok(Array.isArray(record.requests), 'Response requests must be an array');
  assert.ok(record.pagination && typeof record.pagination === 'object', 'Response pagination must be an object');
  return json as AdminListResponse;
}

function parseAdminDetailResponse(json: unknown): AdminDetailResponse {
  assert.ok(json && typeof json === 'object', 'Response must be an object');
  const record = json as Record<string, unknown>;
  assert.ok(record.request && typeof record.request === 'object', 'Response must contain request object');
  const req = record.request as Record<string, unknown>;
  assert.ok(typeof req.id === 'string', 'Request must have string id');
  return json as AdminDetailResponse;
}

function parseOwnerRequestsResponse(json: unknown): OwnerRequestsResponse {
  assert.ok(json && typeof json === 'object', 'Response must be an object');
  const record = json as Record<string, unknown>;
  assert.ok(Array.isArray(record.requests), 'Response requests must be an array');
  assert.ok(record.counts && typeof record.counts === 'object', 'Response counts must be an object');
  return json as OwnerRequestsResponse;
}

test('Admin Page 2 — Patient Requests Management Integration', async (t) => {
  if (!env.MONGODB_URI) {
    t.skip('MONGODB_URI not configured, skipping DB-backed integration tests');
    return;
  }

  await connectDatabase(env.MONGODB_URI);

  const app = createApp();
  const server = app.listen(0);
  const address = server.address();
  const port = typeof address === 'object' && address ? address.port : 0;
  const baseUrl = `http://127.0.0.1:${port}/api`;

  const jwtSecret = env.JWT_SECRET || 'dev-secret-key-change-in-production';

  const testIds: {
    adminUserId?: string;
    donorUserId?: string;
    requesterUserId?: string;
    requestIds: mongoose.Types.ObjectId[];
  } = {
    requestIds: [],
  };

  // Helper to create a dummy test file in uploads/requests
  const uploadDir = path.resolve(process.cwd(), 'uploads', 'requests');
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }
  const testStorageKey = `test_doc_${Date.now()}.pdf`;
  const testFilePath = path.join(uploadDir, testStorageKey);
  fs.writeFileSync(testFilePath, '%PDF-1.4 test document content for admin verification');

  try {
    // 1. Create test users
    const adminUser = await User.create({
      name: 'Dr. Test Administrator',
      email: `admin.patientreq.${Date.now()}@example.com`,
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
      name: 'Non Admin Donor',
      email: `donor.patientreq.${Date.now()}@example.com`,
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

    const requesterUser = await User.create({
      name: 'Patient Requester',
      email: `requester.patientreq.${Date.now()}@example.com`,
      phone: '0771234567',
      passwordHash: 'hashed_pw_test',
      role: 'recipient',
      bloodGroup: 'B+',
      district: 'Colombo',
      isAvailable: false,
      isEligible: false,
      donationCount: 0,
    });
    testIds.requesterUserId = requesterUser._id.toString();
    const requesterToken = jwt.sign({ id: requesterUser._id.toString() }, jwtSecret, { expiresIn: '1h' });

    // 2. Create sample blood request fixture
    const sampleRequest = await BloodRequest.create({
      requesterId: requesterUser._id,
      patientName: 'Kavindu Perera',
      bloodGroup: 'B+',
      unitsRequired: 2,
      unitsFulfilled: 0,
      hospitalId: 'hosp_nHSL',
      hospitalName: 'National Hospital of Sri Lanka',
      hospitalReferenceAndWard: 'Ward 14, Bed 8',
      urgency: 'Urgent',
      status: 'pending_verification',
      document: {
        originalName: 'hospital_requisition.pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        storageKey: testStorageKey,
      },
    });
    testIds.requestIds.push(sampleRequest._id);

    // TEST 1: Auth & Role Enforcement
    await t.test('Admin endpoints reject unauthenticated or non-admin callers', async () => {
      // Unauthenticated
      const resUnauth = await fetch(`${baseUrl}/admin/patient-requests`);
      assert.equal(resUnauth.status, 401, 'Unauthenticated list request must return 401');

      // Non-admin (donor role)
      const resForbidden = await fetch(`${baseUrl}/admin/patient-requests`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(resForbidden.status, 403, 'Non-admin caller must receive 403 Forbidden');

      // Non-admin detail
      const resDetailForbidden = await fetch(`${baseUrl}/admin/patient-requests/${sampleRequest._id}`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(resDetailForbidden.status, 403, 'Non-admin detail must receive 403 Forbidden');

      // Non-admin document stream
      const resDocForbidden = await fetch(
        `${baseUrl}/admin/patient-requests/${sampleRequest._id}/document`,
        { headers: { Authorization: `Bearer ${donorToken}` } },
      );
      assert.equal(resDocForbidden.status, 403, 'Non-admin document access must receive 403 Forbidden');
    });

    // TEST 2: List endpoint projections and filters
    await t.test('Admin list endpoint returns safe projections, search, and pagination', async () => {
      const res = await fetch(`${baseUrl}/admin/patient-requests?status=pending_verification`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200, 'Admin list should return 200');
      const data = parseAdminListResponse(await res.json());
      assert.ok(Array.isArray(data.requests), 'Should return requests array');
      assert.ok(data.pagination, 'Should return pagination metadata');

      const found = data.requests.find((r) => r.id === sampleRequest._id.toString());
      assert.ok(found, 'Created request should be found in list');
      assert.equal(found.patientName, 'Kavindu Perera');
      assert.equal(found.bloodGroup, 'B+');
      assert.equal(found.status, 'pending_verification');

      // CRITICAL: verify storageKey is NOT exposed in list projection
      assert.ok(found.document, 'List item includes document summary');
      assert.equal(found.document.storageKey, undefined, 'List item must NOT expose storageKey');
      assert.equal(found.storageKey, undefined, 'List item must NOT expose storageKey');

      // Bounded search
      const searchRes = await fetch(`${baseUrl}/admin/patient-requests?search=Kavindu`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(searchRes.status, 200);
      const searchData = parseAdminListResponse(await searchRes.json());
      assert.ok(searchData.requests.some((r) => r.id === sampleRequest._id.toString()));
    });

    // TEST 3: Detail endpoint and safe projections
    await t.test('Admin detail endpoint returns full review information without sensitive credentials', async () => {
      const res = await fetch(`${baseUrl}/admin/patient-requests/${sampleRequest._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      const data = parseAdminDetailResponse(await res.json());
      const reqDetail = data.request;

      assert.equal(reqDetail.id, sampleRequest._id.toString());
      assert.equal(reqDetail.patientName, 'Kavindu Perera');
      assert.equal(reqDetail.requester.email, requesterUser.email);
      assert.equal(reqDetail.requester.phone, '0771234567');
      assert.equal(reqDetail.requester.passwordHash, undefined, 'Must NEVER return passwordHash');
      assert.equal(reqDetail.document.storageKey, undefined, 'Must NEVER return storageKey in JSON');
      assert.equal(reqDetail.document.originalName, 'hospital_requisition.pdf');
    });

    // TEST 4: Authenticated document stream with security headers
    await t.test('Document stream endpoint serves file with private cache headers and Content-Disposition', async () => {
      const res = await fetch(`${baseUrl}/admin/patient-requests/${sampleRequest._id}/document`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);
      assert.equal(res.headers.get('content-type'), 'application/pdf');
      assert.ok(res.headers.get('content-disposition')?.includes('hospital_requisition.pdf'));
      assert.ok(res.headers.get('cache-control')?.includes('no-store'));

      const bodyText = await res.text();
      assert.ok(bodyText.includes('%PDF-1.4 test document content'));
    });

    // TEST 5: Rejection workflow and validation
    await t.test('Rejection requires valid reason, records reviewer audit, and displays in owner history', async () => {
      // Create request to reject
      const reqToReject = await BloodRequest.create({
        requesterId: requesterUser._id,
        patientName: 'Sunil Silva',
        bloodGroup: 'A-',
        unitsRequired: 1,
        unitsFulfilled: 0,
        hospitalId: 'hosp_nHSL',
        hospitalName: 'National Hospital',
        hospitalReferenceAndWard: 'Ward 2',
        urgency: 'Scheduled',
        status: 'pending_verification',
        document: {
          originalName: 'dummy.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 500,
          storageKey: testStorageKey,
        },
      });
      testIds.requestIds.push(reqToReject._id);

      // Rejection with empty reason must fail
      const emptyReasonRes = await fetch(`${baseUrl}/admin/patient-requests/${reqToReject._id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ reason: ' ' }),
      });
      assert.equal(emptyReasonRes.status, 400, 'Rejection without reason must fail with 400');

      // Valid rejection
      const validRejectRes = await fetch(`${baseUrl}/admin/patient-requests/${reqToReject._id}/reject`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: 'Uploaded doctor memo is missing the official hospital stamp.',
          expectedUpdatedAt: reqToReject.updatedAt.toISOString(),
        }),
      });
      assert.equal(validRejectRes.status, 200, 'Valid rejection should succeed');
      const rejectData = parseAdminDetailResponse(await validRejectRes.json());
      assert.equal(rejectData.request.status, 'rejected');
      assert.equal(
        rejectData.request.rejectionReason,
        'Uploaded doctor memo is missing the official hospital stamp.',
      );
      assert.equal(rejectData.request.reviewedBy, adminUser._id.toString());
      assert.ok(rejectData.request.requester, 'Rejection response must include requester');
      assert.equal(rejectData.request.requester.name, requesterUser.name);

      // Owner visibility: My Requests rejected tab
      const ownerReqRes = await fetch(`${baseUrl}/requests/my?tab=rejected`, {
        headers: { Authorization: `Bearer ${requesterToken}` },
      });
      assert.equal(ownerReqRes.status, 200);
      const ownerData = parseOwnerRequestsResponse(await ownerReqRes.json());
      assert.ok(ownerData.requests.some((r) => r.id === reqToReject._id.toString()));
      assert.ok(ownerData.counts.rejected >= 1);

      // Owner cannot edit or delete rejected request
      const ownerDeleteRes = await fetch(`${baseUrl}/requests/${reqToReject._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${requesterToken}` },
      });
      assert.equal(ownerDeleteRes.status, 409, 'Owner cannot delete rejected request');
    });

    // TEST 6: Stale review protection (concurrent edit/delete)
    await t.test('Stale review fails when expectedUpdatedAt does not match latest record', async () => {
      const staleRequest = await BloodRequest.create({
        requesterId: requesterUser._id,
        patientName: 'Stale Patient',
        bloodGroup: 'O+',
        unitsRequired: 1,
        unitsFulfilled: 0,
        hospitalId: 'hosp_nHSL',
        hospitalName: 'National Hospital',
        hospitalReferenceAndWard: 'Ward 5',
        urgency: 'Urgent',
        status: 'pending_verification',
        document: {
          originalName: 'dummy.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 500,
          storageKey: testStorageKey,
        },
      });
      testIds.requestIds.push(staleRequest._id);

      const oldUpdatedAt = staleRequest.updatedAt.toISOString();

      // Simulate patient editing request concurrently
      await BloodRequest.findByIdAndUpdate(staleRequest._id, {
        patientName: 'Stale Patient Renamed',
        updatedAt: new Date(Date.now() + 5000),
      });

      // Admin tries to approve with old expectedUpdatedAt
      const staleApproveRes = await fetch(
        `${baseUrl}/admin/patient-requests/${staleRequest._id}/approve`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expectedUpdatedAt: oldUpdatedAt }),
        },
      );
      assert.equal(staleApproveRes.status, 409, 'Stale approval must return 409 Conflict');
    });

    // TEST 7: Approval transitions to verified and saves audit metadata
    await t.test('Approval transitions pending request to verified with audit record and complete detail shape', async () => {
      const res = await fetch(`${baseUrl}/admin/patient-requests/${sampleRequest._id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ expectedUpdatedAt: sampleRequest.updatedAt.toISOString() }),
      });
      assert.equal(res.status, 200);
      const data = parseAdminDetailResponse(await res.json());
      assert.equal(data.request.status, 'verified');
      assert.equal(data.request.reviewedBy, adminUser._id.toString());
      assert.ok(data.request.reviewedAt);

      // Regression coverage: verify complete detail shape returned after approval (prevents runtime crash on line 1151)
      assert.ok(data.request.requester, 'Approval response must include complete requester object');
      assert.equal(data.request.requester.id, requesterUser._id.toString());
      assert.equal(data.request.requester.name, requesterUser.name);
      assert.equal(data.request.requester.email, requesterUser.email);
      assert.equal(data.request.requester.phone, '0771234567');
      assert.equal(data.request.reviewer?.id, adminUser._id.toString());
      assert.equal(data.request.reviewer?.name, adminUser.name);
      assert.equal(data.request.deliveryAssignment, null, 'Approval must not have delivery assignment yet');
      assert.equal(data.request.document.originalName, 'hospital_requisition.pdf');
      assert.equal(data.request.document.storageKey, undefined, 'Must not expose storageKey');

      // Regression coverage: verify pending_verification list filter excludes the approved request
      const pendingListRes = await fetch(`${baseUrl}/admin/patient-requests?status=pending_verification`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(pendingListRes.status, 200);
      const pendingListData = parseAdminListResponse(await pendingListRes.json());
      assert.equal(
        pendingListData.requests.some((r) => r.id === sampleRequest._id.toString()),
        false,
        'Approved request must be removed from the pending_verification list filter',
      );

      // Regression coverage: verify verified list filter includes the approved request
      const verifiedListRes = await fetch(`${baseUrl}/admin/patient-requests?status=verified`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(verifiedListRes.status, 200);
      const verifiedListData = parseAdminListResponse(await verifiedListRes.json());
      assert.ok(
        verifiedListData.requests.some((r) => r.id === sampleRequest._id.toString()),
        'Approved request must appear in the verified list filter',
      );

      // Detail endpoint still returns complete populated detail
      const verifiedDetailRes = await fetch(`${baseUrl}/admin/patient-requests/${sampleRequest._id}`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(verifiedDetailRes.status, 200);
      const verifiedDetailData = parseAdminDetailResponse(await verifiedDetailRes.json());
      assert.equal(verifiedDetailData.request.status, 'verified');
      assert.equal(verifiedDetailData.request.requester.name, requesterUser.name);

      // Verify DB document
      const dbReq = await BloodRequest.findById(sampleRequest._id);
      assert.equal(dbReq?.status, 'verified');
      assert.equal(dbReq?.unitsFulfilled, 0, 'Approval must not increment units fulfilled');
      assert.equal(dbReq?.deliveryAssignment, undefined, 'Approval must not auto-assign delivery');

      // Cannot review already approved request
      const repeatRes = await fetch(`${baseUrl}/admin/patient-requests/${sampleRequest._id}/approve`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${adminToken}`,
          'Content-Type': 'application/json',
        },
      });
      assert.equal(repeatRes.status, 409, 'Non-pending request cannot be approved again (conflict)');
    });

    // TEST 8: Delivery person assignment and reassignment safety
    await t.test('Delivery person assignment and atomic reassignment coordination with arrival', async () => {
      // 1. Initial Assignment
      const assignRes = await fetch(
        `${baseUrl}/admin/patient-requests/${sampleRequest._id}/assign-delivery`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deliveryPersonName: 'Kasun Wickramasinghe',
            contactPhone: '0773344556',
          }),
        },
      );
      assert.equal(assignRes.status, 200, 'Initial delivery assignment should succeed');
      const assignData = parseAdminDetailResponse(await assignRes.json());
      const firstAssignment = assignData.request.deliveryAssignment;
      assert.ok(firstAssignment, 'Initial assignment must exist');
      assert.ok(firstAssignment.assignmentId, 'assignmentId must be server-generated');
      assert.equal(firstAssignment.deliveryPersonName, 'Kasun Wickramasinghe');
      assert.equal(firstAssignment.contactPhone, '0773344556');
      assert.equal(firstAssignment.arrivalConfirmedAt, null);
      assert.ok(assignData.request.requester, 'Assign response must retain complete requester object');
      assert.equal(assignData.request.requester.name, requesterUser.name);

      // 2. Safe Reassignment before arrival confirmation
      const reassignRes = await fetch(
        `${baseUrl}/admin/patient-requests/${sampleRequest._id}/assign-delivery`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deliveryPersonName: 'Saman Kumara',
            contactPhone: '0718899001',
            expectedAssignmentId: firstAssignment.assignmentId,
            confirmReassignment: true,
          }),
        },
      );
      assert.equal(reassignRes.status, 200, 'Reassignment should succeed');
      const reassignData = parseAdminDetailResponse(await reassignRes.json());
      const secondAssignment = reassignData.request.deliveryAssignment;
      assert.ok(secondAssignment, 'Reassigned delivery assignment must exist');
      assert.notEqual(
        secondAssignment.assignmentId,
        firstAssignment.assignmentId,
        'Reassignment must generate new assignmentId',
      );
      assert.equal(secondAssignment.deliveryPersonName, 'Saman Kumara');
      assert.equal(secondAssignment.arrivalConfirmedAt, null);
      assert.ok(reassignData.request.requester, 'Reassign response must retain complete requester object');
      assert.equal(reassignData.request.requester.name, requesterUser.name);

      // 3. Stale requester tries to confirm arrival using the old first assignmentId -> must fail
      const staleConfirmRes = await fetch(
        `${baseUrl}/requests/${sampleRequest._id}/delivery-assignment/confirm-arrival`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${requesterToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assignmentId: firstAssignment.assignmentId }),
        },
      );
      assert.equal(staleConfirmRes.status, 409, 'Confirming stale assignmentId must return 409 Conflict');

      // 4. Requester confirms arrival against the active second assignmentId -> succeeds
      const validConfirmRes = await fetch(
        `${baseUrl}/requests/${sampleRequest._id}/delivery-assignment/confirm-arrival`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${requesterToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ assignmentId: secondAssignment.assignmentId }),
        },
      );
      assert.equal(validConfirmRes.status, 200, 'Confirming active assignmentId should succeed');

      // 5. Attempting reassignment AFTER arrival is confirmed must fail with 409 Conflict
      const reassignAfterArrivalRes = await fetch(
        `${baseUrl}/admin/patient-requests/${sampleRequest._id}/assign-delivery`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${adminToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            deliveryPersonName: 'Nimal Bandara',
            contactPhone: '0761122334',
            expectedAssignmentId: secondAssignment.assignmentId,
            confirmReassignment: true,
          }),
        },
      );
      assert.equal(
        reassignAfterArrivalRes.status,
        409,
        'Cannot reassign once requester arrival is confirmed',
      );

      // Verify arrival confirmation is untouched
      const dbFinalReq = await BloodRequest.findById(sampleRequest._id);
      assert.ok(
        dbFinalReq?.deliveryAssignment?.arrivalConfirmedAt,
        'Confirmed arrival metadata must be preserved',
      );
      assert.equal(dbFinalReq?.deliveryAssignment?.deliveryPersonName, 'Saman Kumara');
    });
  } catch (err) {
    console.error('TEST CAUGHT ERROR:', err);
    throw err;
  } finally {
    // Cleanup test file
    try {
      if (fs.existsSync(testFilePath)) {
        fs.unlinkSync(testFilePath);
      }
    } catch {
      // ignore
    }

    // Cleanup test database documents
    if (testIds.adminUserId) await User.findByIdAndDelete(testIds.adminUserId);
    if (testIds.donorUserId) await User.findByIdAndDelete(testIds.donorUserId);
    if (testIds.requesterUserId) await User.findByIdAndDelete(testIds.requesterUserId);
    if (testIds.requestIds.length > 0) {
      await BloodRequest.deleteMany({ _id: { $in: testIds.requestIds } });
    }

    server.close();
    await mongoose.disconnect();
  }
});

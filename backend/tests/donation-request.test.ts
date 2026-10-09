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

test('Donation Requests API Integration (Member 3.1 & 3.2)', async (t) => {
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
    donorUserId?: string;
    donor2UserId?: string;
    recipientUserId?: string;
    requestIds: mongoose.Types.ObjectId[];
    responseIds: mongoose.Types.ObjectId[];
  } = {
    requestIds: [],
    responseIds: [],
  };

  interface RequestDetailBody {
    request: {
      id: string;
      bloodGroup: string;
      unitsRequired: number;
      isAvailable: boolean;
      donorResponse: {
        status: string;
        acceptedAt: string;
      } | null;
      internalRequestId?: unknown;
      createdByAdminId?: unknown;
    };
  }

  interface AcceptBody {
    message: string;
    donorResponse: {
      status: string;
      acceptedAt: string;
    };
  }

  try {
    // 1. Create isolated donor test user
    const donorUser = await User.create({
      name: 'Anura Donor',
      email: `anura.donor.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_test',
      role: 'donor',
      bloodGroup: 'A+',
      district: 'Colombo',
      isAvailable: true,
      isEligible: true,
      donationCount: 4,
    });
    testIds.donorUserId = donorUser._id.toString();
    const donorToken = jwt.sign({ id: donorUser._id.toString() }, jwtSecret, { expiresIn: '1h' });

    // 2. Create isolated recipient test user
    const recipientUser = await User.create({
      name: 'Nimal Recipient',
      email: `nimal.recipient.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_test',
      role: 'recipient',
      bloodGroup: 'B-',
      district: 'Colombo',
      isAvailable: false,
      isEligible: false,
      donationCount: 0,
    });
    testIds.recipientUserId = recipientUser._id.toString();
    const recipientToken = jwt.sign({ id: recipientUser._id.toString() }, jwtSecret, { expiresIn: '1h' });

    // 3. Create test donation requests with varied states:
    // a. Published and valid (needed in 5 days)
    const futureDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const reqPublished1 = await DonationRequest.create({
      bloodGroup: 'O+',
      unitsRequired: 3,
      hospitalId: 'hosp-colombo-city',
      hospitalName: 'City Hospital, Colombo',
      locationDescription: 'Main Blood Bank, 2nd Floor',
      urgency: 'Urgent',
      neededBy: futureDate,
      status: 'published',
      publishedAt: new Date(Date.now() - 2000),
    });
    testIds.requestIds.push(reqPublished1._id);

    // b. Published and valid with no deadline
    const reqPublished2 = await DonationRequest.create({
      bloodGroup: 'B-',
      unitsRequired: 1,
      hospitalId: 'hosp-nbts-narahenpita',
      hospitalName: 'National Blood Transfusion Service, Narahenpita',
      locationDescription: 'Donor Reception Hall A',
      urgency: 'Scheduled',
      neededBy: null,
      status: 'published',
      publishedAt: new Date(Date.now() - 1000),
    });
    testIds.requestIds.push(reqPublished2._id);

    // c. Draft (must be excluded)
    const reqDraft = await DonationRequest.create({
      bloodGroup: 'AB+',
      unitsRequired: 2,
      hospitalId: 'hosp-cnh-colombo',
      hospitalName: 'Colombo National Hospital Blood Bank',
      locationDescription: 'Ward 8 Counter',
      urgency: 'Urgent',
      status: 'draft',
    });
    testIds.requestIds.push(reqDraft._id);

    // d. Closed (must be excluded)
    const reqClosed = await DonationRequest.create({
      bloodGroup: 'A-',
      unitsRequired: 4,
      hospitalId: 'hosp-sjh-kotte',
      hospitalName: 'Sri Jayewardenepura General Hospital',
      locationDescription: 'Blood Collection Room',
      urgency: 'Scheduled',
      status: 'closed',
      closedAt: new Date(),
    });
    testIds.requestIds.push(reqClosed._id);

    // e. Expired: published but neededBy was yesterday (must be excluded)
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const reqExpired = await DonationRequest.create({
      bloodGroup: 'O-',
      unitsRequired: 2,
      hospitalId: 'hosp-kandy-gen',
      hospitalName: 'Kandy National Hospital',
      locationDescription: 'Transfusion Unit',
      urgency: 'Urgent',
      neededBy: pastDate,
      status: 'published',
      publishedAt: new Date(Date.now() - 48 * 60 * 60 * 1000),
    });
    testIds.requestIds.push(reqExpired._id);

    // Test 1: Unauthenticated access rejected
    await t.test('rejects unauthenticated access with 401', async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/donation-requests`);
      assert.equal(res.status, 401);
    });

    // Test 2: Non-donor access rejected with 403
    await t.test('rejects non-donor role (recipient) with 403', async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/donation-requests`, {
        headers: { Authorization: `Bearer ${recipientToken}` },
      });
      assert.equal(res.status, 403);
      const body = (await res.json()) as { message: string };
      assert.match(body.message, /restricted to registered blood donors/i);
    });

    // Test 3: Donor lists published requests only
    await t.test('authenticated donor receives only published and non-expired requests', async () => {
      const res = await fetch(`http://127.0.0.1:${port}/api/donation-requests`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(res.status, 200);
      const body = (await res.json()) as {
        requests: Array<{
          id: string;
          bloodGroup: string;
          unitsRequired: number;
          hospitalName: string;
          locationDescription: string;
          urgency: string;
          neededBy: string | null;
          status: string;
          internalRequestId?: unknown;
          createdByAdminId?: unknown;
        }>;
        pagination: {
          page: number;
          limit: number;
          total: number;
        };
      };

      assert.ok(Array.isArray(body.requests));
      const receivedIds = body.requests.map((r) => r.id);

      // Must include valid published requests
      assert.ok(receivedIds.includes(reqPublished1._id.toString()));
      assert.ok(receivedIds.includes(reqPublished2._id.toString()));

      // Must exclude draft, closed, and expired
      assert.equal(receivedIds.includes(reqDraft._id.toString()), false);
      assert.equal(receivedIds.includes(reqClosed._id.toString()), false);
      assert.equal(receivedIds.includes(reqExpired._id.toString()), false);

      // Safe projection: no internal IDs or admin IDs
      for (const req of body.requests) {
        assert.equal(req.internalRequestId, undefined);
        assert.equal(req.createdByAdminId, undefined);
        assert.equal(req.status, 'published');
        assert.ok(req.hospitalName);
        assert.ok(req.bloodGroup);
        assert.ok(req.unitsRequired > 0);
      }
    });

    // Test 4: Pagination validation and deterministic ordering
    await t.test('validates pagination params and orders by publishedAt descending', async () => {
      // Invalid page
      const badPageRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests?page=-1`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(badPageRes.status, 400);

      // Invalid limit (> 50)
      const badLimitRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests?limit=100`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(badLimitRes.status, 400);

      // Valid paginated request with limit 1
      const p1Res = await fetch(`http://127.0.0.1:${port}/api/donation-requests?page=1&limit=1`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(p1Res.status, 200);
      const p1Body = (await p1Res.json()) as { requests: Array<{ id: string }>; pagination: { hasNextPage: boolean } };
      assert.equal(p1Body.requests.length, 1);
      // reqPublished2 has a newer publishedAt than reqPublished1, so it must be first
      assert.equal(p1Body.requests[0]?.id, reqPublished2._id.toString());
      assert.equal(p1Body.pagination.hasNextPage, true);
    });

    // Test 5: Reading does not mutate database
    await t.test('reading requests does not mutate status, counts, or records', async () => {
      const beforeDoc = await DonationRequest.findById(reqPublished1._id);
      assert.ok(beforeDoc);
      const beforeStatus = beforeDoc.status;
      const beforeUnits = beforeDoc.unitsRequired;

      await fetch(`http://127.0.0.1:${port}/api/donation-requests`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });

      const afterDoc = await DonationRequest.findById(reqPublished1._id);
      assert.ok(afterDoc);
      assert.equal(afterDoc.status, beforeStatus);
      assert.equal(afterDoc.unitsRequired, beforeUnits);
    });

    // ----------------- MEMBER 3.2: DETAILS & ACCEPTANCE TESTS -----------------

    // Test 6: GET /api/donation-requests/:id security, validation & privacy
    await t.test('GET /api/donation-requests/:id enforces auth, role, and privacy', async () => {
      // a. 401 unauthenticated
      const unauthRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqPublished1._id}`);
      assert.equal(unauthRes.status, 401);

      // b. 403 non-donor role
      const nonDonorRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqPublished1._id}`, {
        headers: { Authorization: `Bearer ${recipientToken}` },
      });
      assert.equal(nonDonorRes.status, 403);

      // c. 400 invalid ObjectId
      const invalidIdRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/not-an-id`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(invalidIdRes.status, 400);

      // d. 404 non-existent
      const fakeId = new mongoose.Types.ObjectId();
      const notFoundRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${fakeId}`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(notFoundRes.status, 404);

      // e. 404 draft request (must remain private)
      const draftRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqDraft._id}`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(draftRes.status, 404);

      // f. 200 published request returns safe details & isAvailable: true
      const publishedRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqPublished1._id}`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(publishedRes.status, 200);
      const pubBody = (await publishedRes.json()) as RequestDetailBody;
      assert.equal(pubBody.request.id, reqPublished1._id.toString());
      assert.equal(pubBody.request.bloodGroup, 'O+');
      assert.equal(pubBody.request.unitsRequired, 3);
      assert.equal(pubBody.request.isAvailable, true);
      assert.equal(pubBody.request.donorResponse, null);
      // Verify private fields omitted
      assert.equal(pubBody.request.internalRequestId, undefined);
      assert.equal(pubBody.request.createdByAdminId, undefined);

      // g. 200 expired request returns safe details & isAvailable: false
      const expiredRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqExpired._id}`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(expiredRes.status, 200);
      const expBody = (await expiredRes.json()) as RequestDetailBody;
      assert.equal(expBody.request.isAvailable, false);

      // h. 200 closed request returns safe details & isAvailable: false
      const closedRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqClosed._id}`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(closedRes.status, 200);
      const clsBody = (await closedRes.json()) as RequestDetailBody;
      assert.equal(clsBody.request.isAvailable, false);
    });

    // Test 7: POST /api/donation-requests/:id/accept permissions & validation
    await t.test('POST /api/donation-requests/:id/accept validates requests and state', async () => {
      // a. 401 unauthenticated
      const unauthAccept = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqPublished1._id}/accept`, {
        method: 'POST',
      });
      assert.equal(unauthAccept.status, 401);

      // b. 403 non-donor role
      const nonDonorAccept = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqPublished1._id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${recipientToken}` },
      });
      assert.equal(nonDonorAccept.status, 403);

      // c. 404 draft request cannot be accepted
      const draftAccept = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqDraft._id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(draftAccept.status, 404);

      // d. 400 closed request cannot receive acceptance
      const closedAccept = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqClosed._id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(closedAccept.status, 400);

      // e. 400 expired request cannot receive acceptance
      const expiredAccept = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqExpired._id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(expiredAccept.status, 400);
    });

    // Test 8: Successful acceptance, server-derived identity, idempotency, and donor isolation
    await t.test('POST /api/donation-requests/:id/accept records willingness and maintains idempotency and isolation', async () => {
      // 1. Create a second donor to test multi-donor response isolation
      const donor2User = await User.create({
        name: 'Kamal Donor 2',
        email: `kamal.donor2.${Date.now()}@example.com`,
        passwordHash: 'hashed_pw_test_2',
        role: 'donor',
        bloodGroup: 'O+',
        district: 'Gampaha',
        isAvailable: true,
        isEligible: true,
        donationCount: 1,
      });
      testIds.donor2UserId = donor2User._id.toString();
      const donor2Token = jwt.sign({ id: donor2User._id.toString() }, jwtSecret, { expiresIn: '1h' });

      // 2. Donor 1 accepts reqPublished1
      const acceptRes1 = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqPublished1._id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(acceptRes1.status, 201);
      const acceptBody1 = (await acceptRes1.json()) as AcceptBody;
      assert.equal(acceptBody1.donorResponse.status, 'accepted');
      assert.ok(acceptBody1.donorResponse.acceptedAt);

      // 3. Verify server-derived donor identity in DB
      const dbResponse = await DonationResponse.findOne({
        donationRequestId: reqPublished1._id,
        donorId: donorUser._id,
      });
      assert.ok(dbResponse);
      assert.equal(dbResponse.status, 'accepted');
      assert.equal(dbResponse.donorId.toString(), donorUser._id.toString());
      testIds.responseIds.push(dbResponse._id);

      // 4. Repeat acceptance by Donor 1 (idempotent, returns original response)
      const repeatRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqPublished1._id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(repeatRes.status, 200);
      const repeatBody = (await repeatRes.json()) as AcceptBody;
      assert.equal(repeatBody.donorResponse.status, 'accepted');
      assert.equal(repeatBody.donorResponse.acceptedAt, acceptBody1.donorResponse.acceptedAt);

      // Ensure no duplicate records were inserted in the database
      const responseCount = await DonationResponse.countDocuments({
        donationRequestId: reqPublished1._id,
        donorId: donorUser._id,
      });
      assert.equal(responseCount, 1);

      // 5. Check GET details by Donor 1: should reflect accepted state
      const donor1DetailsRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqPublished1._id}`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      const donor1Details = (await donor1DetailsRes.json()) as RequestDetailBody;
      assert.ok(donor1Details.request.donorResponse);
      assert.equal(donor1Details.request.donorResponse.status, 'accepted');

      // 6. Check GET details by Donor 2: should be null (donor isolation)
      const donor2DetailsRes = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqPublished1._id}`, {
        headers: { Authorization: `Bearer ${donor2Token}` },
      });
      const donor2Details = (await donor2DetailsRes.json()) as RequestDetailBody;
      assert.equal(donor2Details.request.donorResponse, null);

      // 7. Verify request itself did NOT change (no unit decrement, no status mutation)
      const freshReq = await DonationRequest.findById(reqPublished1._id);
      assert.ok(freshReq);
      assert.equal(freshReq.unitsRequired, 3);
      assert.equal(freshReq.status, 'published');
      assert.equal(freshReq.responseCount, 1);
    });

    // Test 9: Concurrent duplicate acceptance race guarantees single insertion and single count increment
    await t.test('handles parallel concurrent duplicate acceptance submissions safely', async () => {
      const reqConcurrent = await DonationRequest.create({
        bloodGroup: 'AB+',
        unitsRequired: 2,
        hospitalId: 'hosp-concurrent',
        hospitalName: 'Concurrent Test Hospital',
        locationDescription: 'ICU Donor Room',
        urgency: 'Urgent',
        status: 'published',
        publishedAt: new Date(),
      });
      testIds.requestIds.push(reqConcurrent._id);

      // Launch 5 parallel acceptance requests from the same donor at the exact same instant
      const requests = Array.from({ length: 5 }, () =>
        fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqConcurrent._id}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${donorToken}` },
        }),
      );

      const responses = await Promise.all(requests);
      const statuses = responses.map((r) => r.status);

      // Every response must be either 201 (initial write) or 200 (idempotent duplicate)
      assert.ok(statuses.every((s) => s === 201 || s === 200));
      assert.ok(statuses.includes(201)); // At least one succeeded as 201

      const bodies = await Promise.all(responses.map((r) => r.json() as Promise<AcceptBody>));
      const acceptedTimestamps = new Set(bodies.map((b) => b.donorResponse.acceptedAt));
      assert.equal(acceptedTimestamps.size, 1); // Exactly one timestamp preserved across all

      // Verify DB contains exactly 1 response record and responseCount is exactly 1
      const count = await DonationResponse.countDocuments({
        donationRequestId: reqConcurrent._id,
        donorId: donorUser._id,
      });
      assert.equal(count, 1);

      const storedResponse = await DonationResponse.findOne({
        donationRequestId: reqConcurrent._id,
        donorId: donorUser._id,
      });
      assert.ok(storedResponse);
      testIds.responseIds.push(storedResponse._id);

      const refreshedReq = await DonationRequest.findById(reqConcurrent._id);
      assert.ok(refreshedReq);
      assert.equal(refreshedReq.responseCount, 1);
      assert.equal(refreshedReq.unitsRequired, 2); // Requested units untouched
    });

    // Test 10: Controlled acceptance-versus-request-closure interleaving & concurrency
    await t.test('coordinates acceptance versus admin closure atomically and preserves historical acceptance', async () => {
      // 1. Create a fresh published request
      const reqInterleave = await DonationRequest.create({
        bloodGroup: 'O-',
        unitsRequired: 5,
        hospitalId: 'hosp-interleave',
        hospitalName: 'Interleave Test Hospital',
        locationDescription: 'Ward 3',
        urgency: 'Urgent',
        status: 'published',
        publishedAt: new Date(),
      });
      testIds.requestIds.push(reqInterleave._id);

      // 2. Donor 1 accepts successfully before closure
      const accept1 = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqInterleave._id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(accept1.status, 201);
      const acceptBody1 = (await accept1.json()) as AcceptBody;
      const originalAcceptedAt = acceptBody1.donorResponse.acceptedAt;

      const resp1Doc = await DonationResponse.findOne({
        donationRequestId: reqInterleave._id,
        donorId: donorUser._id,
      });
      assert.ok(resp1Doc);
      testIds.responseIds.push(resp1Doc._id);

      // Verify responseCount incremented to 1
      const reqAfterAccept1 = await DonationRequest.findById(reqInterleave._id);
      assert.equal(reqAfterAccept1?.responseCount, 1);

      // 3. Admin closes the request using the documented closure convention
      const closedDoc = await DonationRequest.findOneAndUpdate(
        { _id: reqInterleave._id, status: 'published' },
        { $set: { status: 'closed', closedAt: new Date() } },
        { returnDocument: 'after' },
      );
      assert.ok(closedDoc);
      assert.equal(closedDoc.status, 'closed');

      // 4. A different donor (Donor 2) attempts to accept AFTER closure -> MUST BE REJECTED WITH 400
      const donor2User = await User.findById(testIds.donor2UserId);
      assert.ok(donor2User);
      const donor2Token = jwt.sign({ id: donor2User._id.toString() }, jwtSecret, { expiresIn: '1h' });

      const accept2 = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqInterleave._id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donor2Token}` },
      });
      assert.equal(accept2.status, 400);
      const errorBody2 = (await accept2.json()) as { message: string };
      assert.ok(errorBody2.message.includes('closed'));

      // Ensure NO response record was inserted for Donor 2
      const donor2Count = await DonationResponse.countDocuments({
        donationRequestId: reqInterleave._id,
        donorId: donor2User._id,
      });
      assert.equal(donor2Count, 0);

      // Ensure responseCount was NOT incremented by the rejected attempt
      const reqAfterReject = await DonationRequest.findById(reqInterleave._id);
      assert.equal(reqAfterReject?.responseCount, 1);

      // 5. Donor 1 (who accepted BEFORE closure) retries -> MUST RETURN 200 WITH ORIGINAL TIMESTAMP
      const retryDonor1 = await fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqInterleave._id}/accept`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(retryDonor1.status, 200);
      const retryBody1 = (await retryDonor1.json()) as AcceptBody;
      assert.equal(retryBody1.donorResponse.status, 'accepted');
      assert.equal(retryBody1.donorResponse.acceptedAt, originalAcceptedAt);

      // 6. Test concurrent acceptance and closure race on another fresh request
      const reqRace = await DonationRequest.create({
        bloodGroup: 'B+',
        unitsRequired: 1,
        hospitalId: 'hosp-race',
        hospitalName: 'Race Hospital',
        locationDescription: 'Room 10',
        urgency: 'Scheduled',
        status: 'published',
        publishedAt: new Date(),
      });
      testIds.requestIds.push(reqRace._id);

      // Run acceptance and admin closure concurrently in parallel
      const [raceAcceptRes, raceCloseDoc] = await Promise.all([
        fetch(`http://127.0.0.1:${port}/api/donation-requests/${reqRace._id}/accept`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${donor2Token}` },
        }),
        DonationRequest.findOneAndUpdate(
          { _id: reqRace._id, status: 'published' },
          { $set: { status: 'closed', closedAt: new Date() } },
          { returnDocument: 'after' },
        ),
      ]);

      assert.ok(raceCloseDoc);
      assert.equal(raceCloseDoc.status, 'closed');

      // The outcome must be consistent:
      // If acceptance won first: 201 status, responseCount = 1, DonationResponse exists
      // If closure won first: 400 status, responseCount = 0, DonationResponse does NOT exist
      const raceRespDoc = await DonationResponse.findOne({
        donationRequestId: reqRace._id,
        donorId: donor2User._id,
      });
      const finalReqRace = await DonationRequest.findById(reqRace._id);

      if (raceAcceptRes.status === 201) {
        assert.ok(raceRespDoc);
        testIds.responseIds.push(raceRespDoc._id);
        assert.equal(finalReqRace?.responseCount, 1);
      } else {
        assert.equal(raceAcceptRes.status, 400);
        assert.equal(raceRespDoc, null);
        assert.equal(finalReqRace?.responseCount, 0);
      }
    });
  } finally {
    // Clean up all test fixtures
    for (const respId of testIds.responseIds) {
      await DonationResponse.findByIdAndDelete(respId);
    }
    for (const reqId of testIds.requestIds) {
      await DonationRequest.findByIdAndDelete(reqId);
    }
    if (testIds.donorUserId) {
      await User.findByIdAndDelete(testIds.donorUserId);
    }
    if (testIds.donor2UserId) {
      await User.findByIdAndDelete(testIds.donor2UserId);
    }
    if (testIds.recipientUserId) {
      await User.findByIdAndDelete(testIds.recipientUserId);
    }
    server.close();
    await mongoose.disconnect();
  }
});

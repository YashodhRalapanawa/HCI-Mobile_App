import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/users/user.model.js';
import { DonationRequest } from '../src/modules/donors/donationRequest.model.js';

test('Donation Requests API Integration (Member 3.1)', async (t) => {
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
    recipientUserId?: string;
    requestIds: mongoose.Types.ObjectId[];
  } = {
    requestIds: [],
  };

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
  } finally {
    // Clean up all test fixtures
    for (const reqId of testIds.requestIds) {
      await DonationRequest.findByIdAndDelete(reqId);
    }
    if (testIds.donorUserId) {
      await User.findByIdAndDelete(testIds.donorUserId);
    }
    if (testIds.recipientUserId) {
      await User.findByIdAndDelete(testIds.recipientUserId);
    }
    server.close();
    await mongoose.disconnect();
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { connectDatabase } from '../src/config/database.js';
import { User } from '../src/modules/users/user.model.js';
import { BloodRequest } from '../src/modules/requests/request.model.js';
import { DonationRequest } from '../src/modules/donors/donationRequest.model.js';
import { DonationResponse } from '../src/modules/donors/donationResponse.model.js';
import { provisionAdminAccount } from '../scripts/provision-admin.js';

test('Admin Access and Dashboard Summary Integration (Member 4.1)', async (t) => {
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
    adminUserId?: string;
    donorUserId?: string;
    recipientUserId?: string;
    requestIds: mongoose.Types.ObjectId[];
    donationRequestIds: mongoose.Types.ObjectId[];
    donationResponseIds: mongoose.Types.ObjectId[];
    extraUserIds: mongoose.Types.ObjectId[];
  } = {
    requestIds: [],
    donationRequestIds: [],
    donationResponseIds: [],
    extraUserIds: [],
  };

  try {
    // Create test accounts
    const adminUser = await User.create({
      name: 'Test Administrator',
      email: `admin.test.${Date.now()}@example.com`,
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
      name: 'Test Donor',
      email: `donor.test.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_test',
      role: 'donor',
      bloodGroup: 'A+',
      district: 'Colombo',
      isAvailable: true,
      isEligible: true,
      donationCount: 3,
    });
    testIds.donorUserId = donorUser._id.toString();
    const donorToken = jwt.sign({ id: donorUser._id.toString() }, jwtSecret, { expiresIn: '1h' });

    const recipientUser = await User.create({
      name: 'Test Recipient',
      email: `recipient.test.${Date.now()}@example.com`,
      passwordHash: 'hashed_pw_test',
      role: 'recipient',
      bloodGroup: 'B+',
      district: 'Colombo',
      isAvailable: false,
      isEligible: false,
      donationCount: 0,
    });
    testIds.recipientUserId = recipientUser._id.toString();
    const recipientToken = jwt.sign({ id: recipientUser._id.toString() }, jwtSecret, { expiresIn: '1h' });

    await t.test('GET /api/admin/summary rejects unauthenticated and non-admin requests', async () => {
      // 1. Unauthenticated -> 401
      const noAuthRes = await fetch(`http://127.0.0.1:${port}/api/admin/summary`);
      assert.equal(noAuthRes.status, 401);
      const noAuthBody = (await noAuthRes.json()) as { message: string };
      assert.ok(noAuthBody.message.includes('Authentication required'));

      // 2. Authenticated donor -> 403
      const donorRes = await fetch(`http://127.0.0.1:${port}/api/admin/summary`, {
        headers: { Authorization: `Bearer ${donorToken}` },
      });
      assert.equal(donorRes.status, 403);
      const donorBody = (await donorRes.json()) as { message: string };
      assert.ok(donorBody.message.includes('Administrative privileges required'));

      // 3. Authenticated recipient -> 403
      const recipientRes = await fetch(`http://127.0.0.1:${port}/api/admin/summary`, {
        headers: { Authorization: `Bearer ${recipientToken}` },
      });
      assert.equal(recipientRes.status, 403);
      const recipientBody = (await recipientRes.json()) as { message: string };
      assert.ok(recipientBody.message.includes('Administrative privileges required'));
    });

    await t.test('Public registration and profile updates cannot grant admin privileges', async () => {
      // 1. Attempt to register directly with role: 'admin'
      const hackRegRes = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Hacker Attempt',
          email: `hacker.${Date.now()}@example.com`,
          password: 'Password123!',
          role: 'admin',
        }),
      });
      assert.equal(hackRegRes.status, 201);
      const hackRegBody = (await hackRegRes.json()) as {
        user: { id: string; role: string };
        token: string;
      };
      testIds.extraUserIds.push(new mongoose.Types.ObjectId(hackRegBody.user.id));
      // Role MUST be downgraded to donor (never admin)
      assert.equal(hackRegBody.user.role, 'donor');

      // Verify token cannot access admin endpoint
      const hackAdminRes = await fetch(`http://127.0.0.1:${port}/api/admin/summary`, {
        headers: { Authorization: `Bearer ${hackRegBody.token}` },
      });
      assert.equal(hackAdminRes.status, 403);

      // 2. Attempt role escalation via PUT /api/users/me
      const escalateRes = await fetch(`http://127.0.0.1:${port}/api/users/me`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${hackRegBody.token}`,
        },
        body: JSON.stringify({
          name: 'Escalated Name',
          role: 'admin',
        }),
      });
      assert.equal(escalateRes.status, 200);
      const escalateBody = (await escalateRes.json()) as { user: { role: string } };
      assert.equal(escalateBody.user.role, 'donor');

      // Check DB directly
      const userInDb = await User.findById(hackRegBody.user.id);
      assert.equal(userInDb?.role, 'donor');
    });

    await t.test('POST /api/auth/login preserves admin role and never demotes admin to donor/recipient', async () => {
      // 1. Create an isolated admin user with known password
      const isolatedAdminEmail = `login.admin.${Date.now()}@example.com`;
      const plainPassword = 'AdminPassword123!';
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(plainPassword, salt);

      const adminAccount = await User.create({
        name: 'Login Admin',
        email: isolatedAdminEmail,
        passwordHash,
        role: 'admin',
        bloodGroup: 'O+',
        district: 'Colombo',
        city: 'Colombo 07',
        isAvailable: false,
        isEligible: false,
        donationCount: 0,
      });
      testIds.extraUserIds.push(adminAccount._id as mongoose.Types.ObjectId);

      // 2. Client logs in with default donor tab active: role: 'donor'
      const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: isolatedAdminEmail,
          password: plainPassword,
          role: 'donor', // Client tab parameter from login screen
        }),
      });

      assert.strictEqual(loginRes.status, 200);
      const loginBody = (await loginRes.json()) as { token: string; user: { role: string } };
      assert.strictEqual(loginBody.user.role, 'admin');

      // 3. Verify database document was NOT demoted to donor
      const dbCheck = await User.findById(adminAccount._id);
      assert.ok(dbCheck);
      assert.strictEqual(dbCheck.role, 'admin');

      // 4. Verify /api/users/me returns role 'admin'
      const meRes = await fetch(`http://127.0.0.1:${port}/api/users/me`, {
        headers: { Authorization: `Bearer ${loginBody.token}` },
      });
      assert.strictEqual(meRes.status, 200);
      const meBody = (await meRes.json()) as { user: { role: string } };
      assert.strictEqual(meBody.user.role, 'admin');
    });

    await t.test('Provisioning refusal: Cannot overwrite or promote existing donor/recipient user', async () => {
      // 1. Create an isolated donor user fixture
      const isolatedDonorEmail = `isolated.donor.${Date.now()}@example.com`;
      const isolatedDonor = await User.create({
        name: 'Isolated Donor',
        email: isolatedDonorEmail,
        passwordHash: '$2a$10$abcdef1234567890abcdef1234567890abcdef1234567890abcdef12',
        role: 'donor',
        bloodGroup: 'B+',
        district: 'Gampaha',
        city: 'Negombo',
        isAvailable: true,
        isEligible: true,
        donationCount: 1,
      });
      testIds.extraUserIds.push(isolatedDonor._id as mongoose.Types.ObjectId);

      const initialId = isolatedDonor._id.toString();
      const initialRole = isolatedDonor.role;
      const initialHash = isolatedDonor.passwordHash;
      const initialName = isolatedDonor.name;

      // 2. Invoke real provisioning logic targeting the existing donor's email
      const provisionResult = await provisionAdminAccount({
        name: 'Attempted Admin Overwrite',
        email: isolatedDonorEmail,
        password: 'AttemptedPassword123!',
      });

      // 3. Verify refusal
      assert.strictEqual(provisionResult.success, false);
      assert.strictEqual(provisionResult.code, 'CONFLICT_EXISTING_USER');

      // 4. Verify existing record in database remains completely unmodified
      const donorAfter = await User.findById(initialId);
      assert.ok(donorAfter);
      assert.strictEqual(donorAfter._id.toString(), initialId);
      assert.strictEqual(donorAfter.role, initialRole);
      assert.strictEqual(donorAfter.passwordHash, initialHash);
      assert.strictEqual(donorAfter.name, initialName);
      assert.strictEqual(donorAfter.bloodGroup, 'B+');
      assert.strictEqual(donorAfter.donationCount, 1);
    });

    await t.test('GET /api/admin/summary returns accurate counts and safe projections for verified admin', async () => {
      // Setup 1: Pending patient request
      const reqPending = await BloodRequest.create({
        requesterId: recipientUser._id,
        patientName: 'Patient One',
        bloodGroup: 'A+',
        unitsRequired: 2,
        unitsFulfilled: 0,
        hospitalId: 'hosp-1',
        hospitalName: 'National Hospital',
        hospitalReferenceAndWard: 'Ward 3',
        urgency: 'Urgent',
        document: {
          originalName: 'med.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          storageKey: 'med_test_1.pdf',
        },
        status: 'pending_verification',
      });
      testIds.requestIds.push(reqPending._id);

      // Setup 2: Approved patient request awaiting delivery assignment
      const reqVerified = await BloodRequest.create({
        requesterId: recipientUser._id,
        patientName: 'Patient Two',
        bloodGroup: 'O+',
        unitsRequired: 1,
        unitsFulfilled: 0,
        hospitalId: 'hosp-1',
        hospitalName: 'National Hospital',
        hospitalReferenceAndWard: 'Ward 4',
        urgency: 'Scheduled',
        document: {
          originalName: 'med2.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          storageKey: 'med_test_2.pdf',
        },
        status: 'verified',
      });
      testIds.requestIds.push(reqVerified._id);

      // Setup 3: Active assigned patient request (assigned delivery person, not yet confirmed arrived)
      const reqAssigned = await BloodRequest.create({
        requesterId: recipientUser._id,
        patientName: 'Patient Three',
        bloodGroup: 'B+',
        unitsRequired: 2,
        unitsFulfilled: 0,
        hospitalId: 'hosp-2',
        hospitalName: 'Colombo South Hospital',
        hospitalReferenceAndWard: 'Ward 7',
        urgency: 'Urgent',
        document: {
          originalName: 'med3.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          storageKey: 'med_test_3.pdf',
        },
        status: 'verified',
        deliveryAssignment: {
          assignmentId: 'assign-active-1',
          deliveryPersonName: 'Kamal Silva',
          contactPhone: '0771234567',
          assignedAt: new Date(),
          arrivalConfirmedAt: null,
        },
      });
      testIds.requestIds.push(reqAssigned._id);

      // Setup 4: Patient request with recorded arrival confirmation
      const reqArrived = await BloodRequest.create({
        requesterId: recipientUser._id,
        patientName: 'Patient Four',
        bloodGroup: 'AB+',
        unitsRequired: 1,
        unitsFulfilled: 0,
        hospitalId: 'hosp-2',
        hospitalName: 'Colombo South Hospital',
        hospitalReferenceAndWard: 'Ward 8',
        urgency: 'Scheduled',
        document: {
          originalName: 'med4.pdf',
          mimeType: 'application/pdf',
          sizeBytes: 1024,
          storageKey: 'med_test_4.pdf',
        },
        status: 'verified',
        deliveryAssignment: {
          assignmentId: 'assign-arrived-1',
          deliveryPersonName: 'Nimal Perera',
          contactPhone: '0777654321',
          assignedAt: new Date(Date.now() - 3600000),
          arrivalConfirmedAt: new Date(),
        },
      });
      testIds.requestIds.push(reqArrived._id);

      // Setup 5: Available donation request
      const donReqOpen = await DonationRequest.create({
        bloodGroup: 'O-',
        unitsRequired: 3,
        hospitalId: 'hosp-1',
        hospitalName: 'National Blood Bank',
        locationDescription: 'Narahenpita',
        urgency: 'Urgent',
        status: 'published',
        neededBy: new Date(Date.now() + 86400000),
      });
      testIds.donationRequestIds.push(donReqOpen._id);

      // Setup 6: Expired donation request (must NOT count as available)
      const donReqExpired = await DonationRequest.create({
        bloodGroup: 'A-',
        unitsRequired: 1,
        hospitalId: 'hosp-1',
        hospitalName: 'National Blood Bank',
        locationDescription: 'Narahenpita',
        urgency: 'Scheduled',
        status: 'published',
        neededBy: new Date(Date.now() - 86400000), // yesterday
      });
      testIds.donationRequestIds.push(donReqExpired._id);

      // Setup 7: Closed donation request (must NOT count as available)
      const donReqClosed = await DonationRequest.create({
        bloodGroup: 'B-',
        unitsRequired: 2,
        hospitalId: 'hosp-1',
        hospitalName: 'National Blood Bank',
        locationDescription: 'Narahenpita',
        urgency: 'Urgent',
        status: 'closed',
        closedAt: new Date(),
      });
      testIds.donationRequestIds.push(donReqClosed._id);

      // Setup 8: Donor offer
      const donResponse = await DonationResponse.create({
        donationRequestId: donReqOpen._id,
        donorId: donorUser._id,
        status: 'accepted',
        acceptedAt: new Date(),
      });
      testIds.donationResponseIds.push(donResponse._id);

      // Query GET /api/admin/summary with admin token
      const res = await fetch(`http://127.0.0.1:${port}/api/admin/summary`, {
        headers: { Authorization: `Bearer ${adminToken}` },
      });
      assert.equal(res.status, 200);

      const body = (await res.json()) as {
        summary: {
          pendingPatientRequests: number;
          approvedAwaitingAssignment: number;
          activeAssignedRequests: number;
          recordedArrivalConfirmations: number;
          availableDonationRequests: number;
          donorOffers: number;
          registeredDonors: number;
        };
        refreshedAt: string;
      };

      // Assert counts match definitions accurately
      assert.ok(body.summary.pendingPatientRequests >= 1);
      assert.ok(body.summary.approvedAwaitingAssignment >= 1);
      assert.ok(body.summary.activeAssignedRequests >= 1);
      assert.ok(body.summary.recordedArrivalConfirmations >= 1);
      assert.ok(body.summary.availableDonationRequests >= 1);
      assert.ok(body.summary.donorOffers >= 1);
      assert.ok(body.summary.registeredDonors >= 1);
      assert.ok(body.refreshedAt);

      // Privacy check: Verify no sensitive details returned in top-level payload
      const rawKeys = Object.keys(body);
      assert.deepEqual(rawKeys.sort(), ['refreshedAt', 'summary'].sort());
      const summaryKeys = Object.keys(body.summary);
      assert.ok(!summaryKeys.includes('patientName'));
      assert.ok(!summaryKeys.includes('phone'));
      assert.ok(!summaryKeys.includes('passwordHash'));
      assert.ok(!summaryKeys.includes('document'));
    });
  } finally {
    // Teardown all test fixtures
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
    if (testIds.recipientUserId) {
      await User.findByIdAndDelete(testIds.recipientUserId);
    }
    for (const extraId of testIds.extraUserIds) {
      await User.findByIdAndDelete(extraId);
    }
    server.close();
    await mongoose.disconnect();
  }
});

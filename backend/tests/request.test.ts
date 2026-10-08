import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { env } from '../src/config/env.js';
import { User } from '../src/modules/users/user.model.js';
import { BloodRequest } from '../src/modules/requests/request.model.js';
import { DonorAcceptance } from '../src/modules/requests/donorAcceptance.model.js';
import { createBloodRequestSchema } from '../src/modules/requests/request.validation.js';
import {
  validateFileSignature,
  removeUploadedFile,
  UPLOAD_DIR,
} from '../src/modules/requests/upload.middleware.js';
import { SAMPLE_HOSPITALS } from '../src/modules/requests/hospital.data.js';

test('Request Validation Schema (Zod)', async (t) => {
  await t.test('accepts valid request input', () => {
    const validData = {
      patientName: 'N. Perera',
      bloodGroup: 'B-',
      unitsRequired: 3,
      hospitalId: 'hosp-colombo-city',
      hospitalReferenceAndWard: 'REQ-2026-024 / Ward 05',
      urgency: 'Urgent',
    };
    const result = createBloodRequestSchema.safeParse(validData);
    assert.equal(result.success, true);
    if (result.success) {
      assert.equal(result.data.patientName, 'N. Perera');
      assert.equal(result.data.unitsRequired, 3);
      assert.equal(result.data.urgency, 'Urgent');
    }
  });

  await t.test('rejects patient name shorter than 2 chars', () => {
    const invalid = {
      patientName: 'A',
      bloodGroup: 'O+',
      unitsRequired: 2,
      hospitalId: 'hosp-colombo-city',
      hospitalReferenceAndWard: 'Ward 3',
      urgency: 'Scheduled',
    };
    const result = createBloodRequestSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  await t.test('rejects invalid blood group', () => {
    const invalid = {
      patientName: 'Valid Name',
      bloodGroup: 'X+',
      unitsRequired: 2,
      hospitalId: 'hosp-colombo-city',
      hospitalReferenceAndWard: 'Ward 3',
      urgency: 'Scheduled',
    };
    const result = createBloodRequestSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });

  await t.test('rejects out-of-range units required', () => {
    const zeroUnits = {
      patientName: 'Valid Name',
      bloodGroup: 'A+',
      unitsRequired: 0,
      hospitalId: 'hosp-colombo-city',
      hospitalReferenceAndWard: 'Ward 3',
      urgency: 'Scheduled',
    };
    assert.equal(createBloodRequestSchema.safeParse(zeroUnits).success, false);

    const excessUnits = {
      patientName: 'Valid Name',
      bloodGroup: 'A+',
      unitsRequired: 15,
      hospitalId: 'hosp-colombo-city',
      hospitalReferenceAndWard: 'Ward 3',
      urgency: 'Scheduled',
    };
    assert.equal(createBloodRequestSchema.safeParse(excessUnits).success, false);
  });

  await t.test('rejects unrecognized hospitalId', () => {
    const invalid = {
      patientName: 'Valid Name',
      bloodGroup: 'A+',
      unitsRequired: 1,
      hospitalId: 'nonexistent-hospital-999',
      hospitalReferenceAndWard: 'Ward 3',
      urgency: 'Urgent',
    };
    const result = createBloodRequestSchema.safeParse(invalid);
    assert.equal(result.success, false);
  });
});

test('File Signature (Magic Bytes) Verification & Cleanup', async (t) => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'req-test-'));

  await t.test('validates PDF magic bytes (%PDF)', async () => {
    const filePath = path.join(tempDir, 'test.pdf');
    fs.writeFileSync(filePath, Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x35]));
    const isValid = await validateFileSignature(filePath);
    assert.equal(isValid, true);
  });

  await t.test('validates PNG magic bytes', async () => {
    const filePath = path.join(tempDir, 'test.png');
    fs.writeFileSync(filePath, Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
    const isValid = await validateFileSignature(filePath);
    assert.equal(isValid, true);
  });

  await t.test('validates JPEG magic bytes', async () => {
    const filePath = path.join(tempDir, 'test.jpg');
    fs.writeFileSync(filePath, Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46]));
    const isValid = await validateFileSignature(filePath);
    assert.equal(isValid, true);
  });

  await t.test('rejects fake/plain text file disguised as pdf', async () => {
    const filePath = path.join(tempDir, 'fake.pdf');
    fs.writeFileSync(filePath, Buffer.from('This is a text file not a PDF'));
    const isValid = await validateFileSignature(filePath);
    assert.equal(isValid, false);
  });

  await t.test('removeUploadedFile cleanly deletes file and handles missing files gracefully', () => {
    const filePath = path.join(tempDir, 'cleanup-me.tmp');
    fs.writeFileSync(filePath, 'temp data');
    assert.equal(fs.existsSync(filePath), true);
    removeUploadedFile(filePath);
    assert.equal(fs.existsSync(filePath), false);

    // Call on nonexistent file should not throw
    assert.doesNotThrow(() => removeUploadedFile(filePath));
    assert.doesNotThrow(() => removeUploadedFile(undefined));
  });

  // Cleanup temp dir
  fs.rmSync(tempDir, { recursive: true, force: true });
});

test('HTTP Request Routes Integration', async (t) => {
  const app = createApp();
  let server: http.Server;
  let port: number;

  await new Promise<void>((resolve) => {
    server = app.listen(0, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') {
        port = addr.port;
      }
      resolve();
    });
  });

  t.after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
  });

  await t.test('GET /api/requests/hospitals returns hospital catalogue', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/requests/hospitals`);
    assert.equal(res.status, 200);
    const body = (await res.json()) as { hospitals: typeof SAMPLE_HOSPITALS };
    assert.ok(Array.isArray(body.hospitals));
    assert.ok(body.hospitals.length >= 6);
    const cityHospital = body.hospitals.find((h) => h.id === 'hosp-colombo-city');
    assert.ok(cityHospital);
    assert.equal(cityHospital.name, 'City Hospital, Colombo');
  });

  await t.test('POST /api/requests without authorization returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/requests`, {
      method: 'POST',
      body: JSON.stringify({ patientName: 'Test' }),
      headers: { 'Content-Type': 'application/json' },
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test('POST /api/requests with invalid bearer token returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/requests`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer invalid.mock.jwt.token',
      },
    });
    assert.equal(res.status, 401);
  });

  await t.test('POST /api/requests with dev-fallback-token returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/requests`, {
      method: 'POST',
      headers: {
        Authorization: 'Bearer dev-fallback-token',
      },
    });
    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /invalid or expired/i);
  });

  await t.test('GET /api/requests/:id without authorization returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/requests/507f1f77bcf86cd799439011`);
    assert.equal(res.status, 401);
  });

  await t.test('GET /api/requests/my without authorization returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/requests/my`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test('GET /api/requests/:id/acceptances without authorization returns 401', async () => {
    const res = await fetch(`http://127.0.0.1:${port}/api/requests/507f1f77bcf86cd799439011/acceptances`);
    assert.equal(res.status, 401);
    const body = (await res.json()) as { message: string };
    assert.match(body.message, /authentication required/i);
  });

  await t.test('Authentication & Member2.1 Submission with Isolated Test User', async (subT) => {
    if (!env.MONGODB_URI) {
      subT.skip('MONGODB_URI not configured, skipping DB-backed integration tests');
      return;
    }

    if (mongoose.connection.readyState === 0) {
      await mongoose.connect(env.MONGODB_URI);
    }

    const testEmail = `test-runner-${Date.now()}@test.local`;
    const testPassword = 'test-password-123';
    let createdUserId: string | null = null;
    let realJwtToken: string | null = null;
    let createdRequestId: string | null = null;
    let uploadedStorageKey: string | null = null;

    try {
      // 1. Failed login test: non-existent credentials must return 401
      await subT.test('Failed login with non-existent account returns 401 and does not authenticate', async () => {
        const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: 'nonexistent.user.999@test.local',
            password: 'wrong-password',
            role: 'donor',
          }),
        });
        assert.equal(loginRes.status, 401);
        const body = (await loginRes.json()) as { message: string };
        assert.ok(body.message);
      });

      // 2. Register isolated test user
      const regRes = await fetch(`http://127.0.0.1:${port}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Test Runner User',
          email: testEmail,
          password: testPassword,
          role: 'donor',
          bloodGroup: 'B-',
          phone: '+94 77 999 8888',
        }),
      });
      assert.equal(regRes.status, 201);
      const regData = (await regRes.json()) as { token: string; user: { id: string } };
      createdUserId = regData.user.id;
      realJwtToken = regData.token;

      // 3. Successful login test: valid credentials return 200 with JWT
      await subT.test('Successful login returns real JWT token and user profile', async () => {
        const loginRes = await fetch(`http://127.0.0.1:${port}/api/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email: testEmail,
            password: testPassword,
            role: 'donor',
          }),
        });
        assert.equal(loginRes.status, 200);
        const loginData = (await loginRes.json()) as { token: string; user: { email: string } };
        assert.ok(loginData.token);
        assert.equal(loginData.token.split('.').length, 3);
        assert.equal(loginData.user.email, testEmail);
        realJwtToken = loginData.token;
      });

      // 4. Access protected endpoint with real JWT
      await subT.test('Protected endpoint GET /api/users/me accessible with real JWT', async () => {
        const profileRes = await fetch(`http://127.0.0.1:${port}/api/users/me`, {
          headers: {
            Authorization: `Bearer ${realJwtToken}`,
          },
        });
        assert.equal(profileRes.status, 200);
        const profileData = (await profileRes.json()) as { user: { email: string } };
        assert.equal(profileData.user.email, testEmail);
      });

      // 5. Submit valid Member 2.1 request with harmless test document
      await subT.test('Authenticated Member2.1 request with valid PDF document persists in MongoDB', async () => {
        const formData = new FormData();
        formData.append('patientName', 'N. Perera');
        formData.append('bloodGroup', 'B-');
        formData.append('unitsRequired', '3');
        formData.append('hospitalId', 'hosp-colombo-city');
        formData.append('hospitalReferenceAndWard', 'REQ-2026-024 / Ward 05');
        formData.append('urgency', 'Urgent');

        // Harmless test PDF bytes (%PDF-1.4 header)
        const samplePdfContent = Buffer.from('%PDF-1.4\n%harmless sample test hospital document\n%%EOF');
        formData.append(
          'document',
          new Blob([samplePdfContent], { type: 'application/pdf' }),
          'hospital-req-sample.pdf',
        );

        const createRes = await fetch(`http://127.0.0.1:${port}/api/requests`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${realJwtToken}`,
          },
          body: formData,
        });

        assert.equal(createRes.status, 201);
        const createData = (await createRes.json()) as {
          message: string;
          request: {
            id: string;
            patientName: string;
            status: string;
            hospitalName: string;
            unitsRequired: number;
            document: { originalName: string };
          };
        };

        assert.equal(createData.request.patientName, 'N. Perera');
        assert.equal(createData.request.status, 'pending_verification');
        assert.equal(createData.request.unitsRequired, 3);
        assert.equal(createData.request.document.originalName, 'hospital-req-sample.pdf');
        createdRequestId = createData.request.id;

        // Verify database persistence and ownership
        const savedDoc = await BloodRequest.findById(createdRequestId);
        assert.ok(savedDoc);
        assert.equal(savedDoc.requesterId.toString(), createdUserId);
        assert.equal(savedDoc.status, 'pending_verification');
        assert.equal(savedDoc.unitsFulfilled, 0);
        uploadedStorageKey = savedDoc.document.storageKey;
      });

      // 5. Invalid request ID format returns 400
      await subT.test('GET /api/requests/:id with invalid ID format returns 400', async () => {
        const invalidRes = await fetch(`http://127.0.0.1:${port}/api/requests/invalid-mongo-id`, {
          headers: { Authorization: `Bearer ${realJwtToken}` },
        });
        assert.equal(invalidRes.status, 400);
        const body = (await invalidRes.json()) as { message: string };
        assert.match(body.message, /invalid request id/i);
      });

      // 6. Non-existent request ID returns 404
      await subT.test('GET /api/requests/:id with non-existent ID returns 404', async () => {
        const notFoundRes = await fetch(
          `http://127.0.0.1:${port}/api/requests/507f1f77bcf86cd799439011`,
          {
            headers: { Authorization: `Bearer ${realJwtToken}` },
          },
        );
        assert.equal(notFoundRes.status, 404);
        const body = (await notFoundRes.json()) as { message: string };
        assert.match(body.message, /not found/i);
      });

      // 7. Owner retrieval test (Member 2.2 detail query)
      await subT.test('GET /api/requests/:id allows owner to retrieve request summary', async () => {
        assert.ok(createdRequestId);
        const getRes = await fetch(`http://127.0.0.1:${port}/api/requests/${createdRequestId}`, {
          headers: {
            Authorization: `Bearer ${realJwtToken}`,
          },
        });

        assert.equal(getRes.status, 200);
        const data = (await getRes.json()) as {
          request: {
            id: string;
            patientName: string;
            bloodGroup: string;
            unitsRequired: number;
            hospitalName: string;
            hospitalReferenceAndWard: string;
            urgency: string;
            status: string;
            document: { storageKey?: string };
          };
        };
        assert.ok(data.request);
        assert.equal(data.request.id, createdRequestId);
        assert.equal(data.request.patientName, 'N. Perera');
        assert.equal(data.request.bloodGroup, 'B-');
        assert.equal(data.request.unitsRequired, 3);
        assert.equal(data.request.hospitalName, 'City Hospital, Colombo');
        assert.equal(data.request.hospitalReferenceAndWard, 'REQ-2026-024 / Ward 05');
        assert.equal(data.request.urgency, 'Urgent');
        assert.equal(data.request.status, 'pending_verification');
        // Ensure storageKey is not exposed
        assert.equal(data.request.document.storageKey, undefined);
      });

      // 8. Non-owner rejection test (403 Forbidden)
      let secondUserId: string | null = null;
      try {
        const secondUser = await User.create({
          name: 'Second Test User',
          email: `second-runner-${Date.now()}@test.local`,
          passwordHash: 'dummy-hash',
          bloodGroup: 'A+',
          district: 'Colombo',
        });
        secondUserId = secondUser._id.toString();
        const secondUserToken = jwt.sign({ id: secondUserId }, env.JWT_SECRET);

        await subT.test('GET /api/requests/:id rejects non-owner with 403', async () => {
          assert.ok(createdRequestId);
          const getRes = await fetch(`http://127.0.0.1:${port}/api/requests/${createdRequestId}`, {
            headers: {
              Authorization: `Bearer ${secondUserToken}`,
            },
          });

          assert.equal(getRes.status, 403);
          const body = (await getRes.json()) as { message: string };
          assert.match(body.message, /permission/i);
        });

        // 9. Validation of query parameters on GET /api/requests/my
        await subT.test('GET /api/requests/my validates tab, page, and limit query params', async () => {
          // Invalid tab
          const tabRes = await fetch(`http://127.0.0.1:${port}/api/requests/my?tab=invalid`, {
            headers: { Authorization: `Bearer ${realJwtToken}` },
          });
          assert.equal(tabRes.status, 400);
          const tabBody = (await tabRes.json()) as { message: string };
          assert.match(tabBody.message, /tab parameter/i);

          // Invalid page (0)
          const pageRes = await fetch(`http://127.0.0.1:${port}/api/requests/my?page=0`, {
            headers: { Authorization: `Bearer ${realJwtToken}` },
          });
          assert.equal(pageRes.status, 400);
          const pageBody = (await pageRes.json()) as { message: string };
          assert.match(pageBody.message, /page number/i);

          // Bounded limit (> 50)
          const limitRes = await fetch(`http://127.0.0.1:${port}/api/requests/my?limit=51`, {
            headers: { Authorization: `Bearer ${realJwtToken}` },
          });
          assert.equal(limitRes.status, 400);
          const limitBody = (await limitRes.json()) as { message: string };
          assert.match(limitBody.message, /limit exceeds maximum/i);
        });

        // 10. List filtering, counts across pagination, safe fields, and ownership
        const extraReqIds: string[] = [];
        try {
          // User 1 extra requests:
          // 1 verified
          const verifiedDoc = await BloodRequest.create({
            requesterId: createdUserId,
            patientName: 'Verified Patient',
            bloodGroup: 'O+',
            unitsRequired: 2,
            unitsFulfilled: 0,
            hospitalId: 'hosp-colombo-city',
            hospitalName: 'City Hospital, Colombo',
            hospitalReferenceAndWard: 'REF-VERIFIED-01',
            urgency: 'Scheduled',
            document: {
              originalName: 'dummy.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 100,
              storageKey: 'internal-verified-key.pdf',
            },
            status: 'verified',
          });
          extraReqIds.push(verifiedDoc._id.toString());

          // 1 in_progress
          const inProgressDoc = await BloodRequest.create({
            requesterId: createdUserId,
            patientName: 'InProgress Patient',
            bloodGroup: 'A+',
            unitsRequired: 1,
            unitsFulfilled: 0,
            hospitalId: 'hosp-colombo-city',
            hospitalName: 'City Hospital, Colombo',
            hospitalReferenceAndWard: 'REF-INPROG-02',
            urgency: 'Urgent',
            document: {
              originalName: 'dummy.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 100,
              storageKey: 'internal-inprog-key.pdf',
            },
            status: 'in_progress',
          });
          extraReqIds.push(inProgressDoc._id.toString());

          // 1 fulfilled (completed)
          const fulfilledDoc = await BloodRequest.create({
            requesterId: createdUserId,
            patientName: 'Fulfilled Patient',
            bloodGroup: 'AB+',
            unitsRequired: 2,
            unitsFulfilled: 2,
            hospitalId: 'hosp-colombo-city',
            hospitalName: 'City Hospital, Colombo',
            hospitalReferenceAndWard: 'REF-FULFILLED-03',
            urgency: 'Scheduled',
            document: {
              originalName: 'dummy.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 100,
              storageKey: 'internal-fulfilled-key.pdf',
            },
            status: 'fulfilled',
          });
          extraReqIds.push(fulfilledDoc._id.toString());

          // 1 cancelled (must NOT appear in active or completed tabs)
          const cancelledDoc = await BloodRequest.create({
            requesterId: createdUserId,
            patientName: 'Cancelled Patient',
            bloodGroup: 'B+',
            unitsRequired: 1,
            unitsFulfilled: 0,
            hospitalId: 'hosp-colombo-city',
            hospitalName: 'City Hospital, Colombo',
            hospitalReferenceAndWard: 'REF-CANCELLED-04',
            urgency: 'Urgent',
            document: {
              originalName: 'dummy.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 100,
              storageKey: 'internal-cancelled-key.pdf',
            },
            status: 'cancelled',
          });
          extraReqIds.push(cancelledDoc._id.toString());

          // User 2 request (to prove ownership isolation)
          const user2Doc = await BloodRequest.create({
            requesterId: secondUserId,
            patientName: 'User 2 Patient',
            bloodGroup: 'O-',
            unitsRequired: 1,
            unitsFulfilled: 0,
            hospitalId: 'hosp-colombo-city',
            hospitalName: 'City Hospital, Colombo',
            hospitalReferenceAndWard: 'REF-USER2-05',
            urgency: 'Urgent',
            document: {
              originalName: 'dummy.pdf',
              mimeType: 'application/pdf',
              sizeBytes: 100,
              storageKey: 'internal-user2-key.pdf',
            },
            status: 'pending_verification',
          });
          extraReqIds.push(user2Doc._id.toString());

          // A. User 1 Active tab verification
          await subT.test('GET /api/requests/my?tab=active returns only owner active requests & excludes cancelled/fulfilled', async () => {
            const listRes = await fetch(`http://127.0.0.1:${port}/api/requests/my?tab=active`, {
              headers: { Authorization: `Bearer ${realJwtToken}` },
            });
            assert.equal(listRes.status, 200);
            const data = (await listRes.json()) as {
              requests: Array<{
                id: string;
                bloodGroup: string;
                unitsRequired: number;
                status: string;
                document?: unknown;
              }>;
              pagination: { total: number; page: number; limit: number; totalPages: number; hasNextPage: boolean };
              counts: { active: number; completed: number };
            };

            // User 1 has 3 active requests: original pending_verification, verified, in_progress
            assert.equal(data.requests.length, 3);
            assert.equal(data.pagination.total, 3);
            assert.equal(data.counts.active, 3);
            assert.equal(data.counts.completed, 1);

            const statuses = data.requests.map((r) => r.status);
            assert.ok(statuses.includes('pending_verification'));
            assert.ok(statuses.includes('verified'));
            assert.ok(statuses.includes('in_progress'));
            assert.ok(!statuses.includes('fulfilled'));
            assert.ok(!statuses.includes('cancelled'));

            // Safe fields: verify internal storageKey/document is not exposed in list
            for (const r of data.requests) {
              assert.equal(r.document, undefined);
              assert.equal((r as Record<string, unknown>).storageKey, undefined);
            }
          });

          // B. User 1 Completed tab verification
          await subT.test('GET /api/requests/my?tab=completed returns only fulfilled requests & excludes cancelled', async () => {
            const compRes = await fetch(`http://127.0.0.1:${port}/api/requests/my?tab=completed`, {
              headers: { Authorization: `Bearer ${realJwtToken}` },
            });
            assert.equal(compRes.status, 200);
            const compData = (await compRes.json()) as {
              requests: Array<{ id: string; status: string }>;
              pagination: { total: number };
              counts: { active: number; completed: number };
            };

            assert.equal(compData.requests.length, 1);
            assert.equal(compData.pagination.total, 1);
            assert.equal(compData.requests[0]?.status, 'fulfilled');
            assert.equal(compData.counts.active, 3);
            assert.equal(compData.counts.completed, 1);
          });

          // C. Pagination and stable ordering verification
          await subT.test('GET /api/requests/my validates pagination and descending order', async () => {
            const p1Res = await fetch(`http://127.0.0.1:${port}/api/requests/my?tab=active&page=1&limit=2`, {
              headers: { Authorization: `Bearer ${realJwtToken}` },
            });
            assert.equal(p1Res.status, 200);
            const p1 = (await p1Res.json()) as {
              requests: Array<{ id: string; createdAt: string }>;
              pagination: { page: number; limit: number; total: number; totalPages: number; hasNextPage: boolean };
            };
            assert.equal(p1.requests.length, 2);
            assert.equal(p1.pagination.page, 1);
            assert.equal(p1.pagination.limit, 2);
            assert.equal(p1.pagination.total, 3);
            assert.equal(p1.pagination.totalPages, 2);
            assert.equal(p1.pagination.hasNextPage, true);

            const p2Res = await fetch(`http://127.0.0.1:${port}/api/requests/my?tab=active&page=2&limit=2`, {
              headers: { Authorization: `Bearer ${realJwtToken}` },
            });
            assert.equal(p2Res.status, 200);
            const p2 = (await p2Res.json()) as {
              requests: Array<{ id: string }>;
              pagination: { page: number; hasNextPage: boolean };
            };
            assert.equal(p2.requests.length, 1);
            assert.equal(p2.pagination.page, 2);
            assert.equal(p2.pagination.hasNextPage, false);

            // Verify no overlap between page 1 and page 2
            const p1Ids = p1.requests.map((r) => r.id);
            assert.ok(!p1Ids.includes(p2.requests[0]!.id));
          });

          // D. Ownership isolation: User 2 can never see User 1's requests
          await subT.test('User 2 listing /api/requests/my only sees User 2 records', async () => {
            const u2Res = await fetch(`http://127.0.0.1:${port}/api/requests/my?tab=active`, {
              headers: { Authorization: `Bearer ${secondUserToken}` },
            });
            assert.equal(u2Res.status, 200);
            const u2Data = (await u2Res.json()) as {
              requests: Array<{ id: string }>;
              counts: { active: number; completed: number };
            };
            assert.equal(u2Data.requests.length, 1);
            assert.equal(u2Data.requests[0]?.id, user2Doc._id.toString());
            assert.equal(u2Data.counts.active, 1);
            assert.equal(u2Data.counts.completed, 0);
          });

          // E. Member 2.4: Donor Acceptance Endpoints, Security, Isolation & Immutability
          await subT.test('GET /api/requests/:id/acceptances validates input, non-existent, and ownership', async () => {
            // Invalid ID
            const invRes = await fetch(`http://127.0.0.1:${port}/api/requests/invalid-mongo-id/acceptances`, {
              headers: { Authorization: `Bearer ${realJwtToken}` },
            });
            assert.equal(invRes.status, 400);

            // Non-existent ID
            const randomId = new mongoose.Types.ObjectId().toString();
            const notFoundRes = await fetch(`http://127.0.0.1:${port}/api/requests/${randomId}/acceptances`, {
              headers: { Authorization: `Bearer ${realJwtToken}` },
            });
            assert.equal(notFoundRes.status, 404);

            // Ownership isolation: User 2 cannot access User 1's acceptances
            const forbidRes = await fetch(`http://127.0.0.1:${port}/api/requests/${createdRequestId}/acceptances`, {
              headers: { Authorization: `Bearer ${secondUserToken}` },
            });
            assert.equal(forbidRes.status, 403);

            // Owner with 0 acceptances returns empty array and count 0
            const emptyRes = await fetch(`http://127.0.0.1:${port}/api/requests/${createdRequestId}/acceptances`, {
              headers: { Authorization: `Bearer ${realJwtToken}` },
            });
            assert.equal(emptyRes.status, 200);
            const emptyData = (await emptyRes.json()) as {
              acceptances: unknown[];
              count: number;
              request: { bloodGroup: string; hospitalName: string };
            };
            assert.equal(emptyData.count, 0);
            assert.equal(emptyData.acceptances.length, 0);
            assert.equal(emptyData.request.bloodGroup, 'B-');
          });

          await subT.test('GET /api/requests/:id/acceptances returns safe fields, handles multiple donors, excludes withdrawn, and preserves request status', async () => {
            const donor1Id = new mongoose.Types.ObjectId();
            const donor2Id = new mongoose.Types.ObjectId();
            const withdrawnDonorId = new mongoose.Types.ObjectId();

            const preDoc = await BloodRequest.findById(createdRequestId);
            assert.ok(preDoc);
            const preStatus = preDoc.status;
            const preFulfilled = preDoc.unitsFulfilled;

            try {
              // Create 2 active acceptances and 1 withdrawn acceptance
              await DonorAcceptance.create({
                requestId: preDoc._id,
                donorId: donor1Id,
                safeDonorCode: 'Donor D-017',
                status: 'accepted',
              });

              await DonorAcceptance.create({
                requestId: preDoc._id,
                donorId: donor2Id,
                safeDonorCode: 'Donor D-022',
                status: 'accepted',
              });

              await DonorAcceptance.create({
                requestId: preDoc._id,
                donorId: withdrawnDonorId,
                safeDonorCode: 'Donor D-099',
                status: 'withdrawn',
              });

              // Retrieve acceptances
              const res = await fetch(`http://127.0.0.1:${port}/api/requests/${createdRequestId}/acceptances`, {
                headers: { Authorization: `Bearer ${realJwtToken}` },
              });
              assert.equal(res.status, 200);
              const data = (await res.json()) as {
                acceptances: Array<{
                  id: string;
                  safeDonorCode: string;
                  status: string;
                  acceptedAt: string;
                  donorId?: string;
                  email?: string;
                  phone?: string;
                }>;
                count: number;
                request: {
                  id: string;
                  patientName: string;
                  bloodGroup: string;
                  hospitalName: string;
                  status: string;
                };
              };

              // Verify only active acceptances returned (withdrawn excluded)
              assert.equal(data.count, 2);
              assert.equal(data.acceptances.length, 2);
              assert.equal(data.acceptances[0]?.safeDonorCode, 'Donor D-017');
              assert.equal(data.acceptances[1]?.safeDonorCode, 'Donor D-022');
              assert.equal(data.request.hospitalName, 'City Hospital, Colombo');
              assert.equal(data.request.bloodGroup, 'B-');

              // Verify strict data privacy: safe fields only, no private donor data exposed
              for (const acc of data.acceptances) {
                const record = acc as Record<string, unknown>;
                assert.equal(acc.status, 'accepted');
                assert.ok(acc.acceptedAt);
                assert.equal(record.donorId, undefined);
                assert.equal(record.email, undefined);
                assert.equal(record.phone, undefined);
                assert.equal(record.password, undefined);
                assert.equal(record.storageKey, undefined);
              }

              // Verify GET /api/requests/my aggregates acceptedDonorsCount efficiently
              const listRes = await fetch(`http://127.0.0.1:${port}/api/requests/my?tab=active`, {
                headers: { Authorization: `Bearer ${realJwtToken}` },
              });
              assert.equal(listRes.status, 200);
              const listData = (await listRes.json()) as {
                requests: Array<{ id: string; acceptedDonorsCount: number }>;
              };
              const targetCard = listData.requests.find((r) => r.id === createdRequestId);
              assert.ok(targetCard);
              assert.equal(targetCard.acceptedDonorsCount, 2);

              // Verify strictly read-only: blood request was NOT mutated
              const postDoc = await BloodRequest.findById(createdRequestId);
              assert.ok(postDoc);
              assert.equal(postDoc.status, preStatus);
              assert.equal(postDoc.unitsFulfilled, preFulfilled);
            } finally {
              await DonorAcceptance.deleteMany({ requestId: preDoc._id });
            }
          });
        } finally {
          for (const reqId of extraReqIds) {
            await BloodRequest.findByIdAndDelete(reqId);
          }
        }
      } finally {
        if (secondUserId) {
          await User.findByIdAndDelete(secondUserId);
        }
      }
    } finally {
      // Clean up isolated test data
      if (createdRequestId) {
        await BloodRequest.findByIdAndDelete(createdRequestId);
      }
      if (uploadedStorageKey) {
        const filePath = path.join(UPLOAD_DIR, uploadedStorageKey);
        removeUploadedFile(filePath);
      }
      if (createdUserId) {
        await User.findByIdAndDelete(createdUserId);
      }
      await mongoose.disconnect();
    }
  });
});

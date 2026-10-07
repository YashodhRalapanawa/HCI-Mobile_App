import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import http from 'node:http';
import { createApp } from '../src/app.js';
import { createBloodRequestSchema } from '../src/modules/requests/request.validation.js';
import {
  validateFileSignature,
  removeUploadedFile,
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
});

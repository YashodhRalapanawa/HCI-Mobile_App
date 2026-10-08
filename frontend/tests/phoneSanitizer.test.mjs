import test from 'node:test';
import assert from 'node:assert/strict';

// Import actual shared phone helper logic directly from frontend
import {
  sanitizePhoneNumber,
  buildTelUrl,
  buildSmsUrl,
} from '../src/utils/phoneSanitizer.ts';

test('Member 2.5 Shared Phone Helpers & URI Construction Verification', async (t) => {
  await t.test('sanitizePhoneNumber normalizes valid numbers and preserves optional +', () => {
    assert.equal(sanitizePhoneNumber('+94 77 123 4567'), '+94771234567');
    assert.equal(sanitizePhoneNumber('077-123-4567'), '0771234567');
    assert.equal(sanitizePhoneNumber('+1 (555) 234-5678'), '+15552345678');
    assert.equal(sanitizePhoneNumber('  +94712345678  '), '+94712345678');
    assert.equal(sanitizePhoneNumber('+44 20 7946 0958'), '+442079460958');
  });

  await t.test('sanitizePhoneNumber strictly rejects invalid, injection, or out-of-range strings', () => {
    assert.equal(sanitizePhoneNumber(null), null);
    assert.equal(sanitizePhoneNumber(undefined), null);
    assert.equal(sanitizePhoneNumber(''), null);
    assert.equal(sanitizePhoneNumber('   '), null);
    assert.equal(sanitizePhoneNumber('12345'), null); // too short (<7 digits)
    assert.equal(sanitizePhoneNumber('123456789012345678'), null); // too long (>15 digits)
    assert.equal(sanitizePhoneNumber('javascript:alert(1)'), null);
    assert.equal(sanitizePhoneNumber('<script>alert("xss")</script>'), null);
    assert.equal(sanitizePhoneNumber('https://malicious.site/phish'), null);
  });

  await t.test('buildTelUrl builds strictly validated tel: scheme', () => {
    assert.equal(buildTelUrl('+94 77 123 4567'), 'tel:+94771234567');
    assert.equal(buildTelUrl('0771234567'), 'tel:0771234567');
    assert.equal(buildTelUrl('invalid'), null);
    assert.equal(buildTelUrl(''), null);
    assert.equal(buildTelUrl(null), null);
  });

  await t.test('buildSmsUrl builds strictly validated sms: scheme with empty body', () => {
    assert.equal(buildSmsUrl('+94 77 123 4567'), 'sms:+94771234567');
    assert.equal(buildSmsUrl('0771234567'), 'sms:0771234567');
    assert.equal(buildSmsUrl('invalid'), null);
    assert.equal(buildSmsUrl(''), null);
    assert.equal(buildSmsUrl(null), null);
  });

  await t.test('preview simulation logic handles sample numbers without generating live dialer actions', () => {
    const isPreview = true;
    let previewLogged = false;
    const samplePhone = '+94 77 123 4567';

    function handlePreviewCall(phone, previewMode) {
      const sanitized = sanitizePhoneNumber(phone);
      if (!sanitized) return { executedLive: false, feedback: 'Invalid phone' };
      if (previewMode) {
        previewLogged = true;
        return { executedLive: false, feedback: `[Sample Preview] Dialer action simulated for ${phone}.` };
      }
      return { executedLive: true, feedback: buildTelUrl(sanitized) };
    }

    const previewResult = handlePreviewCall(samplePhone, isPreview);
    assert.equal(previewResult.executedLive, false);
    assert.equal(previewLogged, true);
    assert.match(previewResult.feedback, /\[Sample Preview\]/);

    const liveResult = handlePreviewCall(samplePhone, false);
    assert.equal(liveResult.executedLive, true);
    assert.equal(liveResult.feedback, 'tel:+94771234567');
  });
});

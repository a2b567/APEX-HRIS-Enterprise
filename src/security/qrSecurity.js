/**
 * APEX HRIS – Dynamic QR Code Security (P1 – High)
 * -------------------------------------------------
 * Replaces static QR tokens with HMAC-SHA256 signed payloads.
 *
 * Payload structure:
 *  {
 *    v:         '2.0',          // version
 *    empId:     'EMP-001-01',
 *    branchId:  'BRANCH-001',
 *    name:      'Juan Cruz',
 *    ts:        1234567890123,  // issued timestamp (ms)
 *    nonce:     'a3b9f2c1',     // 8-char random nonce
 *    sig:       'deadbeef...',  // HMAC-SHA256 hex (first 32 chars)
 *  }
 *
 * Verification rules:
 *  1. Payload is parseable JSON
 *  2. HMAC signature matches
 *  3. Timestamp within maxAgeMs (attendance: 5min, payroll: 60s)
 *  4. Nonce not reused within the time window
 *
 * Usage:
 *   import qrSecurity from './security/qrSecurity';
 *   const payload = await qrSecurity.generatePayload(employee);
 *   const qrString = JSON.stringify(payload);
 *   // On scan:
 *   const result = await qrSecurity.verify(qrString, { maxAgeMs: 300000 });
 */

const _usedNonces = new Map();   // nonce → expiryTimestamp
const NONCE_TTL_MS = 5 * 60 * 1000;   // prune nonces after 5 min

function pruneNonces() {
  const now = Date.now();
  for (const [nonce, expiry] of _usedNonces.entries()) {
    if (now > expiry) _usedNonces.delete(nonce);
  }
}

function generateNonce(length = 8) {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  return Array.from(crypto.getRandomValues(new Uint8Array(length)))
    .map((b) => chars[b % chars.length])
    .join('');
}

/** HMAC-SHA256 using Web Crypto API — returns hex string */
async function hmacSHA256(message, secret) {
  const encoder = new TextEncoder();
  const keyMat  = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('HMAC', keyMat, encoder.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Derive a per-employee signing secret (deterministic but unique) */
function getSigningSecret(empId, branchId) {
  const masterSeed =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APEX_QR_SECRET) ||
    'APEX_QR_SIGNING_SECRET_CHANGE_IN_PROD';
  return `${masterSeed}:${empId}:${branchId}`;
}

const qrSecurity = {
  /**
   * Generate a signed QR payload for an employee.
   * @param {object} employee - { id, branchId, name }
   * @returns {object} QR payload (stringify this to get the QR string)
   */
  async generatePayload(employee) {
    const ts    = Date.now();
    const nonce = generateNonce();
    const sigBase = `${employee.id}|${employee.branchId}|${ts}|${nonce}`;
    const secret  = getSigningSecret(employee.id, employee.branchId);
    const sig     = (await hmacSHA256(sigBase, secret)).slice(0, 32);

    return {
      v:        '2.0',
      empId:    employee.id,
      branchId: employee.branchId,
      name:     employee.name,
      ts,
      nonce,
      sig,
    };
  },

  /**
   * Verify a scanned QR payload string.
   * @param {string} qrString - raw scanned text
   * @param {object} opts     - { maxAgeMs: number (default 300000) }
   * @returns {{ valid, reason, employeeId, branchId, name }}
   */
  async verify(qrString, { maxAgeMs = 300_000 } = {}) {
    try {
      const data = JSON.parse(qrString.trim());

      // Legacy v1 tokens — allow through (no HMAC verification)
      if (!data.v || data.v === '1.0') {
        if (data.empId && data.branchId) {
          return { valid: true, legacy: true, employeeId: data.empId, branchId: data.branchId, name: data.name || '' };
        }
        return { valid: false, reason: 'Invalid QR payload structure.' };
      }

      // v2 HMAC verification
      const { sig, ts, nonce, empId, branchId, name } = data;

      // 1. Timestamp freshness
      const age = Date.now() - ts;
      if (age > maxAgeMs) {
        return { valid: false, reason: `QR code expired (age: ${Math.round(age / 1000)}s, max: ${maxAgeMs / 1000}s).` };
      }

      // 2. Replay prevention
      pruneNonces();
      if (_usedNonces.has(nonce)) {
        return { valid: false, reason: 'QR code already used (replay attempt detected).' };
      }

      // 3. HMAC signature
      const sigBase    = `${empId}|${branchId}|${ts}|${nonce}`;
      const secret     = getSigningSecret(empId, branchId);
      const expected   = (await hmacSHA256(sigBase, secret)).slice(0, 32);

      if (sig !== expected) {
        return { valid: false, reason: 'QR signature invalid. Badge may be forged.' };
      }

      // Mark nonce as used
      _usedNonces.set(nonce, Date.now() + NONCE_TTL_MS);

      return { valid: true, employeeId: empId, branchId, name };
    } catch (err) {
      // Legacy format fallback (plain text EMP-XXX-XX)
      const trimmed = (qrString || '').trim();
      if (trimmed.startsWith('EMP-')) {
        const parts = trimmed.split('-');
        if (parts.length >= 3) {
          return {
            valid:      true,
            legacy:     true,
            employeeId: `EMP-${parts[1]}-${parts[2]}`,
            branchId:   `BRANCH-${parts[1]}`,
            name:       '',
          };
        }
      }
      return { valid: false, reason: 'Could not parse QR code.' };
    }
  },
};

export default qrSecurity;

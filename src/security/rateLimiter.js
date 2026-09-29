/**
 * APEX HRIS – Client-Side Rate Limiter (P0 – Critical)
 * -----------------------------------------------------
 * NOTE: This is a frontend-layer defense. Real enforcement
 * MUST be done server-side. This layer prevents accidental
 * rapid-fire requests and provides user-facing lockout UX.
 *
 * Limits:
 *  - Login:      5 attempts / 15 min per username (lockout after 5)
 *  - QR Scan:   10 scans / 60 sec per employee session
 *  - Payroll:    3 runs / 60 min per supervisor session
 *  - API calls: 100 / 60 sec (general throttle)
 *
 * Usage:
 *   const result = rateLimiter.checkLogin(username);
 *   if (!result.allowed) { showError(result.message); return; }
 */

const LOCKOUT_DURATION_MS = 30 * 60 * 1000;   // 30 minutes
const CAPTCHA_THRESHOLD   = 3;                 // show CAPTCHA after 3 fails

const _store = new Map();   // { key: { attempts: [], lockedUntil: null } }

function getRecord(key, windowMs) {
  const now = Date.now();
  if (!_store.has(key)) _store.set(key, { attempts: [], lockedUntil: null });
  const rec = _store.get(key);
  // Prune attempts outside the window
  rec.attempts = rec.attempts.filter((t) => now - t < windowMs);
  return rec;
}

function makeResult(allowed, message = '', extra = {}) {
  return { allowed, message, ...extra };
}

export const rateLimiter = {
  /**
   * Check login rate limit for a given username.
   * Returns { allowed, message, requiresCaptcha, lockedUntil }
   */
  checkLogin(username) {
    const key      = `login:${(username || '').toLowerCase()}`;
    const windowMs = 15 * 60 * 1000;   // 15-min window
    const maxTries = 5;
    const rec      = getRecord(key, windowMs);
    const now      = Date.now();

    // Check if locked out
    if (rec.lockedUntil && now < rec.lockedUntil) {
      const remMin = Math.ceil((rec.lockedUntil - now) / 60000);
      return makeResult(false, `Account temporarily locked. Try again in ${remMin} minute(s).`, {
        requiresCaptcha: true,
        lockedUntil: rec.lockedUntil,
      });
    }

    const count          = rec.attempts.length;
    const requiresCaptcha = count >= CAPTCHA_THRESHOLD;

    if (count >= maxTries) {
      rec.lockedUntil = now + LOCKOUT_DURATION_MS;
      return makeResult(false, 'Too many failed attempts. Account locked for 30 minutes.', {
        requiresCaptcha: true,
        lockedUntil: rec.lockedUntil,
      });
    }

    return makeResult(true, '', { requiresCaptcha, attemptsLeft: maxTries - count });
  },

  /** Record a failed login attempt */
  recordLoginFailure(username) {
    const key = `login:${(username || '').toLowerCase()}`;
    const rec = getRecord(key, 15 * 60 * 1000);
    rec.attempts.push(Date.now());
  },

  /** Clear login failures on successful login */
  clearLoginFailures(username) {
    const key = `login:${(username || '').toLowerCase()}`;
    _store.delete(key);
  },

  /** Check QR scan rate limit (10 / 60s per session key) */
  checkQRScan(sessionKey) {
    const key      = `qr:${sessionKey}`;
    const windowMs = 60 * 1000;
    const maxTries = 10;
    const rec      = getRecord(key, windowMs);

    if (rec.attempts.length >= maxTries) {
      return makeResult(false, 'Too many QR scan attempts. Please wait 60 seconds.');
    }
    rec.attempts.push(Date.now());
    return makeResult(true);
  },

  /** Check payroll run rate limit (3 / 60min per supervisor) */
  checkPayrollRun(supervisorId) {
    const key      = `payroll:${supervisorId}`;
    const windowMs = 60 * 60 * 1000;
    const maxTries = 3;
    const rec      = getRecord(key, windowMs);

    if (rec.attempts.length >= maxTries) {
      return makeResult(false, 'Payroll run limit reached (3/hour). Please wait before running again.');
    }
    rec.attempts.push(Date.now());
    return makeResult(true);
  },

  /** General API request limiter (100 / 60s) */
  checkAPIRequest(userId) {
    const key      = `api:${userId}`;
    const windowMs = 60 * 1000;
    const maxTries = 100;
    const rec      = getRecord(key, windowMs);

    if (rec.attempts.length >= maxTries) {
      return makeResult(false, 'Request rate limit exceeded. Please slow down.');
    }
    rec.attempts.push(Date.now());
    return makeResult(true);
  },

  /** Reset all limits (admin override / testing only) */
  reset() {
    _store.clear();
  },

  /** Get current attempt count for a key */
  getAttemptCount(prefix, id) {
    const key = `${prefix}:${id}`;
    if (!_store.has(key)) return 0;
    return _store.get(key).attempts.length;
  },
};

export default rateLimiter;

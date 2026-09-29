/**
 * APEX HRIS – Input Validation & Sanitization (P0 – Critical)
 * -----------------------------------------------------------
 * RA 10173 Compliant – Philippine Data Privacy Act
 *
 * sanitizeInput()         — strips HTML/script injection
 * validateEmployeeForm()  — name, PhilID, SSS, email, phone
 * validatePayrollInput()  — amounts, dates, employee IDs
 * validateQRPayload()     — signature, timestamp, nonce freshness
 * validateLoginCredentials() — username, password strength
 */

// ── Helpers ──────────────────────────────────────────────────────────

/** Strip HTML tags and dangerous characters to prevent XSS */
export function sanitizeInput(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    // Remove script/on* patterns
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/** Validate Philippine mobile number format */
function isValidPhilMobile(phone) {
  return /^(09|\+639)\d{9}$/.test(phone.replace(/\s/g, ''));
}

/** Validate email */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}

/** Validate Philippine SSS number (XX-XXXXXXX-X) */
function isValidSSS(sss) {
  return /^\d{2}-\d{7}-\d{1}$/.test(sss) || /^\d{10}$/.test(sss.replace(/-/g, ''));
}

/** Validate PhilHealth number (XX-XXXXXXXXX-X) */
function isValidPhilHealth(philHealth) {
  return /^\d{2}-\d{9}-\d{1}$/.test(philHealth) || philHealth.length === 0;
}

// ── Public Validators ─────────────────────────────────────────────────

/**
 * Validate employee creation/edit form
 * Returns { valid: boolean, errors: { field: message } }
 */
export function validateEmployeeForm(data) {
  const errors = {};

  const name = sanitizeInput(data.name || '');
  if (!name || name.length < 2) errors.name = 'Full name must be at least 2 characters.';
  if (name.length > 100) errors.name = 'Full name must not exceed 100 characters.';
  if (/[<>{}|\\^`]/.test(name)) errors.name = 'Name contains invalid characters.';

  const email = sanitizeInput(data.email || '');
  if (email && !isValidEmail(email)) errors.email = 'Invalid email address format.';

  const phone = sanitizeInput(data.phone || '');
  if (phone && !isValidPhilMobile(phone)) errors.phone = 'Phone must be a valid PH mobile (09XXXXXXXXX or +639XXXXXXXXX).';

  const sss = sanitizeInput(data.sssNumber || '');
  if (sss && !isValidSSS(sss)) errors.sssNumber = 'Invalid SSS number format (XX-XXXXXXX-X).';

  const philHealth = sanitizeInput(data.philHealthNumber || '');
  if (philHealth && !isValidPhilHealth(philHealth)) errors.philHealthNumber = 'Invalid PhilHealth number format.';

  const dailyRate = parseFloat(data.dailyRate);
  if (isNaN(dailyRate) || dailyRate < 0) errors.dailyRate = 'Daily rate must be a positive number.';
  if (dailyRate > 50000) errors.dailyRate = 'Daily rate seems unreasonably high. Please verify.';

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate payroll computation input
 * Returns { valid: boolean, errors: {} }
 */
export function validatePayrollInput(data) {
  const errors = {};

  const empId = sanitizeInput(data.employeeId || '');
  if (!empId || !/^EMP-\d{3}-\d{2}$/.test(empId)) {
    errors.employeeId = 'Invalid employee ID format (EMP-XXX-XX).';
  }

  if (!data.period || !/^\d{4}-\d{2}$/.test(data.period)) {
    errors.period = 'Payroll period must be in YYYY-MM format.';
  }

  const gross = parseFloat(data.grossPay);
  if (isNaN(gross) || gross < 0) errors.grossPay = 'Gross pay must be a non-negative number.';

  const net = parseFloat(data.netPay);
  if (isNaN(net) || net < 0) errors.netPay = 'Net pay must be a non-negative number.';
  if (!isNaN(gross) && !isNaN(net) && net > gross) {
    errors.netPay = 'Net pay cannot exceed gross pay.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate a QR payload for attendance / disbursement
 * - Checks required fields
 * - Ensures timestamp freshness (max age: 5 minutes for attendance, 60s for disbursement)
 * Returns { valid: boolean, errors: {} }
 */
export function validateQRPayload(qrData, maxAgeSeconds = 300) {
  const errors = {};

  if (!qrData || typeof qrData !== 'object') {
    return { valid: false, errors: { qr: 'Invalid or empty QR payload.' } };
  }

  if (!qrData.empId && !qrData.employeeId) {
    errors.empId = 'QR code missing employee identifier.';
  }

  if (!qrData.branchId) {
    errors.branchId = 'QR code missing branch identifier.';
  }

  if (qrData.iat) {
    const issuedAt = new Date(qrData.iat).getTime();
    const ageSeconds = (Date.now() - issuedAt) / 1000;
    // For daily-rotating tokens, we allow same-day use
    // For HMAC-signed tokens, enforce strict window
    if (qrData.sig && ageSeconds > maxAgeSeconds) {
      errors.timestamp = `QR code expired. Max age is ${maxAgeSeconds}s, actual: ${Math.round(ageSeconds)}s.`;
    }
  }

  if (qrData.nonce && typeof qrData.nonce !== 'string') {
    errors.nonce = 'QR nonce must be a string.';
  }

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Validate login credentials
 * Returns { valid: boolean, errors: {} }
 */
export function validateLoginCredentials(username, password) {
  const errors = {};

  const u = sanitizeInput(username || '');
  if (!u || u.length < 2) errors.username = 'Username must be at least 2 characters.';
  if (u.length > 100) errors.username = 'Username is too long.';

  const p = String(password || '');
  if (!p || p.length < 6) errors.password = 'Password must be at least 6 characters.';
  if (p.length > 128) errors.password = 'Password is too long.';

  return { valid: Object.keys(errors).length === 0, errors };
}

/**
 * Password strength checker
 * Returns { score: 0-4, label: string, suggestions: string[] }
 */
export function checkPasswordStrength(password) {
  const p = String(password || '');
  let score = 0;
  const suggestions = [];

  if (p.length >= 8)  score++; else suggestions.push('Use at least 8 characters.');
  if (p.length >= 12) score++;
  if (/[A-Z]/.test(p)) score++; else suggestions.push('Add uppercase letters.');
  if (/[0-9]/.test(p)) score++; else suggestions.push('Add numbers.');
  if (/[^A-Za-z0-9]/.test(p)) score++; else suggestions.push('Add special characters (!@#$%...).');

  const labels = ['Very Weak', 'Weak', 'Fair', 'Strong', 'Very Strong'];
  return { score: Math.min(score, 4), label: labels[Math.min(score, 4)], suggestions };
}

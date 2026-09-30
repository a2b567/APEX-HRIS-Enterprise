/**
 * QR Code Generation & Payload Utilities
 * 
 * NOTE: QR token must be validated server-side (Go Fiber) in real deployment.
 * Frontend check is only for UX. Backend must verify:
 *   1. Token signature is valid
 *   2. Employee's branch_id === supervisor's branch_id
 *   3. Token not expired / revoked
 */

export const generateUniqueTokenId = () => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 8; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

export const createEmployeeQRToken = (employeeId, branchId) => {
  const randomSuffix = generateUniqueTokenId();
  return `${employeeId}-${branchId}-${randomSuffix}`;
};

export const encodeQRPayload = (employee) => {
  if (!employee) return '';
  // Direct Employee ID: Minimal Version 1/2 QR code (only ~21x21 big blocks)
  // Scannable in <20ms by any webcam, mobile screen, or low-light environment
  return String(employee.id || employee.employeeId || '').trim();
};

export const parseQRPayload = (qrString) => {
  if (!qrString || typeof qrString !== 'string') {
    return { success: false, error: 'Empty or invalid QR code string' };
  }

  const trimmed = qrString.trim();

  // 1. Try parsing JSON structured payload
  try {
    const data = JSON.parse(trimmed);
    const empId = data.empId || data.employeeId || data.id || data.employee_id || data.employeeCode;
    const branchId = data.branchId || data.branch_id;
    if (empId) {
      return {
        success: true,
        employeeId: empId,
        branchId: branchId || '',
        name: data.name || '',
        token: data.token || '',
        issuedAt: data.iat || new Date().toISOString().split('T')[0],
      };
    }
  } catch (e) {
    // Not JSON, continue to string patterns
  }

  // 2. Token pattern: EMP-001-01-BRANCH-001-xxxx or similar
  if (trimmed.includes('-BRANCH-')) {
    const parts = trimmed.split('-BRANCH-');
    const empId = parts[0];
    const rest = parts[1] ? parts[1].split('-') : [];
    const branchId = rest[0] ? `BRANCH-${rest[0]}` : '';
    return {
      success: true,
      employeeId: empId,
      branchId: branchId,
      name: '',
      token: trimmed,
      issuedAt: new Date().toISOString().split('T')[0],
    };
  }

  // 3. Direct ID formats (EMP-xxx-yy, EMP-xxx, EMPxxx, etc.)
  if (trimmed.toUpperCase().startsWith('EMP')) {
    return {
      success: true,
      employeeId: trimmed,
      branchId: '',
      name: '',
      token: trimmed,
      issuedAt: new Date().toISOString().split('T')[0],
    };
  }

  // 4. Any non-empty string fallback (could be employee ID, username, or name)
  if (trimmed.length > 0) {
    return {
      success: true,
      employeeId: trimmed,
      branchId: '',
      name: '',
      token: trimmed,
      issuedAt: new Date().toISOString().split('T')[0],
    };
  }

  return { success: false, error: 'Unrecognized QR code format. Not a valid Company Employee Badge.' };
};

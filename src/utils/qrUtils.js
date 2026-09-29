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
  return JSON.stringify({
    v: '1.0',
    empId: employee.id,
    branchId: employee.branchId,
    name: employee.name,
    token: employee.qrToken || createEmployeeQRToken(employee.id, employee.branchId),
    iat: employee.qrIssuedAt || new Date().toISOString().split('T')[0],
  });
};

export const parseQRPayload = (qrString) => {
  if (!qrString || typeof qrString !== 'string') {
    return { success: false, error: 'Empty or invalid QR code string' };
  }

  const trimmed = qrString.trim();

  // 1. Try parsing JSON structured payload
  try {
    const data = JSON.parse(trimmed);
    if (data.empId && data.branchId) {
      return {
        success: true,
        employeeId: data.empId,
        branchId: data.branchId,
        name: data.name || '',
        token: data.token || '',
        issuedAt: data.iat || '',
      };
    }
  } catch (e) {
    // Fallback: try parsing hyphen-separated format (e.g. EMP-001-01-BRANCH-001-a3f9c2d1)
  }

  // 2. Fallback: direct employee ID match or legacy token
  if (trimmed.startsWith('EMP-')) {
    const parts = trimmed.split('-');
    // Expected format: EMP-001-01 or EMP-001-01-BRANCH-001-...
    if (parts.length >= 3) {
      const branchNum = parts[1]; // e.g. 001
      const empId = `EMP-${parts[1]}-${parts[2]}`;
      const branchId = `BRANCH-${branchNum}`;
      return {
        success: true,
        employeeId: empId,
        branchId: branchId,
        name: '',
        token: trimmed,
        issuedAt: new Date().toISOString().split('T')[0],
      };
    }
  }

  return { success: false, error: 'Unrecognized QR code format. Not a valid Company Employee Badge.' };
};

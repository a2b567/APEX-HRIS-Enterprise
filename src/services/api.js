// API Service for connecting frontend to GroceryBackend (Go Fiber + PostgreSQL)

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';
const STORAGE_KEY_TOKEN = 'dtr_jwt_token';

export const getToken = () => localStorage.getItem(STORAGE_KEY_TOKEN);
export const setToken = (token) => {
  if (token) {
    localStorage.setItem(STORAGE_KEY_TOKEN, token);
  } else {
    localStorage.removeItem(STORAGE_KEY_TOKEN);
  }
};

/**
 * Universal fetch wrapper with authorization header
 */
async function request(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const url = endpoint.startsWith('http') ? endpoint : `${API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const errorMsg = data?.message || data?.error || `HTTP error ${response.status}`;
      return {
        success: false,
        status: response.status,
        message: errorMsg,
        data: null,
      };
    }

    return {
      success: true,
      status: response.status,
      data: data?.data ?? data,
      raw: data,
    };
  } catch (error) {
    console.warn(`[API Error] ${endpoint}:`, error.message);
    return {
      success: false,
      status: 0,
      message: error.message || 'Network connection failed',
      data: null,
    };
  }
}

export const api = {
  // Health check
  health: () => request('/health'),

  // Auth endpoints
  auth: {
    login: async (username, password) => {
      const res = await request('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      if (res.success && res.data?.token) {
        setToken(res.data.token);
      }
      return res;
    },
    logout: () => {
      setToken(null);
    },
  },

  // Branches
  branches: {
    getAll: () => request('/branches'),
    getById: (id) => request(`/branches/${id}`),
    create: (branchData) => request('/branches', { method: 'POST', body: JSON.stringify(branchData) }),
  },

  // Employees
  employees: {
    getAll: (branchId) => request(branchId ? `/employees?branch_id=${branchId}` : '/employees'),
    getById: (id) => request(`/employees/${id}`),
    register: (employeeData) => request('/employees', { method: 'POST', body: JSON.stringify(employeeData) }),
    update: (id, employeeData) => request(`/employees/${id}`, { method: 'PUT', body: JSON.stringify(employeeData) }),
    deactivate: (id) => request(`/employees/${id}`, { method: 'DELETE' }),
    getQR: (id) => request(`/employees/${id}/qr`),
  },

  // Attendance
  attendance: {
    scanQR: (payload) => request('/attendance/scan', { method: 'POST', body: JSON.stringify(payload) }),
    manualLog: (data) => request('/attendance/manual', { method: 'POST', body: JSON.stringify(data) }),
    getByDate: (branchId, date) => request(`/attendance/daily?branch_id=${branchId}&date=${date}`),
    getHistory: (employeeId, from, to) => request(`/attendance/employee/${employeeId}?from=${from}&to=${to}`),
  },

  // Payroll & Salary
  payroll: {
    generate: (data) => request('/payroll/generate', { method: 'POST', body: JSON.stringify(data) }),
    getSummary: (branchId, period) => request(`/payroll/summary?branch_id=${branchId}&period=${period}`),
  },

  // Reports & Logs
  reports: {
    getSummary: (branchId, from, to) => request(`/reports/summary?branch_id=${branchId}&from=${from}&to=${to}`),
    getAuditLogs: (limit = 50) => request(`/audit-logs?limit=${limit}`),
  },
};

export default api;

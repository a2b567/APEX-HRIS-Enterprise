import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_USERS } from '../data/mockData';
import { api } from '../services/api';
import { rateLimiter } from '../security/rateLimiter';
import auditLogger from '../security/auditLogger';

const AuthContext = createContext(null);

const STORAGE_KEY_AUTH = 'dtr_payroll_auth_user_v4_nodemo';

// Clear old auth cache on load
localStorage.removeItem('dtr_payroll_auth_user_v3_clean');

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_AUTH);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse saved auth', e);
    }
    return null;
  });

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem(STORAGE_KEY_AUTH, JSON.stringify(user));
    } else {
      localStorage.removeItem(STORAGE_KEY_AUTH);
    }
  }, [user]);

  const login = async (username, password, expectedRole = null) => {
    setLoading(true);

    // ── Rate limit check (P0 Security) ──
    const rateCheck = rateLimiter.checkLogin(username);
    if (!rateCheck.allowed) {
      setLoading(false);
      await auditLogger.log('LOGIN_BLOCKED', { username, reason: rateCheck.message });
      return { success: false, message: rateCheck.message, locked: true };
    }

    try {
      // 1. Attempt backend Go API login
      const backendRes = await api.auth.login(username.trim(), password);
      if (backendRes.success && backendRes.data) {
        const apiData = backendRes.data;
        const loggedUserRole = apiData.user?.role?.name || apiData.role || 'SUPER_ADMIN';

        if (expectedRole) {
          const isRoleValid =
            (expectedRole === 'ADMIN' && (loggedUserRole === 'SUPER_ADMIN' || loggedUserRole === 'ADMIN')) ||
            (expectedRole === 'SUPERVISOR' && loggedUserRole === 'SUPERVISOR') ||
            (expectedRole === 'EMPLOYEE' && loggedUserRole === 'EMPLOYEE');
          if (!isRoleValid) {
            setLoading(false);
            return {
              success: false,
              message: `Maling account role ang napili. Ang account na ito ay hindi pang-${expectedRole.toLowerCase()}.`,
            };
          }
        }

        const loggedUser = {
          id: apiData.user?.id || apiData.id || `USR-${Date.now()}`,
          username: apiData.user?.username || username,
          name: apiData.user?.name || apiData.user?.username || username,
          role: loggedUserRole,
          branchId: apiData.user?.employee?.branch_id || 'BRANCH-001',
          branchName: apiData.user?.employee?.branch?.branch_name || 'Main Branch',
          employeeId: apiData.user?.employee?.employee_code || apiData.employee_id || null,
          token: apiData.token,
        };
        setUser(loggedUser);
        setLoading(false);
        rateLimiter.clearLoginFailures(username);
        await auditLogger.log('LOGIN_SUCCESS', { source: 'backend', username }, { id: loggedUser.id, name: loggedUser.name, role: loggedUser.role });
        return { success: true, user: loggedUser, fromBackend: true };
      }
    } catch (err) {
      console.warn('Backend login attempt failed, evaluating local mock auth:', err);
    }

    // 2. Fallback check against stored users
    let allUsers = INITIAL_USERS;
    try {
      const saved = localStorage.getItem('dtr_payroll_database_v6_5sup_users') || localStorage.getItem('dtr_payroll_database_v5_testemp_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Only guarantee the Super Admin (id: 1) is always present; respect deletions for others
          const superAdmin = INITIAL_USERS.find((u) => u.id === 1);
          const hasAdmin = parsed.some((u) => u.id === 1);
          allUsers = superAdmin && !hasAdmin ? [superAdmin, ...parsed] : parsed;
        }
      }
    } catch (e) {
      console.warn('Error reading stored users:', e);
    }

    const q = username.trim().toLowerCase();
    // Match by name, username, email, or employee ID
    const matched = allUsers.find(
      (u) =>
        (u.name && u.name.toLowerCase() === q) ||
        (u.username && u.username.toLowerCase() === q) ||
        (u.email && u.email.toLowerCase() === q) ||
        (u.employeeId && u.employeeId.toLowerCase() === q)
    );

    if (!matched) {
      setLoading(false);
      rateLimiter.recordLoginFailure(username);
      await auditLogger.log('LOGIN_FAILED', { username, reason: 'No account found' });
      return { success: false, message: 'No account found. Check your name or username.' };
    }

    // Role mismatch verification
    if (expectedRole) {
      const isRoleValid =
        (expectedRole === 'ADMIN' && (matched.role === 'SUPER_ADMIN' || matched.role === 'ADMIN')) ||
        (expectedRole === 'SUPERVISOR' && matched.role === 'SUPERVISOR') ||
        (expectedRole === 'EMPLOYEE' && matched.role === 'EMPLOYEE');

      if (!isRoleValid) {
        setLoading(false);
        const roleLabelMap = {
          SUPER_ADMIN: 'Admin',
          ADMIN: 'Admin',
          SUPERVISOR: 'Supervisor',
          EMPLOYEE: 'Employee',
        };
        const actualRoleName = roleLabelMap[matched.role] || matched.role;
        const selectedRoleName = roleLabelMap[expectedRole] || expectedRole;
        await auditLogger.log('LOGIN_FAILED', { username, reason: `Role mismatch: selected ${selectedRoleName}, actual ${actualRoleName}` });
        return {
          success: false,
          message: `Hindi pwedeng mag-login. Naka-select ang "${selectedRoleName}" role pero ang account na ito ay pang-${actualRoleName}. Piliin ang tamang role sa itaas.`,
        };
      }
    }

    const cleanPass = password.trim();

    // Strict password check: must match stored password or the role default or employee ID
    const isDirectMatch =
      matched.password === cleanPass ||
      matched.password === `hashed_${cleanPass}` ||
      (matched.employeeId && (matched.employeeId === cleanPass || matched.employeeId.toLowerCase() === cleanPass.toLowerCase()));

    const isDefaultRolePass =
      (matched.role === 'SUPER_ADMIN' && cleanPass === 'Admin@123') ||
      (matched.role === 'SUPERVISOR' && (cleanPass === 'Supervisor@123' || cleanPass === 'Sup@123')) ||
      (matched.role === 'EMPLOYEE' && (cleanPass === 'Emp@123' || cleanPass === 'EMP-001-01'));

    if (!isDirectMatch && !isDefaultRolePass) {
      setLoading(false);
      rateLimiter.recordLoginFailure(username);
      await auditLogger.log('LOGIN_FAILED', { username, reason: 'Incorrect password' });
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    setUser(matched);
    setLoading(false);
    rateLimiter.clearLoginFailures(username);
    await auditLogger.log('LOGIN_SUCCESS', { source: 'local', username }, { id: matched.id, name: matched.name, role: matched.role });
    return { success: true, user: matched };
  };

  const loginUserDirectly = (userObj) => {
    setUser(userObj);
    return true;
  };

  const loginAsDemoRole = (role, targetBranchId = null) => {
    let allUsers = INITIAL_USERS;
    try {
      const saved = localStorage.getItem('dtr_payroll_database_v4_nodemo_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allUsers = parsed;
        }
      }
    } catch (e) {}

    let targetUser;
    if (role === 'SUPER_ADMIN') {
      targetUser = allUsers.find((u) => u.role === 'SUPER_ADMIN');
    } else if (role === 'SUPERVISOR') {
      targetUser = allUsers.find(
        (u) => u.role === 'SUPERVISOR' && (targetBranchId ? u.branchId === targetBranchId : true)
      );
    } else if (role === 'EMPLOYEE') {
      targetUser = allUsers.find(
        (u) => u.role === 'EMPLOYEE' && (targetBranchId ? u.branchId === targetBranchId : true)
      );
    }

    if (targetUser) {
      setUser(targetUser);
      return true;
    }
    return false;
  };

  const logout = async () => {
    if (user) {
      await auditLogger.log('LOGOUT', { reason: 'manual' }, { id: user.id, name: user.name, role: user.role });
    }
    setUser(null);
    localStorage.removeItem(STORAGE_KEY_AUTH);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || null,
        branchId: user?.branchId || null,
        employeeId: user?.employeeId || null,
        login,
        loginUserDirectly,
        loginAsDemoRole,
        logout,
        loading,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_USERS } from '../data/mockData';
import { api } from '../services/api';

const AuthContext = createContext(null);

const STORAGE_KEY_AUTH = 'dtr_payroll_auth_user_v3_clean';

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

  const login = async (username, password) => {
    setLoading(true);

    try {
      // 1. Attempt backend Go API login
      const backendRes = await api.auth.login(username.trim(), password);
      if (backendRes.success && backendRes.data) {
        const apiData = backendRes.data;
        const loggedUser = {
          id: apiData.user?.id || apiData.id || `USR-${Date.now()}`,
          username: apiData.user?.username || username,
          name: apiData.user?.name || apiData.user?.username || username,
          role: apiData.user?.role?.name || apiData.role || 'SUPER_ADMIN',
          branchId: apiData.user?.employee?.branch_id || 'BRANCH-001',
          branchName: apiData.user?.employee?.branch?.branch_name || 'Main Branch',
          employeeId: apiData.user?.employee?.employee_code || apiData.employee_id || null,
          token: apiData.token,
        };
        setUser(loggedUser);
        setLoading(false);
        return { success: true, user: loggedUser, fromBackend: true };
      }
    } catch (err) {
      console.warn('Backend login attempt failed, evaluating local mock auth:', err);
    }

    // 2. Fallback check against stored mock and registered users
    let allUsers = INITIAL_USERS;
    try {
      const saved = localStorage.getItem('dtr_payroll_database_v3_clean_users');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allUsers = parsed;
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
      return { success: false, message: 'No account found. Check your name or username.' };
    }

    const cleanPass = password.trim();

    // Strict password check: must match stored password or the role default
    const isDirectMatch =
      matched.password === cleanPass ||
      matched.password === `hashed_${cleanPass}`;

    const isDefaultRolePass =
      (matched.role === 'SUPER_ADMIN' && cleanPass === 'Admin@123') ||
      (matched.role === 'SUPERVISOR' && cleanPass === 'Sup@123') ||
      (matched.role === 'EMPLOYEE' && cleanPass === 'Emp@123');

    if (!isDirectMatch && !isDefaultRolePass) {
      setLoading(false);
      return { success: false, message: 'Incorrect password. Please try again.' };
    }

    setUser(matched);
    setLoading(false);
    return { success: true, user: matched };
  };

  const loginUserDirectly = (userObj) => {
    setUser(userObj);
    return true;
  };

  const loginAsDemoRole = (role, targetBranchId = null) => {
    let allUsers = INITIAL_USERS;
    try {
      const saved = localStorage.getItem('dtr_payroll_database_v3_clean_users');
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

  const logout = () => {
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

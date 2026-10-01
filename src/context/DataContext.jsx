import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import {
  INITIAL_BRANCHES,
  INITIAL_USERS,
  INITIAL_EMPLOYEES,
  INITIAL_SETTINGS,
  generateInitialAttendanceLogs,
} from '../data/mockData';
import { calculateTimeEntry } from '../utils/dtrCalculator';
import { parseQRPayload, createEmployeeQRToken } from '../utils/qrUtils';
import { soundFeedback } from '../utils/audioFeedback';
import { secureStorage } from '../utils/securityUtils';
import {
  deleteUserFromSupabase,
  deleteEmployeeFromSupabase,
  deleteBranchFromSupabase,
  isSupabaseConfigured,
  fetchUsersFromSupabase,
  fetchEmployeesFromSupabase,
  fetchBranchesFromSupabase,
  fetchAttendanceLogsFromSupabase,
  fetchDisbursementsFromSupabase,
  syncUserToSupabase,
  syncEmployeeToSupabase,
  syncBranchToSupabase,
  logAttendanceToSupabase,
  syncDisbursementToSupabase,
  supabase,
} from '../services/supabaseClient';

export const DataContext = createContext(null);

// v8_redmart: Guaranteed sync of Aron & Marco supervisors across all devices
const STORAGE_KEY_DATA = 'dtr_payroll_database_v8_redmart';
const OLD_KEY = 'dtr_payroll_database_v3_clean';

// One-time purge of old cache keys on first load
const purgeOldCache = () => {
  const oldKeys = [
    'dtr_payroll_database_v6_5sup_branches', 'dtr_payroll_database_v6_5sup_users',
    'dtr_payroll_database_v6_5sup_employees', 'dtr_payroll_database_v6_5sup_attendance',
    'dtr_payroll_database_v5_testemp_users', 'dtr_payroll_database_v5_testemp_branches',
    `${OLD_KEY}_branches`, `${OLD_KEY}_employees`, `${OLD_KEY}_users`,
    `${OLD_KEY}_attendance`, `${OLD_KEY}_settings`, `${OLD_KEY}_scans`,
    `APEX_ENC_${OLD_KEY}_branches`, `APEX_ENC_${OLD_KEY}_employees`,
    `APEX_ENC_${OLD_KEY}_users`, `APEX_ENC_${OLD_KEY}_attendance`,
    `APEX_ENC_${OLD_KEY}_settings`, `APEX_ENC_${OLD_KEY}_scans`,
    OLD_KEY,
  ];
  oldKeys.forEach((k) => {
    localStorage.removeItem(k);
    localStorage.removeItem(`APEX_ENC_${k}`);
  });
};
purgeOldCache();

export const DataProvider = ({ children }) => {
  const [branches, setBranches] = useState(() => {
    const saved = secureStorage.getItem(`${STORAGE_KEY_DATA}_branches`);
    if (saved && Array.isArray(saved) && saved.length > 0) {
      return saved;
    }
    return INITIAL_BRANCHES;
  });

  const [users, setUsers] = useState(() => {
    const saved = secureStorage.getItem(`${STORAGE_KEY_DATA}_users`);
    if (saved && Array.isArray(saved)) {
      return saved;
    }
    return INITIAL_USERS;
  });

  const [employees, setEmployees] = useState(() => {
    const raw = secureStorage.getItem(`${STORAGE_KEY_DATA}_employees`) || INITIAL_EMPLOYEES;
    if (!Array.isArray(raw)) return INITIAL_EMPLOYEES;
    
    // Auto-heal duplicate IDs so every single employee has a strictly unique ID & UID
    const seenIds = new Set();
    return raw.map((emp, index) => {
      let uniqueId = emp.id;
      if (!uniqueId || seenIds.has(uniqueId)) {
        const branchNum = (emp.branchId || 'BRANCH-001').replace('BRANCH-', '');
        uniqueId = `EMP-${branchNum}-${String(index + 1).padStart(2, '0')}`;
      }
      seenIds.add(uniqueId);
      return {
        ...emp,
        id: uniqueId,
        uid: emp.uid || `EMP_UID_${index}_${Math.random().toString(36).slice(2, 8)}`,
      };
    });
  });

  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    return secureStorage.getItem(`${STORAGE_KEY_DATA}_attendance`) || generateInitialAttendanceLogs();
  });

  const attendanceLogsRef = useRef(attendanceLogs);
  useEffect(() => {
    attendanceLogsRef.current = attendanceLogs;
  }, [attendanceLogs]);

  const [settings, setSettings] = useState(() => {
    const saved = secureStorage.getItem(`${STORAGE_KEY_DATA}_settings`);
    if (saved && (saved.companyName === 'Northstar Works' || !saved.companyName)) {
      return { ...saved, companyName: 'REDMART Enterprise', systemTitle: 'REDMART Enterprise' };
    }
    return saved || INITIAL_SETTINGS;
  });

  // Real-time scan telemetry feed for dashboards (fresh empty state)
  const [liveScanFeed, setLiveScanFeed] = useState(() => {
    return secureStorage.getItem(`${STORAGE_KEY_DATA}_scans`) || [];
  });

  // Payroll Disbursement Records Map (key: `${employeeId}_${selectedMonth}_${cutoffType}`)
  const [disbursements, setDisbursements] = useState(() => {
    return secureStorage.getItem(`${STORAGE_KEY_DATA}_disbursements`) || {};
  });

  // Save changes with AES-256 encrypted storage
  useEffect(() => {
    secureStorage.setItem(`${STORAGE_KEY_DATA}_branches`, branches);
  }, [branches]);

  useEffect(() => {
    secureStorage.setItem(`${STORAGE_KEY_DATA}_users`, users);
  }, [users]);

  useEffect(() => {
    secureStorage.setItem(`${STORAGE_KEY_DATA}_employees`, employees);
  }, [employees]);

  useEffect(() => {
    secureStorage.setItem(`${STORAGE_KEY_DATA}_attendance`, attendanceLogs);
  }, [attendanceLogs]);

  useEffect(() => {
    secureStorage.setItem(`${STORAGE_KEY_DATA}_settings`, settings);
  }, [settings]);

  useEffect(() => {
    secureStorage.setItem(`${STORAGE_KEY_DATA}_scans`, liveScanFeed);
  }, [liveScanFeed]);

  useEffect(() => {
    secureStorage.setItem(`${STORAGE_KEY_DATA}_disbursements`, disbursements);
  }, [disbursements]);

  // ── Multi-Tab Real-Time Storage Listener ─────────────────────────────────
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (!e.key) return;
      if (e.key.includes(`${STORAGE_KEY_DATA}_users`) || e.key.includes(`APEX_ENC_${STORAGE_KEY_DATA}_users`)) {
        const updated = secureStorage.getItem(`${STORAGE_KEY_DATA}_users`);
        if (updated && Array.isArray(updated)) setUsers(updated);
      }
      if (e.key.includes(`${STORAGE_KEY_DATA}_branches`) || e.key.includes(`APEX_ENC_${STORAGE_KEY_DATA}_branches`)) {
        const updated = secureStorage.getItem(`${STORAGE_KEY_DATA}_branches`);
        if (updated && Array.isArray(updated)) setBranches(updated);
      }
      if (e.key.includes(`${STORAGE_KEY_DATA}_employees`) || e.key.includes(`APEX_ENC_${STORAGE_KEY_DATA}_employees`)) {
        const updated = secureStorage.getItem(`${STORAGE_KEY_DATA}_employees`);
        if (updated && Array.isArray(updated)) setEmployees(updated);
      }
      if (e.key.includes(`${STORAGE_KEY_DATA}_attendance`) || e.key.includes(`APEX_ENC_${STORAGE_KEY_DATA}_attendance`)) {
        const updated = secureStorage.getItem(`${STORAGE_KEY_DATA}_attendance`);
        if (updated && Array.isArray(updated)) setAttendanceLogs(updated);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // ── Supabase Real-Time Channel Subscription (Cross-Device Sync) ──────────
  useEffect(() => {
    if (!isSupabaseConfigured() || !supabase) return;

    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'users' }, async () => {
        try {
          const cloudUsers = await fetchUsersFromSupabase();
          if (cloudUsers && cloudUsers.length > 0) setUsers(cloudUsers);
        } catch (e) {}
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'employees' }, async () => {
        try {
          const cloudEmps = await fetchEmployeesFromSupabase();
          if (cloudEmps && cloudEmps.length > 0) setEmployees(cloudEmps);
        } catch (e) {}
      })
      .subscribe();

    return () => {
      try {
        supabase.removeChannel(channel);
      } catch (e) {}
    };
  }, []);

  // ── Continuous 5-Second Cloud Sync & Bidirectional Merge (Cross-Device Database Sync) ──
  useEffect(() => {
    if (!isSupabaseConfigured()) return;
    const syncCloudData = async () => {
      try {
        const [cloudUsers, cloudEmployees, cloudBranches, cloudAttendance, cloudDisbursements] = await Promise.all([
          fetchUsersFromSupabase(),
          fetchEmployeesFromSupabase(),
          fetchBranchesFromSupabase(),
          fetchAttendanceLogsFromSupabase(),
          fetchDisbursementsFromSupabase(),
        ]);

        // 1. Users
        const localUsers = secureStorage.getItem(`${STORAGE_KEY_DATA}_users`) || INITIAL_USERS;
        const mergedUsers = Array.isArray(cloudUsers) && cloudUsers.length > 0 ? [...cloudUsers] : [];
        localUsers.forEach((lUser) => {
          if (!mergedUsers.some((u) => u.id === lUser.id || (u.username && u.username.toLowerCase() === lUser.username?.toLowerCase()))) {
            mergedUsers.push(lUser);
            syncUserToSupabase(lUser).catch(() => {});
          }
        });
        if (mergedUsers.length > 0) {
          setUsers(mergedUsers);
          secureStorage.setItem(`${STORAGE_KEY_DATA}_users`, mergedUsers);
        }

        // 2. Employees
        const localEmployees = secureStorage.getItem(`${STORAGE_KEY_DATA}_employees`) || INITIAL_EMPLOYEES;
        const mergedEmployees = Array.isArray(cloudEmployees) && cloudEmployees.length > 0 ? [...cloudEmployees] : [];
        localEmployees.forEach((lEmp) => {
          if (!mergedEmployees.some((e) => e.id === lEmp.id || (e.name && e.name.toLowerCase() === lEmp.name?.toLowerCase()))) {
            mergedEmployees.push(lEmp);
            syncEmployeeToSupabase(lEmp).catch(() => {});
          }
        });
        if (mergedEmployees.length > 0) {
          setEmployees(mergedEmployees);
          secureStorage.setItem(`${STORAGE_KEY_DATA}_employees`, mergedEmployees);
        }

        // 3. Branches
        const localBranches = secureStorage.getItem(`${STORAGE_KEY_DATA}_branches`) || INITIAL_BRANCHES;
        const mergedBranches = Array.isArray(cloudBranches) && cloudBranches.length > 0 ? [...cloudBranches] : [];
        localBranches.forEach((lBranch) => {
          if (!mergedBranches.some((b) => b.id === lBranch.id)) {
            mergedBranches.push(lBranch);
            syncBranchToSupabase(lBranch).catch(() => {});
          }
        });
        if (mergedBranches.length > 0) {
          setBranches(mergedBranches);
          secureStorage.setItem(`${STORAGE_KEY_DATA}_branches`, mergedBranches);
        }

        // 4. Attendance Logs
        if (Array.isArray(cloudAttendance) && cloudAttendance.length > 0) {
          setAttendanceLogs(cloudAttendance);
          secureStorage.setItem(`${STORAGE_KEY_DATA}_attendance`, cloudAttendance);
        }

        // 5. Disbursements
        if (cloudDisbursements && Object.keys(cloudDisbursements).length > 0) {
          setDisbursements(cloudDisbursements);
          secureStorage.setItem(`${STORAGE_KEY_DATA}_disbursements`, cloudDisbursements);
        }
      } catch (err) {
        console.warn('[Supabase Sync] Background sync error:', err);
      }
    };

    // Run immediately
    syncCloudData();

    // Continuous 5-second sync polling for cross-device & Messenger browser compatibility
    const interval = setInterval(syncCloudData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Reset database back to clean seed
  const resetToFactoryDefaults = () => {
    setBranches(INITIAL_BRANCHES);
    setUsers(INITIAL_USERS);
    setEmployees(INITIAL_EMPLOYEES);
    setAttendanceLogs(generateInitialAttendanceLogs());
    setSettings(INITIAL_SETTINGS);
    setLiveScanFeed([]);
    localStorage.clear();
  };

  /**
   * SUPERVISOR & BRANCH ASSIGNMENT RULES
   * Strict Rule: Exactly 1 Supervisor per Branch.
   */
  const reassignSupervisorToBranch = (supervisorId, newBranchId) => {
    if (newBranchId) {
      const conflictingSupervisor = users.find(
        (u) => u.role === 'SUPERVISOR' && u.branchId === newBranchId && u.id !== Number(supervisorId) && u.status === 'Active'
      );

      if (conflictingSupervisor) {
        return {
          success: false,
          message: `Branch is already assigned to ${conflictingSupervisor.name}. Exactly 1 Supervisor is allowed per Branch.`,
        };
      }
    }

    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === Number(supervisorId)) {
          return { ...u, branchId: newBranchId };
        }
        return u;
      })
    );

    setBranches((prev) =>
      prev.map((b) => {
        if (b.id === newBranchId) {
          return { ...b, supervisorId: Number(supervisorId) };
        }
        if (b.supervisorId === Number(supervisorId) && b.id !== newBranchId) {
          return { ...b, supervisorId: null };
        }
        return b;
      })
    );

    return { success: true, message: 'Supervisor reassigned successfully.' };
  };

  const addSupervisor = (supervisorData) => {
    if (supervisorData.branchId) {
      const existing = users.find(
        (u) => u.role === 'SUPERVISOR' && u.branchId === supervisorData.branchId && u.status === 'Active'
      );
      if (existing) {
        return {
          success: false,
          message: `Cannot assign: Branch already has an active supervisor (${existing.name}).`,
        };
      }
    }

    const newId = Math.max(...users.map((u) => u.id), 0) + 1;
    const newSupervisor = {
      ...supervisorData,
      id: newId,
      role: 'SUPERVISOR',
      password: supervisorData.password || 'hashed_Sup@123',
      status: supervisorData.status || 'Active',
      avatar: supervisorData.avatar || '',
    };

    setUsers((prev) => [...prev, newSupervisor]);

    if (newSupervisor.branchId) {
      setBranches((prev) =>
        prev.map((b) => (b.id === newSupervisor.branchId ? { ...b, supervisorId: newId } : b))
      );
    }

    if (isSupabaseConfigured()) {
      syncUserToSupabase(newSupervisor).catch(() => {});
    }

    return { success: true, supervisor: newSupervisor };
  };

  const updateSupervisor = (id, updatedFields) => {
    if (updatedFields.branchId) {
      const existing = users.find(
        (u) =>
          u.role === 'SUPERVISOR' &&
          u.branchId === updatedFields.branchId &&
          u.id !== Number(id) &&
          u.status === 'Active'
      );
      if (existing) {
        return {
          success: false,
          message: `Conflict: Branch already managed by ${existing.name}.`,
        };
      }
    }

    setUsers((prev) =>
      prev.map((u) => (u.id === Number(id) ? { ...u, ...updatedFields } : u))
    );

    if (updatedFields.branchId !== undefined) {
      setBranches((prev) =>
        prev.map((b) => {
          if (b.id === updatedFields.branchId) return { ...b, supervisorId: Number(id) };
          if (b.supervisorId === Number(id) && b.id !== updatedFields.branchId) return { ...b, supervisorId: null };
          return b;
        })
      );
    }

    if (isSupabaseConfigured()) {
      const targetUser = users.find((u) => u.id === Number(id));
      if (targetUser) {
        syncUserToSupabase({ ...targetUser, ...updatedFields }).catch(() => {});
      }
    }

    return { success: true };
  };

  const toggleSupervisorStatus = (id) => {
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === Number(id)) {
          const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  const deleteSupervisor = (id) => {
    const sup = users.find((u) => u.id === Number(id) && u.role === 'SUPERVISOR');
    if (!sup) return { success: false, message: 'Supervisor not found.' };

    setUsers((prev) => prev.filter((u) => u.id !== Number(id)));

    // Unassign from any branch
    setBranches((prev) =>
      prev.map((b) => (b.supervisorId === Number(id) ? { ...b, supervisorId: null } : b))
    );

    if (isSupabaseConfigured()) {
      deleteUserFromSupabase(Number(id)).catch(() => {});
    }

    return { success: true };
  };

  const addBranch = (branchData) => {
    const existingCodes = branches.map((b) => {
      const num = parseInt(b.id.replace('BRANCH-', ''), 10);
      return isNaN(num) ? 0 : num;
    });
    const nextNum = (Math.max(...existingCodes, 0) + 1).toString().padStart(3, '0');
    const newId = `BRANCH-${nextNum}`;

    const newBranch = {
      id: newId,
      code: `B${nextNum}`,
      name: branchData.name.trim(),
      location: branchData.location?.trim() || '',
      contactNumber: branchData.contactNumber?.trim() || '',
      email: branchData.email?.trim() || `${newId.toLowerCase().replace('-', '.')}@company.com`,
      supervisorId: null,
      status: 'Active',
      establishedDate: new Date().toISOString().slice(0, 10),
    };

    setBranches((prev) => [...prev, newBranch]);

    if (isSupabaseConfigured()) {
      syncBranchToSupabase(newBranch).catch(() => {});
    }

    return { success: true, branch: newBranch };
  };

  const deleteBranch = (branchId) => {
    const branch = branches.find((b) => b.id === branchId);
    if (!branch) return { success: false, message: 'Branch not found.' };

    const hasEmployees = employees.some((e) => e.branchId === branchId);
    if (hasEmployees) {
      return { success: false, message: 'Cannot delete: branch still has employees assigned to it.' };
    }

    setBranches((prev) => prev.filter((b) => b.id !== branchId));
    // Clear the branch from any supervisor records
    setUsers((prev) =>
      prev.map((u) => (u.branchId === branchId ? { ...u, branchId: null } : u))
    );

    if (isSupabaseConfigured()) {
      deleteBranchFromSupabase(branchId).catch(() => {});
    }
    return { success: true };
  };

  const updateBranch = (branchId, updates) => {
    setBranches((prev) =>
      prev.map((b) => (b.id === branchId ? { ...b, ...updates } : b))
    );

    if (isSupabaseConfigured()) {
      const b = branches.find((br) => br.id === branchId);
      if (b) syncBranchToSupabase({ ...b, ...updates }).catch(() => {});
    }
    return { success: true };
  };

  /**
   * Helper to calculate next guaranteed unique employee ID for a branch
   */
  const getNextEmployeeId = (branchId, currentList = employees) => {
    const branchNumber = (branchId || 'BRANCH-001').replace('BRANCH-', '');
    const pattern = new RegExp(`^EMP-${branchNumber}-(\\d+)$`);
    let maxSeq = 0;
    currentList.forEach((e) => {
      if (e.branchId === branchId && e.id) {
        const match = e.id.match(pattern);
        if (match) {
          const num = parseInt(match[1], 10);
          if (num > maxSeq) maxSeq = num;
        }
      }
    });
    return `EMP-${branchNumber}-${(maxSeq + 1).toString().padStart(2, '0')}`;
  };

  /**
   * EMPLOYEE MANAGEMENT (WITH AUTO QR TOKEN GENERATION & USER ACCOUNT CREATION)
   */
  const addEmployee = (empData, accountOptions = {}) => {
    const branchId = empData.branchId || 'BRANCH-001';
    const newEmpId = empData.id && !employees.some((e) => e.id === empData.id)
      ? empData.id
      : getNextEmployeeId(branchId, employees);

    let linkedUserId = empData.userId || null;
    let createdUser = null;

    // Check if user account creation is requested (default: true)
    const shouldCreateAccount = empData.createAccount !== false;

    if (shouldCreateAccount) {
      const cleanName = (empData.name || 'Staff')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '');
      let baseUsername = (empData.username || cleanName || `emp.${newEmpId.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      let generatedUsername = baseUsername;
      let counter = 1;
      while (users.some((u) => u.username.toLowerCase() === generatedUsername.toLowerCase())) {
        generatedUsername = `${baseUsername}.${counter++}`;
      }

      const existingUser = users.find(
        (u) =>
          (u.employeeId && u.employeeId === newEmpId) ||
          (u.username && u.username.toLowerCase() === generatedUsername.toLowerCase()) ||
          (empData.email && u.email && u.email.toLowerCase() === empData.email.toLowerCase())
      );

      if (existingUser) {
        linkedUserId = existingUser.id;
      } else {
        const nextUserId = Math.max(...users.map((u) => u.id), 0) + 1;
        const pass = empData.accountPassword || empData.password || 'Emp@123';

        createdUser = {
          id: nextUserId,
          role: 'EMPLOYEE',
          username: generatedUsername,
          password: pass.startsWith('hashed_') ? pass : `hashed_${pass}`,
          name: empData.name,
          email: empData.email || `${generatedUsername}@apexhris.enterprise`,
          position: empData.position || 'Staff',
          employeeId: newEmpId,
          branchId: branchId,
          avatar: '',
          status: empData.status || 'Active',
          phone: empData.phone || '',
        };

        linkedUserId = nextUserId;
        setUsers((prev) => [...prev, createdUser]);
      }
    }

    const newEmployee = {
      ...empData,
      id: newEmpId,
      uid: `EMP_UID_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      userId: linkedUserId,
      dailyRate: Number(empData.dailyRate) || 750,
      hourlyRate: Number(empData.hourlyRate) || (Number(empData.dailyRate || 750) / 8),
      status: empData.status || 'Active',
      hireDate: empData.hireDate || new Date().toISOString().split('T')[0],
      qrToken: createEmployeeQRToken(newEmpId, branchId),
      qrIssuedAt: new Date().toISOString().split('T')[0],
      qrStatus: 'active',
      idType: empData.idType || 'Government ID / PhilID',
      idDocumentUrl: empData.idDocumentUrl || null,
      idDocumentName: empData.idDocumentName || '',
      idVerificationStatus: empData.idVerificationStatus || (empData.idDocumentUrl || empData.idDocumentName ? 'Verified' : 'Pending Verification'),
      idVerifiedAt: empData.idVerifiedAt || (empData.idDocumentUrl || empData.idDocumentName ? new Date().toISOString().split('T')[0] : null),
      idVerifiedBy: empData.idVerifiedBy || 'System Administrator',
    };

    setEmployees((prev) => [...prev, newEmployee]);

    if (isSupabaseConfigured()) {
      syncEmployeeToSupabase(newEmployee).catch(() => {});
      if (createdUser) syncUserToSupabase(createdUser).catch(() => {});
    }

    return { success: true, employee: newEmployee, user: createdUser };
  };

  /**
   * BULK IMPORT EMPLOYEES (Ensures unique sequential IDs and unique user accounts)
   */
  const addEmployeesBulk = (empList) => {
    let currentEmployees = [...employees];
    let currentUsers = [...users];
    const addedEmployees = [];
    const addedUsers = [];

    empList.forEach((empData, index) => {
      const branchId = empData.branchId || 'BRANCH-001';
      const newEmpId = getNextEmployeeId(branchId, currentEmployees);

      // Clean unique username
      const cleanName = (empData.name || 'Staff')
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9]+/g, '.')
        .replace(/^\.|\.$/g, '');
      let baseUsername = (empData.username || cleanName || `emp.${newEmpId.toLowerCase().replace(/[^a-z0-9]/g, '')}`);
      let generatedUsername = baseUsername;
      let counter = 1;
      while (currentUsers.some((u) => u.username.toLowerCase() === generatedUsername.toLowerCase())) {
        generatedUsername = `${baseUsername}.${counter++}`;
      }

      const nextUserId = Math.max(...currentUsers.map((u) => u.id), 0) + 1;
      const pass = empData.accountPassword || empData.password || 'Emp@123';

      const newUser = {
        id: nextUserId,
        role: 'EMPLOYEE',
        username: generatedUsername,
        password: pass.startsWith('hashed_') ? pass : `hashed_${pass}`,
        name: empData.name,
        email: empData.email || `${generatedUsername}@apexhris.enterprise`,
        position: empData.position || 'Staff',
        employeeId: newEmpId,
        branchId: branchId,
        avatar: '',
        status: empData.status || 'Active',
        phone: empData.phone || '',
      };

      const newEmployee = {
        ...empData,
        id: newEmpId,
        uid: `EMP_UID_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 8)}`,
        userId: nextUserId,
        dailyRate: Number(empData.dailyRate) || 750,
        hourlyRate: Number(empData.hourlyRate) || (Number(empData.dailyRate || 750) / 8),
        status: empData.status || 'Active',
        hireDate: empData.hireDate || new Date().toISOString().split('T')[0],
        qrToken: createEmployeeQRToken(newEmpId, branchId),
        qrIssuedAt: new Date().toISOString().split('T')[0],
        qrStatus: 'active',
        idType: empData.idType || 'Government ID / PhilID',
        idDocumentUrl: empData.idDocumentUrl || null,
        idDocumentName: empData.idDocumentName || '',
        idVerificationStatus: empData.idVerificationStatus || (empData.idDocumentUrl || empData.idDocumentName ? 'Verified' : 'Pending Verification'),
        idVerifiedAt: empData.idVerifiedAt || (empData.idDocumentUrl || empData.idDocumentName ? new Date().toISOString().split('T')[0] : null),
        idVerifiedBy: empData.idVerifiedBy || 'System Administrator',
      };

      currentEmployees.push(newEmployee);
      currentUsers.push(newUser);
      addedEmployees.push(newEmployee);
      addedUsers.push(newUser);
    });

    setEmployees(currentEmployees);
    setUsers(currentUsers);
    return { success: true, employees: addedEmployees, users: addedUsers };
  };

  const updateEmployee = (employeeId, updates) => {
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId || (e.uid && updates.uid && e.uid === updates.uid)
          ? {
              ...e,
              ...updates,
              dailyRate: Number(updates.dailyRate) || e.dailyRate,
              hourlyRate: Number(updates.hourlyRate) || e.hourlyRate,
            }
          : e
      )
    );

    if (isSupabaseConfigured()) {
      const emp = employees.find((e) => e.id === employeeId || (e.uid && updates.uid && e.uid === updates.uid));
      if (emp) {
        syncEmployeeToSupabase({ ...emp, ...updates }).catch(() => {});
      }
    }
    return { success: true };
  };

  /**
   * DELETE EMPLOYEE — Strictly deletes only ONE single target record
   */
  const deleteEmployee = (target) => {
    let deletedId = null;
    let deletedUserId = null;

    setEmployees((prev) => {
      let indexToRemove = -1;

      // 1. If target is an object with uid, find by uid
      if (typeof target === 'object' && target !== null) {
        if (target.uid) {
          indexToRemove = prev.findIndex((e) => e.uid === target.uid);
        }
        // 2. If no uid, find by id and matching name
        if (indexToRemove === -1 && target.id && target.name) {
          indexToRemove = prev.findIndex((e) => e.id === target.id && e.name === target.name);
        }
        // 3. Fallback to first matching id
        if (indexToRemove === -1 && target.id) {
          indexToRemove = prev.findIndex((e) => e.id === target.id);
        }
      } else {
        // String ID or UID passed
        indexToRemove = prev.findIndex((e) => e.uid === target || e.id === target);
      }

      if (indexToRemove === -1) return prev;

      deletedId = prev[indexToRemove].id;
      deletedUserId = prev[indexToRemove].userId;
      const clone = [...prev];
      clone.splice(indexToRemove, 1); // Strictly remove exactly 1 single employee item!
      return clone;
    });

    if (deletedId) {
      setAttendanceLogs((prev) => prev.filter((l) => l.employeeId !== deletedId));
      if (deletedUserId) {
        setUsers((prev) => prev.filter((u) => u.id !== deletedUserId && u.employeeId !== deletedId));
      }
      if (isSupabaseConfigured()) {
        deleteEmployeeFromSupabase(deletedId).catch(() => {});
        if (deletedUserId) deleteUserFromSupabase(deletedUserId).catch(() => {});
      }
    }
    return { success: true };
  };

  const createEmployeeUser = (employeeId, userData = {}) => {
    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return { success: false, message: 'Employee profile not found' };

    const existing = users.find((u) => u.employeeId === employeeId || u.id === employee.userId);
    if (existing) {
      return { success: false, message: `Account already exists (@${existing.username})` };
    }

    const nextUserId = Math.max(...users.map((u) => u.id), 0) + 1;
    const cleanName = (userData.name || employee.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '');
    const username = userData.username || cleanName || `emp.${employee.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    const password = userData.password || 'Emp@123';

    const usernameTaken = users.some((u) => u.username.toLowerCase() === username.toLowerCase());
    const finalUsername = usernameTaken ? `${username}.${Math.floor(100 + Math.random() * 900)}` : username;

    const newUser = {
      id: nextUserId,
      role: 'EMPLOYEE',
      username: finalUsername,
      password: password.startsWith('hashed_') ? password : `hashed_${password}`,
      name: userData.name || employee.name,
      email: userData.email || employee.email || `${finalUsername}@apexhris.enterprise`,
      position: employee.position,
      employeeId: employee.id,
      branchId: employee.branchId,
      avatar: '',
      status: employee.status || 'Active',
      phone: employee.phone || '',
    };

    setUsers((prev) => [...prev, newUser]);
    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, userId: nextUserId } : e))
    );

    return { success: true, user: newUser, message: `Account created for ${employee.name} (@${finalUsername})` };
  };

  const verifyEmployeeId = (employeeId, status = 'Verified', verifiedBy = 'Supervisor/Admin') => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return { success: false, message: 'Employee not found' };

    const todayStr = new Date().toISOString().split('T')[0];
    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? {
              ...e,
              idVerificationStatus: status,
              idVerifiedAt: status === 'Verified' ? todayStr : null,
              idVerifiedBy: status === 'Verified' ? verifiedBy : null,
            }
          : e
      )
    );

    return {
      success: true,
      message: `Employee ID verification status updated to "${status}".`,
    };
  };

  const registerEmployeeAccount = (regData) => {
    const nameQuery = (regData.name || '').trim().toLowerCase();
    const emailQuery = (regData.email || '').trim().toLowerCase();
    const empIdQuery = (regData.employeeId || '').trim().toUpperCase();

    // Look for existing employee
    let matchedEmp = employees.find((e) => {
      if (empIdQuery && e.id.toUpperCase() === empIdQuery) return true;
      if (emailQuery && e.email && e.email.toLowerCase() === emailQuery) return true;
      if (nameQuery && e.name.toLowerCase() === nameQuery) return true;
      return false;
    });

    const targetBranchId = regData.branchId || (matchedEmp ? matchedEmp.branchId : (branches[0]?.id || 'BRANCH-001'));
    let assignedEmp = matchedEmp;

    // Default if no employee name on the system: create employee record with ID verification
    if (!assignedEmp) {
      const branchEmployees = employees.filter((e) => e.branchId === targetBranchId);
      const branchNumber = targetBranchId.replace('BRANCH-', '');
      const empSeq = (branchEmployees.length + 1).toString().padStart(2, '0');
      const newEmpId = `EMP-${branchNumber}-${empSeq}`;

      assignedEmp = {
        id: newEmpId,
        name: regData.name.trim(),
        email: regData.email?.trim() || `${regData.name.toLowerCase().replace(/[^a-z0-9]/g, '.')}@apexhris.enterprise`,
        phone: regData.phone || '',
        branchId: targetBranchId,
        department: regData.department || 'Operations',
        position: regData.position || 'Staff Member',
        employmentType: 'Regular Full-Time',
        dailyRate: 750,
        hourlyRate: 93.75,
        status: 'Active',
        hireDate: new Date().toISOString().split('T')[0],
        qrToken: createEmployeeQRToken(newEmpId, targetBranchId),
        qrIssuedAt: new Date().toISOString().split('T')[0],
        qrStatus: 'active',
        idType: regData.idType || 'PhilID / National ID',
        idDocumentUrl: regData.idDocumentUrl || null,
        idDocumentName: regData.idDocumentName || '',
        idVerificationStatus: regData.idDocumentUrl || regData.idDocumentName ? 'Verified' : 'Pending Verification',
        idVerifiedAt: regData.idDocumentUrl || regData.idDocumentName ? new Date().toISOString().split('T')[0] : null,
        idVerifiedBy: regData.idDocumentUrl || regData.idDocumentName ? 'Self-Upload & Auto-Confirmed' : null,
      };
      setEmployees((prev) => [...prev, assignedEmp]);
    } else if (regData.idDocumentUrl) {
      // Update existing employee's ID document if provided
      setEmployees((prev) =>
        prev.map((e) =>
          e.id === assignedEmp.id
            ? {
                ...e,
                idType: regData.idType || e.idType || 'PhilID / National ID',
                idDocumentUrl: regData.idDocumentUrl,
                idDocumentName: regData.idDocumentName || e.idDocumentName || 'id_document.jpg',
                idVerificationStatus: 'Verified',
                idVerifiedAt: new Date().toISOString().split('T')[0],
                idVerifiedBy: 'Self-Upload & Auto-Confirmed',
              }
            : e
        )
      );
    }

    const cleanUsername = (regData.username || regData.name)
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '.')
      .replace(/^\.|\.$/g, '');

    const userTaken = users.find(
      (u) =>
        (u.employeeId && u.employeeId === assignedEmp.id) ||
        (u.username && u.username.toLowerCase() === cleanUsername.toLowerCase())
    );

    if (userTaken) {
      return {
        success: false,
        message: `An account already exists for ${assignedEmp.name} (username: @${userTaken.username}). Please sign in.`,
        user: userTaken,
        employee: assignedEmp,
      };
    }

    const nextUserId = Math.max(...users.map((u) => u.id), 0) + 1;
    const finalPassword = regData.password || 'Emp@123';

    const newUser = {
      id: nextUserId,
      role: 'EMPLOYEE',
      username: cleanUsername || `emp.${assignedEmp.id.toLowerCase().replace(/[^a-z0-9]/g, '')}`,
      password: finalPassword.startsWith('hashed_') ? finalPassword : `hashed_${finalPassword}`,
      name: assignedEmp.name,
      email: assignedEmp.email || `${cleanUsername}@apexhris.enterprise`,
      position: assignedEmp.position,
      employeeId: assignedEmp.id,
      branchId: targetBranchId,
      avatar: '',
      status: 'Active',
      phone: assignedEmp.phone || '',
    };

    setUsers((prev) => [...prev, newUser]);
    setEmployees((prev) =>
      prev.map((e) => (e.id === assignedEmp.id ? { ...e, userId: nextUserId } : e))
    );

    return {
      success: true,
      message: `Account created successfully for ${assignedEmp.name}!`,
      user: newUser,
      employee: assignedEmp,
    };
  };

  const regenerateEmployeeQR = (employeeId) => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return { success: false, message: 'Employee not found' };

    const newToken = createEmployeeQRToken(emp.id, emp.branchId);
    const newIssuedAt = new Date().toISOString().split('T')[0];

    setEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId ? { ...e, qrToken: newToken, qrIssuedAt: newIssuedAt } : e
      )
    );

    return { success: true, token: newToken };
  };

  /**
   * QR SCAN ATTENDANCE ENGINE (WITH STRICT BRANCH VALIDATION)
   * NOTE: QR token must be validated server-side (Go Fiber) in real deployment.
   * Frontend check is only for UX. Backend must verify:
   *   1. Token signature is valid
   *   2. Employee's branch_id === supervisor's branch_id
   *   3. Token not expired / revoked
   */
  const recordQRScan = (qrString, scannerBranchId) => {
    const parsed = parseQRPayload(qrString);
    if (!parsed.success) {
      soundFeedback.playError();
      return {
        success: false,
        reason: 'INVALID_QR',
        message: parsed.error || 'Invalid or unrecognized QR badge code.',
      };
    }

    const searchTarget = String(parsed.employeeId).trim().toLowerCase();
    const employee = employees.find((e) => {
      const matchId = e.id && e.id.toLowerCase() === searchTarget;
      const matchEmpCode = e.employeeId && e.employeeId.toLowerCase() === searchTarget;
      const matchUserId = e.userId && String(e.userId) === searchTarget;
      const matchName = e.name && e.name.toLowerCase() === searchTarget;
      const matchToken = e.qrToken && e.qrToken.toLowerCase() === searchTarget;
      const matchIncludes = e.id && searchTarget.includes(e.id.toLowerCase());
      return matchId || matchEmpCode || matchUserId || matchName || matchToken || matchIncludes;
    });

    if (!employee) {
      try { soundFeedback.playError(); } catch (e) {}
      return {
        success: false,
        reason: 'EMPLOYEE_NOT_FOUND',
        message: `Employee (${parsed.employeeId}) is not registered in the system.`,
      };
    }

    // Branch Isolation Check (Super Admin scanner passes scannerBranchId === null to allow all)
    if (scannerBranchId && employee.branchId !== scannerBranchId) {
      soundFeedback.playError();
      const empBranch = branches.find((b) => b.id === employee.branchId);
      const scanBranch = branches.find((b) => b.id === scannerBranchId);
      return {
        success: false,
        reason: 'WRONG_BRANCH',
        employee,
        message: `Access Denied: This employee belongs to ${empBranch?.name || employee.branchId}, not ${scanBranch?.name || scannerBranchId}.`,
      };
    }

    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;
    const timeHHMM = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const displayTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    // Look up in synchronous ref
    const currentLogs = [...(attendanceLogsRef.current || [])];
    const existingIndex = currentLogs.findIndex(
      (log) =>
        log &&
        (log.employeeId === employee.id || String(log.employeeId).toLowerCase() === String(employee.id).toLowerCase()) &&
        log.date === todayStr
    );

    const existingLog = existingIndex >= 0 ? currentLogs[existingIndex] : null;

    // Case 1: No Time In recorded yet today -> Record Time In
    if (!existingLog || !existingLog.timeIn) {
      const calc = calculateTimeEntry(timeHHMM, null, 60, settings.defaultShift);
      const status = calc.lateMinutes > 0 ? 'Late' : 'Present';

      const newLog = {
        id: `ATT-${employee.id}-${todayStr}`,
        employeeId: employee.id,
        employeeName: employee.name,
        branchId: employee.branchId,
        date: todayStr,
        timeIn: timeHHMM,
        timeOut: null,
        breakMinutes: 60,
        regularHours: 0,
        overtimeHours: 0,
        lateMinutes: calc.lateMinutes,
        undertimeMinutes: 0,
        status,
        method: 'QR',
        remarks: 'QR Badge Check-In',
        isManual: false,
      };

      let nextLogs;
      if (existingIndex >= 0) {
        nextLogs = [...currentLogs];
        nextLogs[existingIndex] = { ...nextLogs[existingIndex], ...newLog };
      } else {
        nextLogs = [newLog, ...currentLogs];
      }

      attendanceLogsRef.current = nextLogs;
      setAttendanceLogs(nextLogs);

      // Add to live telemetry feed
      const scanEntry = {
        id: `scan-${Date.now()}`,
        employeeId: employee.id,
        employeeName: employee.name,
        branchId: employee.branchId,
        action: 'TIME_IN',
        time: displayTime,
        timestamp: now.toISOString(),
        status,
        method: 'QR',
      };
      setLiveScanFeed((prev) => [scanEntry, ...prev.slice(0, 19)]);

      if (status === 'Late') {
        try { soundFeedback.playWarning(); } catch (e) {}
      } else {
        try { soundFeedback.playSuccess(); } catch (e) {}
      }

      return {
        success: true,
        action: 'TIME_IN',
        status,
        time: displayTime,
        lateMinutes: calc.lateMinutes,
        employee,
        message: `🟢 TIME IN: Na-record ang Time In ni ${employee.name} (${displayTime}) - ${status === 'Late' ? `${calc.lateMinutes}m Late` : 'On Time'}.`,
      };
    }

    // Case 2: Has Time In, but no Time Out -> Record Time Out
    if (existingLog.timeIn && !existingLog.timeOut) {
      // ── Shift Schedule Time Out Verification ──
      const shiftEndTime = settings.defaultShift?.endTime || '17:00';
      const [nowH, nowM] = timeHHMM.split(':').map(Number);
      const [shiftEndH, shiftEndM] = shiftEndTime.split(':').map(Number);
      const currentTotalM = nowH * 60 + nowM;
      const shiftEndTotalM = shiftEndH * 60 + shiftEndM;

      // Check if current time is earlier than scheduled dismissal time
      if (currentTotalM < shiftEndTotalM) {
        try { soundFeedback.playError(); } catch (e) {}
        const formattedEndTime = shiftEndTime === '17:00' ? '05:00 PM' : shiftEndTime;
        return {
          success: false,
          reason: 'EARLY_TIMEOUT_BLOCKED',
          employee,
          message: `🚫 BAWAL PA MAG-TIME OUT: Hindi pa oras ng dismissal (${formattedEndTime}). Ang kasalukuyang oras pa lamang ay ${displayTime}. Mangyaring mag-scan sa tamang oras ng labasan.`,
        };
      }

      const calc = calculateTimeEntry(existingLog.timeIn, timeHHMM, existingLog.breakMinutes || 60, settings.defaultShift);

      const updatedRecord = {
        ...existingLog,
        timeOut: timeHHMM,
        regularHours: calc.regularHours,
        overtimeHours: calc.overtimeHours,
        undertimeMinutes: calc.undertimeMinutes,
        status: calc.status,
        method: 'QR',
        remarks: 'QR Badge Check-Out',
      };

      const nextLogs = [...currentLogs];
      nextLogs[existingIndex] = updatedRecord;
      attendanceLogsRef.current = nextLogs;
      setAttendanceLogs(nextLogs);

      const scanEntry = {
        id: `scan-${Date.now()}`,
        employeeId: employee.id,
        employeeName: employee.name,
        branchId: employee.branchId,
        action: 'TIME_OUT',
        time: displayTime,
        timestamp: now.toISOString(),
        status: calc.status,
        method: 'QR',
      };
      setLiveScanFeed((prev) => [scanEntry, ...prev.slice(0, 19)]);

      try { soundFeedback.playSuccess(); } catch (e) {}

      return {
        success: true,
        action: 'TIME_OUT',
        status: calc.status,
        time: displayTime,
        totalHours: calc.regularHours,
        overtimeHours: calc.overtimeHours,
        employee,
        message: `🔴 TIME OUT: Na-record ang Time Out ni ${employee.name} (${displayTime}). Total rendered: ${calc.regularHours} hrs${calc.overtimeHours > 0 ? ` (+${calc.overtimeHours}h OT)` : ''}.`,
      };
    }

    // Case 3: Both Time In and Time Out already completed -> STRICT ERROR / BLOCKED
    try { soundFeedback.playError(); } catch (e) {}
    return {
      success: false,
      reason: 'ALREADY_COMPLETED',
      employee,
      message: `🚫 BAWAL NA I-SCAN: Nakapag-Time In (${existingLog.timeIn}) at Time Out (${existingLog.timeOut}) na si ${employee.name} ngayong araw. (Isang IN at isang OUT lang bawat araw!)`,
    };
  };

  /**
   * MANUAL DTR / ATTENDANCE RECORD ACTIONS
   */
  const recordPunch = (employeeId, type = 'IN', customTime = null) => {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const timeHHMM = customTime || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const displayTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return { success: false, message: 'Employee not found' };

    const existingIndex = attendanceLogs.findIndex(
      (log) => log.employeeId === employeeId && log.date === todayStr
    );

    if (type === 'IN') {
      if (existingIndex >= 0 && attendanceLogs[existingIndex].timeIn) {
        return { success: false, message: 'Employee has already punched in for today.' };
      }

      const calc = calculateTimeEntry(timeHHMM, null, 60, settings.defaultShift);
      const status = calc.lateMinutes > 0 ? 'Late' : 'Present';

      const newLog = {
        id: `ATT-${employeeId}-${todayStr}`,
        employeeId: employee.id,
        employeeName: employee.name,
        branchId: employee.branchId,
        date: todayStr,
        timeIn: timeHHMM,
        timeOut: null,
        breakMinutes: 60,
        regularHours: 0,
        overtimeHours: 0,
        lateMinutes: calc.lateMinutes,
        undertimeMinutes: 0,
        status,
        method: 'MANUAL',
        remarks: 'Manual Button Punch In',
        isManual: true,
      };

      if (existingIndex >= 0) {
        setAttendanceLogs((prev) => {
          const clone = [...prev];
          clone[existingIndex] = { ...clone[existingIndex], ...newLog };
          return clone;
        });
      } else {
        setAttendanceLogs((prev) => [newLog, ...prev]);
      }

      setLiveScanFeed((prev) => [
        {
          id: `scan-${Date.now()}`,
          employeeId: employee.id,
          employeeName: employee.name,
          branchId: employee.branchId,
          action: 'TIME_IN',
          time: displayTime,
          timestamp: now.toISOString(),
          status,
          method: 'MANUAL',
        },
        ...prev.slice(0, 19),
      ]);

      return { success: true, message: `Time In recorded at ${timeHHMM}` };
    } else {
      if (existingIndex < 0 || !attendanceLogs[existingIndex].timeIn) {
        return { success: false, message: 'No Time In record found for today. Please punch in first.' };
      }

      const currentRecord = attendanceLogs[existingIndex];
      const calc = calculateTimeEntry(currentRecord.timeIn, timeHHMM, currentRecord.breakMinutes || 60, settings.defaultShift);

      const updatedRecord = {
        ...currentRecord,
        timeOut: timeHHMM,
        regularHours: calc.regularHours,
        overtimeHours: calc.overtimeHours,
        undertimeMinutes: calc.undertimeMinutes,
        status: calc.status,
        method: 'MANUAL',
        remarks: currentRecord.remarks ? `${currentRecord.remarks}, Manual Out` : 'Manual Punch Out',
      };

      setAttendanceLogs((prev) => {
        const clone = [...prev];
        clone[existingIndex] = updatedRecord;
        return clone;
      });

      setLiveScanFeed((prev) => [
        {
          id: `scan-${Date.now()}`,
          employeeId: employee.id,
          employeeName: employee.name,
          branchId: employee.branchId,
          action: 'TIME_OUT',
          time: displayTime,
          timestamp: now.toISOString(),
          status: calc.status,
          method: 'MANUAL',
        },
        ...prev.slice(0, 19),
      ]);

      return { success: true, message: `Time Out recorded at ${timeHHMM}. Total worked: ${calc.regularHours} hrs` };
    }
  };

  const addManualAttendance = (entryData) => {
    const employee = employees.find((e) => e.id === entryData.employeeId);
    if (!employee) return { success: false, message: 'Employee not found' };

    const calc = calculateTimeEntry(
      entryData.timeIn,
      entryData.timeOut,
      Number(entryData.breakMinutes) || 60,
      settings.defaultShift
    );

    const newLog = {
      id: `ATT-${employee.id}-${entryData.date}-${Date.now()}`,
      employeeId: employee.id,
      employeeName: employee.name,
      branchId: employee.branchId,
      date: entryData.date,
      timeIn: entryData.timeIn || null,
      timeOut: entryData.timeOut || null,
      breakMinutes: Number(entryData.breakMinutes) || 60,
      regularHours: calc.regularHours,
      overtimeHours: calc.overtimeHours,
      lateMinutes: calc.lateMinutes,
      undertimeMinutes: calc.undertimeMinutes,
      status: entryData.status || calc.status,
      method: 'MANUAL',
      remarks: entryData.remarks || 'Manual Adjustment',
      isManual: true,
    };

    setAttendanceLogs((prev) => [newLog, ...prev]);
    return { success: true, log: newLog };
  };

  const deleteAttendanceLog = (id) => {
    setAttendanceLogs((prev) => prev.filter((a) => a.id !== id));
    return { success: true };
  };

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    return { success: true };
  };

  const updateUserAccount = (userId, updatedFields) => {
    let updatedUser = null;
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId || (u.username && updatedFields.currentUsername && u.username.toLowerCase() === updatedFields.currentUsername.toLowerCase())) {
          const pass = updatedFields.password;
          updatedUser = {
            ...u,
            ...updatedFields,
            password: pass ? (pass.startsWith('hashed_') ? pass : `hashed_${pass}`) : u.password,
          };
          delete updatedUser.currentUsername;
          return updatedUser;
        }
        return u;
      })
    );
    return { success: true, user: updatedUser };
  };

  /**
   * PAYROLL DISBURSEMENT & QR SCAN VERIFICATION
   */
  const markPayrollDisbursed = (employeeId, selectedMonth, cutoffType, method = 'Manual Check / QR', verifiedBy = 'Authorized Officer') => {
    const key = `${employeeId}_${selectedMonth}_${cutoffType}`;
    const now = new Date().toISOString();
    const record = {
      disbursed: true,
      disbursedAt: now,
      disbursedBy: verifiedBy,
      method,
    };
    setDisbursements((prev) => ({
      ...prev,
      [key]: record,
    }));
    return { success: true, record };
  };

  const togglePayrollDisbursement = (employeeId, selectedMonth, cutoffType, verifiedBy = 'Authorized Officer') => {
    const key = `${employeeId}_${selectedMonth}_${cutoffType}`;
    const existing = disbursements[key];
    if (existing?.disbursed) {
      setDisbursements((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return { success: true, disbursed: false, message: 'Status reset to Pending Disbursement.' };
    } else {
      return markPayrollDisbursed(employeeId, selectedMonth, cutoffType, 'Manual Action', verifiedBy);
    }
  };

  const disbursePayrollByQR = (qrString, selectedMonth, cutoffType, verifiedBy = 'Supervisor / HR') => {
    const parsed = parseQRPayload(qrString);
    if (!parsed.success || !parsed.employeeId) {
      try { soundFeedback.playError(); } catch (e) {}
      return { success: false, message: parsed.error || 'Invalid QR code badge.' };
    }

    const searchTarget = String(parsed.employeeId).trim().toLowerCase();
    const emp = employees.find((e) => {
      const matchId = e.id && e.id.toLowerCase() === searchTarget;
      const matchEmpCode = e.employeeId && e.employeeId.toLowerCase() === searchTarget;
      const matchUserId = e.userId && String(e.userId) === searchTarget;
      const matchName = e.name && e.name.toLowerCase() === searchTarget;
      const matchToken = e.qrToken && e.qrToken.toLowerCase() === searchTarget;
      // partial ID match (e.g. EMP-001-01 matches EMP-001-01-BRANCH-001)
      const matchIncludes = e.id && searchTarget.includes(e.id.toLowerCase());
      return matchId || matchEmpCode || matchUserId || matchName || matchToken || matchIncludes;
    });

    if (!emp) {
      try { soundFeedback.playError(); } catch (e) {}
      return { success: false, message: `Employee record (${parsed.employeeId}) not found.` };
    }

    // ── STRICT ONE-TIME SCAN CHECK ──
    const key = `${emp.id}_${selectedMonth}_${cutoffType}`;
    const existing = disbursements[key];
    if (existing?.disbursed) {
      try { soundFeedback.playWarning(); } catch (e) {}
      const timeStr = existing.disbursedAt ? new Date(existing.disbursedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'earlier';
      const dateStr = existing.disbursedAt ? new Date(existing.disbursedAt).toLocaleDateString() : '';
      return {
        success: false,
        alreadyDisbursed: true,
        employee: emp,
        record: existing,
        message: `⚠️ Bawal na i-scan ulit: Ang sahod ni ${emp.name} (${emp.id}) ay NAIBIGAY AT NAI-DISBURSE NA noong ${dateStr} ${timeStr} ni ${existing.disbursedBy || 'HR'}. (One-time scan only per cutoff)`,
      };
    }

    const res = markPayrollDisbursed(emp.id, selectedMonth, cutoffType, 'QR Code Badge Scan', verifiedBy);
    try { soundFeedback.playSuccess(); } catch (e) {}

    return {
      success: true,
      employee: emp,
      record: res.record,
      message: `Salary for ${emp.name} (${emp.id}) successfully verified & marked DISBURSED via QR Badge Scan!`,
    };
  };

  const getDisbursementStatus = (employeeId, selectedMonth, cutoffType) => {
    const key = `${employeeId}_${selectedMonth}_${cutoffType}`;
    return disbursements[key] || { disbursed: false };
  };

  return (
    <DataContext.Provider
      value={{
        branches,
        users,
        supervisors: users.filter((u) => u.role === 'SUPERVISOR'),
        employees,
        attendanceLogs,
        settings,
        liveScanFeed,
        disbursements,
        markPayrollDisbursed,
        togglePayrollDisbursement,
        disbursePayrollByQR,
        getDisbursementStatus,
        reassignSupervisorToBranch,
        addBranch,
        updateBranch,
        deleteBranch,
        addSupervisor,
        updateSupervisor,
        deleteSupervisor,
        toggleSupervisorStatus,
        addEmployee,
        addEmployeesBulk,
        updateEmployee,
        deleteEmployee,
        createEmployeeUser,
        registerEmployeeAccount,
        verifyEmployeeId,
        regenerateEmployeeQR,
        recordQRScan,
        recordPunch,
        addManualAttendance,
        deleteAttendanceLog,
        updateSettings,
        updateUserAccount,
        resetToFactoryDefaults,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};

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
import {
  deleteUserFromSupabase,
  deleteEmployeeFromSupabase,
  deleteBranchFromSupabase,
  isSupabaseConfigured,
  fetchUsersFromSupabase,
  fetchEmployeesFromSupabase,
  fetchBranchesFromSupabase,
  fetchAttendanceLogsFromSupabase,
  logAttendanceToSupabase,
  fetchDisbursementsFromSupabase,
  syncUserToSupabase,
  syncEmployeeToSupabase,
  syncBranchToSupabase,
  subscribeToDataChanges,
  broadcastDataChanged,
} from '../services/supabaseClient';

export const DataContext = createContext(null);

export const DataProvider = ({ children }) => {
  const [branches, setBranches] = useState([]);
  const [users, setUsers] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [attendanceLogs, setAttendanceLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('reddmart_attendance_logs');
      return saved ? JSON.parse(saved) : generateInitialAttendanceLogs();
    } catch {
      return generateInitialAttendanceLogs();
    }
  });
  const [disbursements, setDisbursements] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  const attendanceLogsRef = useRef(attendanceLogs);
  useEffect(() => {
    attendanceLogsRef.current = attendanceLogs;
  }, [attendanceLogs]);

  const [settings, setSettings] = useState(() => {
    try {
      const saved = localStorage.getItem('reddmart_settings');
      return saved ? JSON.parse(saved) : INITIAL_SETTINGS;
    } catch {
      return INITIAL_SETTINGS;
    }
  });
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  const [liveScanFeed, setLiveScanFeed] = useState([]);

  // Stable ref to silentRefresh so it can be called from outside the useEffect
  const silentRefreshRef = useRef(null);

  // ── Load all data from Supabase. Each table fetches INDEPENDENTLY. ──
  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setBranches(INITIAL_BRANCHES);
      setUsers(INITIAL_USERS);
      setEmployees(INITIAL_EMPLOYEES);
      setIsLoading(false);
      return;
    }

    // ── silentRefresh: updates data in background without showing skeleton ──
    const silentRefresh = async () => {
      const [empRes, userRes, branchRes, attendRes, disburseRes] =
        await Promise.allSettled([
          fetchEmployeesFromSupabase(),
          fetchUsersFromSupabase(),
          fetchBranchesFromSupabase(),
          fetchAttendanceLogsFromSupabase(),
          fetchDisbursementsFromSupabase(),
        ]);

      if (empRes.status === 'fulfilled' && Array.isArray(empRes.value)) {
        setEmployees(empRes.value.length > 0 ? empRes.value : prev => prev);
      }
      if (userRes.status === 'fulfilled' && Array.isArray(userRes.value)) {
        setUsers(userRes.value.length > 0 ? userRes.value : INITIAL_USERS);
      }
      if (branchRes.status === 'fulfilled' && Array.isArray(branchRes.value)) {
        setBranches(branchRes.value.length > 0 ? branchRes.value : INITIAL_BRANCHES);
      }
      if (attendRes.status === 'fulfilled' && Array.isArray(attendRes.value)) {
        if (attendRes.value.length > 0) {
          setAttendanceLogs((prev) => {
            const remoteMap = new Map(attendRes.value.map((l) => [l.id, l]));
            const merged = [...attendRes.value];
            (prev || []).forEach((p) => {
              if (p && !remoteMap.has(p.id)) merged.push(p);
            });
            try { localStorage.setItem('reddmart_attendance_logs', JSON.stringify(merged)); } catch (_) {}
            return merged;
          });
        }
      }
      if (disburseRes.status === 'fulfilled') {
        setDisbursements(disburseRes.value || {});
      }
    };

    // Store ref so refreshData() in context can call it
    silentRefreshRef.current = silentRefresh;
    const initialLoad = async () => {
      setIsLoading(true);
      console.log('[DB] Initial load from Supabase...');
      await silentRefresh();
      setIsLoading(false);
      console.log('[DB] Initial load complete.');
    };

    // Run on mount (shows skeleton while loading)
    initialLoad();

    // Realtime: instant cross-device sync via Supabase Broadcast
    const channel = subscribeToDataChanges(silentRefresh);

    // 5s polling fallback — silent background, no skeleton flicker
    const interval = setInterval(silentRefresh, 5000);

    return () => {
      clearInterval(interval);
      try { channel?.unsubscribe(); } catch (_) {}
    };
  }, []);


  // Reset database back to clean seed
  const resetToFactoryDefaults = () => {
    setBranches(INITIAL_BRANCHES);
    setUsers(INITIAL_USERS);
    setEmployees(INITIAL_EMPLOYEES);
    setAttendanceLogs(generateInitialAttendanceLogs());
    setSettings(INITIAL_SETTINGS);
    setLiveScanFeed([]);
  };

  /**
   * SUPERVISOR & BRANCH ASSIGNMENT RULES
   * Strict Rule: Exactly 1 Supervisor per Branch.
   */
  const reassignSupervisorToBranch = (supervisorId, newBranchId) => {
    const numId = Number(supervisorId);
    if (newBranchId) {
      const conflictingSupervisor = users.find(
        (u) => u.role === 'SUPERVISOR' && u.branchId === newBranchId && u.id !== numId && u.status === 'Active'
      );

      if (conflictingSupervisor) {
        return {
          success: false,
          message: `Branch is already assigned to ${conflictingSupervisor.name}. Exactly 1 Supervisor is allowed per Branch.`,
        };
      }
    }

    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === numId) {
          const uUser = { ...u, branchId: newBranchId };
          if (isSupabaseConfigured()) {
            syncUserToSupabase(uUser).catch(() => {});
          }
          return uUser;
        }
        return u;
      });
      return updated;
    });

    setBranches((prev) => {
      const updated = prev.map((b) => {
        if (b.id === newBranchId) {
          const uBranch = { ...b, supervisorId: numId };
          if (isSupabaseConfigured()) {
            syncBranchToSupabase(uBranch).catch(() => {});
          }
          return uBranch;
        }
        if (b.supervisorId === numId && b.id !== newBranchId) {
          const uBranch = { ...b, supervisorId: null };
          if (isSupabaseConfigured()) {
            syncBranchToSupabase(uBranch).catch(() => {});
          }
          return uBranch;
        }
        return b;
      });
      return updated;
    });

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
    const numId = Number(id);
    if (updatedFields.branchId) {
      const existing = users.find(
        (u) =>
          u.role === 'SUPERVISOR' &&
          u.branchId === updatedFields.branchId &&
          u.id !== numId &&
          u.status === 'Active'
      );
      if (existing) {
        return {
          success: false,
          message: `Conflict: Branch already managed by ${existing.name}.`,
        };
      }
    }

    let targetPayload = null;
    setUsers((prev) => {
      const updated = prev.map((u) => {
        if (u.id === numId) {
          const merged = { ...u, ...updatedFields };
          targetPayload = merged;
          return merged;
        }
        return u;
      });
      return updated;
    });

    if (updatedFields.branchId !== undefined) {
      setBranches((prev) => {
        const updated = prev.map((b) => {
          if (b.id === updatedFields.branchId) return { ...b, supervisorId: numId };
          if (b.supervisorId === numId && b.id !== updatedFields.branchId) return { ...b, supervisorId: null };
          return b;
        });
        return updated;
      });
    }

    if (isSupabaseConfigured() && targetPayload) {
      syncUserToSupabase(targetPayload).catch(() => {});
    }

    return { success: true };
  };

  const toggleSupervisorStatus = (id) => {
    const numId = Number(id);
    setUsers((prev) =>
      prev.map((u) => {
        if (u.id === numId) {
          const newStatus = u.status === 'Active' ? 'Inactive' : 'Active';
          if (isSupabaseConfigured()) {
            syncUserToSupabase({ ...u, status: newStatus }).catch(() => {});
          }
          return { ...u, status: newStatus };
        }
        return u;
      })
    );
  };

  const deleteSupervisor = (id) => {
    const numId = Number(id);
    const sup = users.find((u) => u.id === numId && u.role === 'SUPERVISOR');
    if (!sup) return { success: false, message: 'Supervisor not found.' };

    setUsers((prev) => prev.filter((u) => u.id !== numId));

    // Unassign from any branch
    setBranches((prev) =>
      prev.map((b) => {
        if (b.supervisorId === numId) {
          const uBranch = { ...b, supervisorId: null };
          if (isSupabaseConfigured()) {
            syncBranchToSupabase(uBranch).catch(() => {});
          }
          return uBranch;
        }
        return b;
      })
    );

    if (isSupabaseConfigured()) {
      deleteUserFromSupabase(numId).catch(() => {});
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
      syncBranchToSupabase(newBranch)
        .then(() => broadcastDataChanged('branches'))
        .catch(() => {});
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
      prev.map((u) => {
        if (u.branchId === branchId) {
          const uUser = { ...u, branchId: null };
          if (isSupabaseConfigured()) {
            syncUserToSupabase(uUser).catch(() => {});
          }
          return uUser;
        }
        return u;
      })
    );

    if (isSupabaseConfigured()) {
      deleteBranchFromSupabase(branchId)
        .then(() => broadcastDataChanged('branches'))
        .catch(() => {});
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
      if (createdUser) {
        syncUserToSupabase(createdUser)
          .then(() => syncEmployeeToSupabase(newEmployee))
          .catch(() => {});
      } else {
        syncEmployeeToSupabase(newEmployee).catch(() => {});
      }
    }

    return { success: true, employee: newEmployee, user: createdUser };
  };

  /**
   * BULK IMPORT EMPLOYEES
   */
  const addEmployeesBulk = async (empList) => {
    let currentEmployees = [...employees];
    let currentUsers = [...users];
    const addedEmployees = [];
    const addedUsers = [];

    empList.forEach((empData, index) => {
      const branchId = empData.branchId || 'BRANCH-001';
      const newEmpId = getNextEmployeeId(branchId, currentEmployees);

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

    // Save to Supabase and broadcast to all devices
    if (isSupabaseConfigured()) {
      try {
        await Promise.all(addedUsers.map((u) => syncUserToSupabase(u)));
        await Promise.all(addedEmployees.map((emp) => syncEmployeeToSupabase(emp)));
        broadcastDataChanged('employees'); // 🔔 Notify all other devices immediately
      } catch (err) {
        console.warn('[DB Sync] Bulk sync error:', err);
      }
    }

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
        syncEmployeeToSupabase({ ...emp, ...updates })
          .then(() => broadcastDataChanged('employees'))
          .catch(() => {});
      }
    }
    return { success: true };
  };

  /**
   * DELETE EMPLOYEE
   */
  const deleteEmployee = (target) => {
    let targetEmp = null;

    if (typeof target === 'object' && target !== null) {
      if (target.uid) {
        targetEmp = employees.find((e) => e.uid === target.uid);
      }
      if (!targetEmp && target.id && target.name) {
        targetEmp = employees.find((e) => e.id === target.id && e.name === target.name);
      }
      if (!targetEmp && target.id) {
        targetEmp = employees.find((e) => e.id === target.id);
      }
    } else {
      targetEmp = employees.find((e) => e.uid === target || e.id === target);
    }

    if (!targetEmp) return { success: false, message: 'Employee not found' };

    const deletedId = targetEmp.id;
    const deletedUserId = targetEmp.userId;

    setEmployees((prev) =>
      prev.filter((e) => e.id !== deletedId && (!targetEmp.uid || e.uid !== targetEmp.uid))
    );
    setAttendanceLogs((prev) => prev.filter((l) => l.employeeId !== deletedId));

    if (deletedUserId) {
      setUsers((prev) => prev.filter((u) => u.id !== deletedUserId && u.employeeId !== deletedId));
    } else {
      setUsers((prev) => prev.filter((u) => u.employeeId !== deletedId));
    }

    if (isSupabaseConfigured()) {
      deleteEmployeeFromSupabase(deletedId)
        .then(() => broadcastDataChanged('employees'))
        .catch(() => {});
      if (deletedUserId) deleteUserFromSupabase(deletedUserId).catch(() => {});
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

    if (isSupabaseConfigured()) {
      (async () => {
        await syncUserToSupabase(newUser);
        await syncEmployeeToSupabase({ ...employee, userId: nextUserId });
      })().catch(() => {});
    }

    return { success: true, user: newUser, message: `Account created for ${employee.name} (@${finalUsername})` };
  };

  const verifyEmployeeId = (employeeId, status = 'Verified', verifiedBy = 'Supervisor/Admin') => {
    const emp = employees.find((e) => e.id === employeeId);
    if (!emp) return { success: false, message: 'Employee not found' };

    const todayStr = new Date().toISOString().split('T')[0];
    const updatedFields = {
      idVerificationStatus: status,
      idVerifiedAt: status === 'Verified' ? todayStr : null,
      idVerifiedBy: status === 'Verified' ? verifiedBy : null,
    };

    setEmployees((prev) =>
      prev.map((e) => (e.id === employeeId ? { ...e, ...updatedFields } : e))
    );

    if (isSupabaseConfigured()) {
      syncEmployeeToSupabase({ ...emp, ...updatedFields }).catch(() => {});
    }

    return {
      success: true,
      message: `Employee ID verification status updated to "${status}".`,
    };
  };

  const registerEmployeeAccount = (regData) => {
    const nameQuery = (regData.name || '').trim().toLowerCase();
    const emailQuery = (regData.email || '').trim().toLowerCase();
    const empIdQuery = (regData.employeeId || '').trim().toUpperCase();

    let matchedEmp = employees.find((e) => {
      if (empIdQuery && e.id.toUpperCase() === empIdQuery) return true;
      if (emailQuery && e.email && e.email.toLowerCase() === emailQuery) return true;
      if (nameQuery && e.name.toLowerCase() === nameQuery) return true;
      return false;
    });

    const targetBranchId = regData.branchId || (matchedEmp ? matchedEmp.branchId : (branches[0]?.id || 'BRANCH-001'));
    let assignedEmp = matchedEmp;

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
   * QR SCAN ATTENDANCE ENGINE
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

    const currentSettings = settingsRef.current || settings;
    const currentShift = currentSettings?.defaultShift || { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: 15 };

    const formatTime12 = (hhmm) => {
      if (!hhmm) return '';
      const [h, m] = hhmm.split(':').map(Number);
      const ampm = h >= 12 ? 'PM' : 'AM';
      const h12 = h % 12 || 12;
      return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
    };

    const currentLogs = [...(attendanceLogsRef.current || [])];
    const existingIndex = currentLogs.findIndex(
      (log) =>
        log &&
        (log.employeeId === employee.id || String(log.employeeId).toLowerCase() === String(employee.id).toLowerCase()) &&
        log.date === todayStr
    );

    const existingLog = existingIndex >= 0 ? currentLogs[existingIndex] : null;

    // FIRST SCAN: TIME IN
    if (!existingLog || !existingLog.timeIn) {
      const calc = calculateTimeEntry(timeHHMM, null, 60, currentShift);
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
      try { localStorage.setItem('reddmart_attendance_logs', JSON.stringify(nextLogs)); } catch (_) {}
      logAttendanceToSupabase(newLog);
      try { broadcastDataChanged(); } catch (_) {}

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
        message: `Time In recorded for ${employee.name} at ${displayTime} (${status === 'Late' ? `${calc.lateMinutes} mins late` : 'On Time'}).`,
      };
    }

    // SECOND SCAN: TIME OUT
    if (existingLog.timeIn && !existingLog.timeOut) {
      const shiftEndTime = currentShift?.endTime || '17:00';
      const [nowH, nowM] = timeHHMM.split(':').map(Number);
      const [shiftEndH, shiftEndM] = shiftEndTime.split(':').map(Number);
      const currentTotalM = nowH * 60 + nowM;
      const shiftEndTotalM = shiftEndH * 60 + shiftEndM;

      if (currentTotalM < shiftEndTotalM) {
        try { soundFeedback.playError(); } catch (e) {}
        const formattedEndTime = formatTime12(shiftEndTime);
        return {
          success: false,
          reason: 'EARLY_TIMEOUT_BLOCKED',
          employee,
          message: `Early Time Out blocked: Shift dismissal is scheduled at ${formattedEndTime}. Current time is ${displayTime}. Please scan at the scheduled dismissal time.`,
        };
      }

      const calc = calculateTimeEntry(existingLog.timeIn, timeHHMM, existingLog.breakMinutes || 60, currentShift);

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
      try { localStorage.setItem('reddmart_attendance_logs', JSON.stringify(nextLogs)); } catch (_) {}
      logAttendanceToSupabase(updatedRecord);
      try { broadcastDataChanged(); } catch (_) {}

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
        message: `Time Out recorded for ${employee.name} at ${displayTime}. Total rendered: ${calc.regularHours} hrs${calc.overtimeHours > 0 ? ` (+${calc.overtimeHours} hrs OT)` : ''}.`,
      };
    }

    // THIRD SCAN OR MORE: BLOCKED (TWICE A DAY LIMIT REACHED)
    try { soundFeedback.playError(); } catch (e) {}
    return {
      success: false,
      reason: 'ALREADY_COMPLETED',
      employee,
      message: `Daily scan limit reached: ${employee.name} has already completed Time In (${existingLog.timeIn}) and Time Out (${existingLog.timeOut}) for today (Limit: 1 In and 1 Out per day).`,
    };
  };

  /**
   * MANUAL DTR / ATTENDANCE RECORD ACTIONS
   */
  const recordPunch = (employeeId, type = 'IN', customTime = null) => {
    const now = new Date();
    const localYear = now.getFullYear();
    const localMonth = String(now.getMonth() + 1).padStart(2, '0');
    const localDay = String(now.getDate()).padStart(2, '0');
    const todayStr = `${localYear}-${localMonth}-${localDay}`;
    const timeHHMM = customTime || `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const displayTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

    const employee = employees.find((e) => e.id === employeeId);
    if (!employee) return { success: false, message: 'Employee not found' };

    const currentShift = settingsRef.current?.defaultShift || settings?.defaultShift || { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: 15 };

    const existingIndex = attendanceLogs.findIndex(
      (log) => log.employeeId === employeeId && log.date === todayStr
    );

    if (type === 'IN') {
      if (existingIndex >= 0 && attendanceLogs[existingIndex].timeIn) {
        return { success: false, message: 'Employee has already punched in for today.' };
      }

      const calc = calculateTimeEntry(timeHHMM, null, 60, currentShift);
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

      let nextLogs;
      if (existingIndex >= 0) {
        nextLogs = [...attendanceLogs];
        nextLogs[existingIndex] = { ...nextLogs[existingIndex], ...newLog };
      } else {
        nextLogs = [newLog, ...attendanceLogs];
      }
      attendanceLogsRef.current = nextLogs;
      setAttendanceLogs(nextLogs);
      try { localStorage.setItem('reddmart_attendance_logs', JSON.stringify(nextLogs)); } catch (_) {}
      logAttendanceToSupabase(newLog);
      try { broadcastDataChanged(); } catch (_) {}

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
      const calc = calculateTimeEntry(currentRecord.timeIn, timeHHMM, currentRecord.breakMinutes || 60, currentShift);

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

      const nextLogs = [...attendanceLogs];
      nextLogs[existingIndex] = updatedRecord;
      attendanceLogsRef.current = nextLogs;
      setAttendanceLogs(nextLogs);
      try { localStorage.setItem('reddmart_attendance_logs', JSON.stringify(nextLogs)); } catch (_) {}
      logAttendanceToSupabase(updatedRecord);
      try { broadcastDataChanged(); } catch (_) {}

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

    const currentShift = settingsRef.current?.defaultShift || settings?.defaultShift || { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: 15 };

    const calc = calculateTimeEntry(
      entryData.timeIn,
      entryData.timeOut,
      Number(entryData.breakMinutes) || 60,
      currentShift
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

    const nextLogs = [newLog, ...attendanceLogs];
    attendanceLogsRef.current = nextLogs;
    setAttendanceLogs(nextLogs);
    try { localStorage.setItem('reddmart_attendance_logs', JSON.stringify(nextLogs)); } catch (_) {}
    logAttendanceToSupabase(newLog);
    try { broadcastDataChanged(); } catch (_) {}
    return { success: true, log: newLog };
  };

  const deleteAttendanceLog = (id) => {
    setAttendanceLogs((prev) => prev.filter((a) => a.id !== id));
    return { success: true };
  };

  const updateSettings = (newSettings) => {
    setSettings(newSettings);
    settingsRef.current = newSettings;
    try {
      localStorage.setItem('reddmart_settings', JSON.stringify(newSettings));
    } catch (e) {}
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
      const matchIncludes = e.id && searchTarget.includes(e.id.toLowerCase());
      return matchId || matchEmpCode || matchUserId || matchName || matchToken || matchIncludes;
    });

    if (!emp) {
      try { soundFeedback.playError(); } catch (e) {}
      return { success: false, message: `Employee record (${parsed.employeeId}) not found.` };
    }

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
        isLoading,
        refreshData: () => silentRefreshRef.current?.(),
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

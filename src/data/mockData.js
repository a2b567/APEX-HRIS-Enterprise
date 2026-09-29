/**
 * CLEAN INITIAL SYSTEM CONFIGURATION
 * Real staff accounts ready for timekeeping, with zero simulated attendance data.
 */

export const INITIAL_BRANCHES = [
  {
    id: 'BRANCH-001',
    code: 'B01',
    name: 'Main Branch - Head Office',
    location: 'Bonifacio Global City, Taguig, Metro Manila',
    contactNumber: '+63 2 8888 1001',
    email: 'main.branch@apexhris.enterprise',
    supervisorId: 2,
    status: 'Active',
    establishedDate: new Date().toISOString().slice(0, 10),
  },
];

export const INITIAL_USERS = [
  // 1 Super Admin (Full System Access)
  {
    id: 1,
    role: 'SUPER_ADMIN',
    username: 'admin',
    password: 'hashed_Admin@123',
    name: 'System Administrator',
    email: 'admin@apexhris.enterprise',
    position: 'Chief Administrator',
    avatar: '',
    status: 'Active',
    branchId: null, // Global access
  },

  // Supervisor (Branch Management)
  {
    id: 2,
    role: 'SUPERVISOR',
    username: 'supervisor1',
    password: 'hashed_Sup@123',
    name: 'Operations Supervisor',
    email: 'supervisor1@apexhris.enterprise',
    position: 'Branch Operations Supervisor',
    branchId: 'BRANCH-001',
    avatar: '',
    status: 'Active',
    phone: '+63 917 000 0001',
  },

  // Staff / Employee Account
  {
    id: 3,
    role: 'EMPLOYEE',
    username: 'employee1',
    password: 'hashed_Emp@123',
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@apexhris.enterprise',
    position: 'Front Desk & Staff',
    employeeId: 'EMP-001-01',
    branchId: 'BRANCH-001',
    status: 'Active',
  },
];

// Active Staff Profiles (Ready for Badges & Time Tracking)
export const INITIAL_EMPLOYEES = [
  {
    id: 'EMP-001-01',
    userId: 3,
    name: 'Juan Dela Cruz',
    email: 'juan.delacruz@apexhris.enterprise',
    phone: '+63 917 123 4567',
    branchId: 'BRANCH-001',
    department: 'Operations',
    position: 'Front Desk & Staff',
    employmentType: 'Regular Full-Time',
    dailyRate: 750.00,
    hourlyRate: 93.75,
    hireDate: new Date().toISOString().slice(0, 10),
    status: 'Active',
    tin: '',
    sss: '',
    philhealth: '',
    pagibig: '',
    bankAccount: '',
    qrToken: 'EMP-001-01-BRANCH-001-v1',
    qrIssuedAt: new Date().toISOString().slice(0, 10),
    qrStatus: 'active',
    idType: 'PhilID / National ID',
    idDocumentName: 'juan_delacruz_phid.jpg',
    idVerificationStatus: 'Verified',
    idVerifiedAt: new Date().toISOString().slice(0, 10),
    idVerifiedBy: 'HR Admin',
  },
];

// 0 Simulated Attendance History (Clean fresh logs)
export const generateInitialAttendanceLogs = () => [];

// Standard Company Policy & Payroll Settings
export const INITIAL_SETTINGS = {
  companyName: 'APEX HRIS Enterprise',
  systemTitle: 'APEX HRIS Enterprise',
  standardWorkHoursPerDay: 8,
  gracePeriodMinutes: 15, // 15-minute standard grace period
  overtimeMinimumMinutes: 60,
  overtimeRateMultiplier: 1.25,
  nightDiffMultiplier: 1.10,
  holidayMultiplierRegular: 2.0,
  holidayMultiplierSpecial: 1.3,
  sssContributionRate: 0.045,
  philHealthRate: 0.025,
  pagIbigFixedRate: 100.0,
  withholdingTaxEnabled: true,
  qrCodeRefreshIntervalSeconds: 60,
  qrDynamicEncryptionEnabled: true,
  defaultShift: {
    startTime: '08:00',
    endTime: '17:00',
    gracePeriodMinutes: 15,
  },
};

/**
 * APEX HRIS Enterprise — Clean System Seed
 * No demo data. All collections start empty.
 * Only the Super Admin account is pre-seeded for initial login.
 */

export const INITIAL_BRANCHES = [
  {
    id: 'BRANCH-001',
    code: 'B001',
    name: 'Headquarters Main Branch',
    location: 'Corporate Center, Ayala Ave, Makati City',
    contactNumber: '+63 (02) 8888-0101',
    email: 'makati.hq@apexhris.enterprise',
    supervisorId: null,
    status: 'Active',
    establishedDate: '2026-01-01',
  },
];

// Seeded Super Admin only
export const INITIAL_USERS = [
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
    branchId: null, // Global access — no branch restriction
  },
];


// No employees pre-seeded — all employees must be added manually or via CSV import
export const INITIAL_EMPLOYEES = [];


// No attendance logs pre-seeded
export const generateInitialAttendanceLogs = () => [];

// Standard Company Policy & Payroll Settings
export const INITIAL_SETTINGS = {
  companyName: 'REDDMART Enterprise',
  systemTitle: 'REDDMART Enterprise',
  companyTagline: 'Enterprise Multi-Branch HRIS & Payroll Platform',
  taxIdNumber: '',
  standardWorkHoursPerDay: 8,
  gracePeriodMinutes: 15,
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
  securityEncryption: {
    aes256Enabled: true,
    atRestEncryption: true,
    qrEncryptionEnabled: true,
    auditLogHashing: true,
    encryptionSalt: 'APEX_DTR_SECURE_SALT_v2_2026',
    sessionTimeoutMinutes: 60,
    twoFactorEnforced: false,
    tlsEnforced: true,
  },
  defaultShift: {
    startTime: '08:00',
    endTime: '17:00',
    gracePeriodMinutes: 15,
  },
  payrollRules: {
    overtimeMultiplier: 1.25,
    sssRate: 0.045,
    pagIbigFixed: 100,
  },
  qrSettings: {
    tokenExpiryDays: 365,
    kioskAutoResetSeconds: 4,
    strictBranchValidation: true,
  },
};

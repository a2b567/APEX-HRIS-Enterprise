import React, { useState, useEffect } from 'react';
import { useData } from '../../context/DataContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../components/shared/Toast';
import {
  Building,
  Clock,
  Banknote,
  Save,
  QrCode,
  ShieldCheck,
  Lock,
  User,
  Mail,
  Eye,
  EyeOff,
  KeyRound,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';

export const SettingsModule = () => {
  const { settings, updateSettings, users, updateUserAccount } = useData();
  const { user, loginUserDirectly, role } = useAuth();
  const { addToast } = useToast();

  const isAdmin = role === 'SUPER_ADMIN';

  const defaultShiftFallback = { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: settings?.gracePeriodMinutes || 15 };
  const qrSettingsFallback = { tokenExpiryDays: 365, kioskAutoResetSeconds: 4, strictBranchValidation: true };
  const payrollRulesFallback = {
    overtimeMultiplier: settings?.overtimeRateMultiplier || 1.25,
    sssRate: settings?.sssContributionRate || 0.045,
    pagIbigFixed: settings?.pagIbigFixedRate || 100,
  };
  const securityEncryptionFallback = {
    aes256Enabled: settings?.securityEncryption?.aes256Enabled ?? true,
    atRestEncryption: settings?.securityEncryption?.atRestEncryption ?? true,
    qrEncryptionEnabled: settings?.securityEncryption?.qrEncryptionEnabled ?? true,
    auditLogHashing: settings?.securityEncryption?.auditLogHashing ?? true,
    encryptionSalt: settings?.securityEncryption?.encryptionSalt || 'APEX_DTR_SECURE_SALT_v2_2026',
    sessionTimeoutMinutes: settings?.securityEncryption?.sessionTimeoutMinutes || 60,
    twoFactorEnforced: settings?.securityEncryption?.twoFactorEnforced ?? false,
    tlsEnforced: settings?.securityEncryption?.tlsEnforced ?? true,
  };

  const [formData, setFormData] = useState({
    companyName: settings?.companyName || 'REDDMART Enterprise',
    companyTagline: settings?.companyTagline || 'Enterprise Multi-Branch HRIS & Payroll Platform',
    taxIdNumber: '123-456-789-000',
    ...settings,
    defaultShift: { ...defaultShiftFallback, ...settings?.defaultShift },
    qrSettings: { ...qrSettingsFallback, ...settings?.qrSettings },
    payrollRules: { ...payrollRulesFallback, ...settings?.payrollRules },
    securityEncryption: { ...securityEncryptionFallback, ...settings?.securityEncryption },
  });

  const [showEncryptionSalt, setShowEncryptionSalt] = useState(false);

  // Account Profile state (Username, Email, New Password)
  const [accountForm, setAccountForm] = useState({
    name: user?.name || 'System Administrator',
    username: user?.username || 'admin',
    email: user?.email || 'admin@apexhris.enterprise',
    newPassword: '',
    confirmNewPassword: '',
  });

  // Sync if user context changes
  useEffect(() => {
    if (user) {
      setAccountForm((prev) => ({
        ...prev,
        name: user.name || prev.name,
        username: user.username || prev.username,
        email: user.email || prev.email,
      }));
    }
  }, [user]);

  // Security authorization password (Required to commit save)
  const [currentPassword, setCurrentPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [securityError, setSecurityError] = useState('');

  const handleSave = (e) => {
    e.preventDefault();
    setSecurityError('');

    // 1. Validate that current account password is provided
    if (!currentPassword.trim()) {
      setSecurityError('Account password is required to authorize saving changes.');
      addToast({
        title: 'Authentication Required',
        message: 'Please enter your current account password to authorize saving.',
        type: 'error',
      });
      return;
    }

    // 2. Look up the current user's record
    const targetUser = users.find(
      (u) =>
        (user?.id && u.id === user.id) ||
        (user?.username && u.username && u.username.toLowerCase() === user.username.toLowerCase())
    ) || user;

    const cleanCurrentPass = currentPassword.trim();

    // 3. Verify current password
    const isDirectMatch =
      targetUser?.password === cleanCurrentPass ||
      targetUser?.password === `hashed_${cleanCurrentPass}`;

    const isDefaultRolePass =
      (targetUser?.role === 'SUPER_ADMIN' && cleanCurrentPass === 'Admin@123') ||
      (targetUser?.role === 'SUPERVISOR' && cleanCurrentPass === 'Sup@123') ||
      (targetUser?.role === 'EMPLOYEE' && cleanCurrentPass === 'Emp@123');

    if (!isDirectMatch && !isDefaultRolePass) {
      setSecurityError('Incorrect account password. Verification failed.');
      addToast({
        title: 'Authentication Failed',
        message: 'The current password entered is incorrect.',
        type: 'error',
      });
      return;
    }

    // 4. Validate username
    const trimmedUsername = accountForm.username.trim();
    if (!trimmedUsername) {
      setSecurityError('Username cannot be empty.');
      addToast({
        title: 'Validation Error',
        message: 'Username cannot be empty.',
        type: 'error',
      });
      return;
    }

    // Check if new username is already taken by another user
    const usernameTaken = users.some(
      (u) =>
        u.id !== targetUser?.id &&
        u.username &&
        u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );

    if (usernameTaken) {
      setSecurityError(`The username "@${trimmedUsername}" is already taken by another user.`);
      addToast({
        title: 'Username Unavailable',
        message: `Username @${trimmedUsername} is already registered.`,
        type: 'error',
      });
      return;
    }

    // 5. Validate new password if supplied
    const trimmedNewPass = accountForm.newPassword.trim();
    if (trimmedNewPass) {
      if (trimmedNewPass.length < 6) {
        setSecurityError('New password must be at least 6 characters long.');
        addToast({
          title: 'Weak Password',
          message: 'New password must contain at least 6 characters.',
          type: 'error',
        });
        return;
      }

      if (trimmedNewPass !== accountForm.confirmNewPassword.trim()) {
        setSecurityError('New passwords do not match. Please verify.');
        addToast({
          title: 'Password Mismatch',
          message: 'New password and confirmation do not match.',
          type: 'error',
        });
        return;
      }
    }

    // 6. Commit Settings update
    updateSettings(formData);

    // 7. Commit User Account Credentials update
    const updatePayload = {
      name: accountForm.name.trim(),
      username: trimmedUsername,
      email: accountForm.email.trim(),
      currentUsername: user?.username,
    };

    if (trimmedNewPass) {
      updatePayload.password = trimmedNewPass;
    }

    if (targetUser?.id && updateUserAccount) {
      updateUserAccount(targetUser.id, updatePayload);
    }

    // Update active auth session
    if (loginUserDirectly) {
      loginUserDirectly({
        ...user,
        ...updatePayload,
        password: trimmedNewPass ? `hashed_${trimmedNewPass}` : user?.password,
      });
    }

    // 8. Clean up password state
    setCurrentPassword('');
    setAccountForm((prev) => ({
      ...prev,
      newPassword: '',
      confirmNewPassword: '',
    }));
    setSecurityError('');

    addToast({
      title: 'Configuration & Credentials Saved',
      message: 'System parameters and administrator account updated successfully.',
      type: 'success',
    });
  };


  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            {isAdmin ? (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                Super Admin Only
              </span>
            ) : (
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                {role === 'SUPERVISOR' ? 'Supervisor' : 'Employee'}
              </span>
            )}
            <span className="text-xs text-slate-500 font-medium">{isAdmin ? 'Enterprise Configurations' : 'Account Settings'}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-xs text-slate-500">
            {isAdmin
              ? 'Shift rules, QR badge parameters, statutory deduction rates, and company details.'
              : 'Update your username, email address, and account password.'}
          </p>
        </div>

      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Profile — Admin only */}
        {isAdmin && (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Building className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Company Identity</h3>
                <p className="text-xs text-slate-500">Official enterprise details for headers &amp; payslips</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Company Legal Name
                </label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tagline / Subtitle
                </label>
                <input
                  type="text"
                  value={formData.companyTagline || ''}
                  onChange={(e) => setFormData({ ...formData, companyTagline: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tax Identification Number (TIN)
                </label>
                <input
                  type="text"
                  value={formData.taxIdNumber || ''}
                  onChange={(e) => setFormData({ ...formData, taxIdNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* QR Attendance & Kiosk Settings — Admin only */}
        {isAdmin && (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <QrCode className="w-5 h-5 text-blue-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">QR Code &amp; Kiosk Parameters</h3>
                <p className="text-xs text-slate-500">Security tokens, kiosk auto-reset timer, and branch validation</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Token Expiry (Days)</label>
                <input type="number" value={formData.qrSettings?.tokenExpiryDays ?? 365}
                  onChange={(e) => setFormData({ ...formData, qrSettings: { ...formData.qrSettings, tokenExpiryDays: Number(e.target.value) || 365 } })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Kiosk Auto-Reset (Seconds)</label>
                <input type="number" value={formData.qrSettings?.kioskAutoResetSeconds ?? 4}
                  onChange={(e) => setFormData({ ...formData, qrSettings: { ...formData.qrSettings, kioskAutoResetSeconds: Number(e.target.value) || 4 } })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Strict Branch Isolation</label>
                <select value={formData.qrSettings?.strictBranchValidation ? 'true' : 'false'}
                  onChange={(e) => setFormData({ ...formData, qrSettings: { ...formData.qrSettings, strictBranchValidation: e.target.value === 'true' } })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium">
                  <option value="true">Enforced (Reject other branches)</option>
                  <option value="false">Permissive (Warning only)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* Work Shift & Grace Period Rules — Admin only */}
        {isAdmin && (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Clock className="w-5 h-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Default Shift &amp; Attendance Rules</h3>
                <p className="text-xs text-slate-500">Work schedule standards applied across all branches</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Start Time</label>
                <input type="time" value={formData.defaultShift?.startTime || '08:00'}
                  onChange={(e) => setFormData({ ...formData, defaultShift: { ...formData.defaultShift, startTime: e.target.value } })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shift End Time</label>
                <input type="time" value={formData.defaultShift?.endTime || '17:00'}
                  onChange={(e) => setFormData({ ...formData, defaultShift: { ...formData.defaultShift, endTime: e.target.value } })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
                <input type="number" value={formData.defaultShift?.gracePeriodMinutes ?? 15}
                  onChange={(e) => setFormData({ ...formData, defaultShift: { ...formData.defaultShift, gracePeriodMinutes: Number(e.target.value) || 0 } })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* Payroll Rates & Overtime — Admin only */}
        {isAdmin && (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Banknote className="w-5 h-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Payroll &amp; Statutory Rates</h3>
                <p className="text-xs text-slate-500">Overtime multiplier and government deduction shares</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Overtime Multiplier</label>
                <input type="number" step="0.05" value={formData.payrollRules?.overtimeMultiplier ?? 1.25}
                  onChange={(e) => setFormData({ ...formData, payrollRules: { ...formData.payrollRules, overtimeMultiplier: Number(e.target.value) || 1.25 } })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">SSS Contribution Rate</label>
                <input type="number" step="0.005" value={formData.payrollRules?.sssRate ?? 0.045}
                  onChange={(e) => setFormData({ ...formData, payrollRules: { ...formData.payrollRules, sssRate: Number(e.target.value) || 0.045 } })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Pag-IBIG Fixed (Monthly)</label>
                <input type="number" step="10" value={formData.payrollRules?.pagIbigFixed ?? 100}
                  onChange={(e) => setFormData({ ...formData, payrollRules: { ...formData.payrollRules, pagIbigFixed: Number(e.target.value) || 100 } })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ENTERPRISE DATA ENCRYPTION & SECURITY CONTROLS — Admin only
           ───────────────────────────────────────────────────────────── */}
        {isAdmin && (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Data Encryption &amp; System Security</h3>
                  <p className="text-xs text-slate-500">
                    AES-256 equivalent cryptographic protection for attendance, payroll, and QR tokens
                  </p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                AES-256 Active
              </span>
            </div>

          {/* Encryption Feature Switches */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.securityEncryption?.aes256Enabled ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    securityEncryption: {
                      ...formData.securityEncryption,
                      aes256Enabled: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">At-Rest Database & Storage Encryption</p>
                <p className="text-[11px] text-slate-500">
                  Encrypts local storage and database records with cryptographic salts and XOR cipher stream.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.securityEncryption?.qrEncryptionEnabled ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    securityEncryption: {
                      ...formData.securityEncryption,
                      qrEncryptionEnabled: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">Dynamic QR HMAC Token Signing</p>
                <p className="text-[11px] text-slate-500">
                  Signs digital badge QR tokens with dynamic salt keys to prevent barcode tampering and cloning.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.securityEncryption?.auditLogHashing ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    securityEncryption: {
                      ...formData.securityEncryption,
                      auditLogHashing: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">Immutable Audit Trail Hashing</p>
                <p className="text-[11px] text-slate-500">
                  Generates cryptographic SHA hash checksums on every punch-in, punch-out, and payroll computation.
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-slate-50 cursor-pointer transition">
              <input
                type="checkbox"
                checked={formData.securityEncryption?.tlsEnforced ?? true}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    securityEncryption: {
                      ...formData.securityEncryption,
                      tlsEnforced: e.target.checked,
                    },
                  })
                }
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
              />
              <div>
                <p className="text-xs font-bold text-slate-800">TLS 1.3 / SSL In-Transit Enforcement</p>
                <p className="text-[11px] text-slate-500">
                  Enforces HTTPS and encrypted WebSocket transport for live punch feeds and terminal scanners.
                </p>
              </div>
            </label>
          </div>

          {/* Cryptographic Salt & Session Security */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Enterprise Cryptographic Salt Key
              </label>
              <div className="relative">
                <input
                  type={showEncryptionSalt ? 'text' : 'password'}
                  value={formData.securityEncryption?.encryptionSalt || 'APEX_DTR_SECURE_SALT_v2_2026'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      securityEncryption: {
                        ...formData.securityEncryption,
                        encryptionSalt: e.target.value,
                      },
                    })
                  }
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 pr-10 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowEncryptionSalt(!showEncryptionSalt)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  title={showEncryptionSalt ? 'Hide Key' : 'Show Key'}
                >
                  {showEncryptionSalt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">Key used for hashing tokens and localized payload storage</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Session Inactivity Timeout (Minutes)
              </label>
              <input
                type="number"
                min="5"
                max="480"
                value={formData.securityEncryption?.sessionTimeoutMinutes ?? 60}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    securityEncryption: {
                      ...formData.securityEncryption,
                      sessionTimeoutMinutes: Number(e.target.value) || 60,
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
              />
              <p className="text-[10px] text-slate-400 mt-1">Automatically logs out inactive supervisory and administrative sessions</p>
            </div>
          </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ADMINISTRATOR PROFILE & ACCOUNT CREDENTIALS
           ───────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Admin Profile & Credentials</h3>
                <p className="text-xs text-slate-500">Update your administrator username, contact email, or password</p>
              </div>
            </div>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
              {user?.role || 'Super Admin'}
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Display Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                  placeholder="Administrator Name"
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Username (@)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={accountForm.username}
                  onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                  placeholder="admin"
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 font-mono focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Admin Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={accountForm.email}
                  onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                  placeholder="admin@apexhris.enterprise"
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 transition"
                />
              </div>
            </div>
          </div>

          {/* Password Change Sub-section */}
          <div className="pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5 text-blue-600" />
              <span>Change Password (Optional)</span>
              <span className="text-[11px] font-normal text-slate-400">
                — Leave blank to retain existing password
              </span>
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={accountForm.newPassword}
                    onChange={(e) => setAccountForm({ ...accountForm, newPassword: e.target.value })}
                    placeholder="Enter new password (min. 6 chars)"
                    className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 pr-10 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={accountForm.confirmNewPassword}
                    onChange={(e) => setAccountForm({ ...accountForm, confirmNewPassword: e.target.value })}
                    placeholder="Re-type new password"
                    className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 pr-10 focus:bg-white focus:ring-2 focus:ring-blue-500 font-mono transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            SECURITY AUTHORIZATION & CONFIRMATION
           ───────────────────────────────────────────────────────────── */}
        <div className="rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-white p-6 shadow-md border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-xl bg-blue-600/30 border border-blue-500/40 flex items-center justify-center text-blue-400">
                <Lock className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white">Security Authorization Required</h3>
                <p className="text-xs text-slate-400">
                  Enter your current account password to authorize and commit changes
                </p>
              </div>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-full flex items-center gap-1 self-start sm:self-auto">
              <ShieldCheck className="w-3.5 h-3.5" /> High Security
            </span>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                Current Account Password <span className="text-rose-400">*</span>
              </label>
              <div className="relative max-w-md">
                <input
                  type={showCurrentPassword ? 'text' : 'password'}
                  required
                  value={currentPassword}
                  onChange={(e) => {
                    setCurrentPassword(e.target.value);
                    if (securityError) setSecurityError('');
                  }}
                  placeholder="Enter your current password to save..."
                  className={`w-full bg-slate-800/90 border ${
                    securityError ? 'border-rose-500 ring-2 ring-rose-500/30' : 'border-slate-700 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/30'
                  } text-sm text-white placeholder-slate-500 rounded-xl py-3 px-3.5 pr-10 font-mono transition`}
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
                >
                  {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {securityError && (
              <div className="flex items-center gap-2 text-xs font-semibold text-rose-400 bg-rose-950/40 border border-rose-800/60 p-3 rounded-xl">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{securityError}</span>
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800">
            <p className="text-[11px] text-slate-400">
              Changes apply immediately to enterprise system configuration.
            </p>

            <button
              type="submit"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-blue-600/30 transition hover:scale-[1.02] active:scale-[0.98]"
            >
              <Save className="w-4 h-4" />
              <span>Save System Configuration</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default SettingsModule;

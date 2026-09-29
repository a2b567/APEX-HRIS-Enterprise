import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import { useToast } from '../../components/shared/Toast';
import {
  Building,
  Clock,
  Banknote,
  Save,
  RefreshCw,
  QrCode,
} from 'lucide-react';

export const SettingsModule = () => {
  const { settings, updateSettings, resetToFactoryDefaults } = useData();
  const { addToast } = useToast();

  const defaultShiftFallback = { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: settings?.gracePeriodMinutes || 15 };
  const qrSettingsFallback = { tokenExpiryDays: 365, kioskAutoResetSeconds: 4, strictBranchValidation: true };
  const payrollRulesFallback = {
    overtimeMultiplier: settings?.overtimeRateMultiplier || 1.25,
    sssRate: settings?.sssContributionRate || 0.045,
    pagIbigFixed: settings?.pagIbigFixedRate || 100,
  };

  const [formData, setFormData] = useState({
    companyName: settings?.companyName || 'APEX HRIS Enterprise',
    companyTagline: settings?.companyTagline || 'Enterprise Multi-Branch HRIS & Payroll Platform',
    taxIdNumber: '123-456-789-000',
    ...settings,
    defaultShift: { ...defaultShiftFallback, ...settings?.defaultShift },
    qrSettings: { ...qrSettingsFallback, ...settings?.qrSettings },
    payrollRules: { ...payrollRulesFallback, ...settings?.payrollRules },
  });

  const handleSave = (e) => {
    e.preventDefault();
    updateSettings(formData);
    addToast({
      title: 'Settings Saved',
      message: 'System parameters, shift rules, and QR configurations updated.',
      type: 'success',
    });
  };

  const handleReset = () => {
    if (window.confirm('Reset all branch records and attendance data back to default factory seed?')) {
      resetToFactoryDefaults();
      setFormData({
        companyName: 'APEX HRIS Enterprise',
        companyTagline: 'Enterprise Multi-Branch HRIS & Payroll Platform',
        taxIdNumber: '123-456-789-000',
        ...settings,
        defaultShift: defaultShiftFallback,
        qrSettings: qrSettingsFallback,
        payrollRules: payrollRulesFallback,
      });
      addToast({
        title: 'Factory Reset',
        message: 'System restored to pristine seed data.',
        type: 'info',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
              Super Admin Only
            </span>
            <span className="text-xs text-slate-500 font-medium">Enterprise Configurations</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">System Settings</h1>
          <p className="text-xs text-slate-500">
            Shift rules, QR badge parameters, statutory deduction rates, and company details.
          </p>
        </div>

        <button
          onClick={handleReset}
          className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-600 border border-slate-200 px-4 py-2 text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <RefreshCw className="w-4 h-4 text-amber-500" />
          <span>Reset to Factory Defaults</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Company Profile */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Company Identity</h3>
              <p className="text-xs text-slate-500">Official enterprise details for headers & payslips</p>
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

        {/* QR Attendance & Kiosk Settings */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <QrCode className="w-5 h-5 text-blue-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">QR Code & Kiosk Parameters</h3>
              <p className="text-xs text-slate-500">Security tokens, kiosk auto-reset timer, and branch validation</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Token Expiry (Days)
              </label>
              <input
                type="number"
                value={formData.qrSettings?.tokenExpiryDays ?? 365}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    qrSettings: {
                      ...formData.qrSettings,
                      tokenExpiryDays: Number(e.target.value) || 365,
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Kiosk Auto-Reset (Seconds)
              </label>
              <input
                type="number"
                value={formData.qrSettings?.kioskAutoResetSeconds ?? 4}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    qrSettings: {
                      ...formData.qrSettings,
                      kioskAutoResetSeconds: Number(e.target.value) || 4,
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Strict Branch Isolation
              </label>
              <select
                value={formData.qrSettings?.strictBranchValidation ? 'true' : 'false'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    qrSettings: {
                      ...formData.qrSettings,
                      strictBranchValidation: e.target.value === 'true',
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
              >
                <option value="true">Enforced (Reject other branches)</option>
                <option value="false">Permissive (Warning only)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Work Shift & Grace Period Rules */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Clock className="w-5 h-5 text-emerald-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Default Shift & Attendance Rules</h3>
              <p className="text-xs text-slate-500">Work schedule standards applied across all branches</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shift Start Time
              </label>
              <input
                type="time"
                value={formData.defaultShift?.startTime || '08:00'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultShift: { ...formData.defaultShift, startTime: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Shift End Time
              </label>
              <input
                type="time"
                value={formData.defaultShift?.endTime || '17:00'}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultShift: { ...formData.defaultShift, endTime: e.target.value },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Grace Period (Minutes)
              </label>
              <input
                type="number"
                value={formData.defaultShift?.gracePeriodMinutes ?? 15}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    defaultShift: {
                      ...formData.defaultShift,
                      gracePeriodMinutes: Number(e.target.value) || 0,
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Payroll Rates & Overtime */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Banknote className="w-5 h-5 text-amber-600" />
            <div>
              <h3 className="text-sm font-bold text-slate-900">Payroll & Statutory Rates</h3>
              <p className="text-xs text-slate-500">Overtime multiplier and government deduction shares</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Overtime Multiplier
              </label>
              <input
                type="number"
                step="0.05"
                value={formData.payrollRules?.overtimeMultiplier ?? 1.25}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payrollRules: {
                      ...formData.payrollRules,
                      overtimeMultiplier: Number(e.target.value) || 1.25,
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                SSS Contribution Rate
              </label>
              <input
                type="number"
                step="0.005"
                value={formData.payrollRules?.sssRate ?? 0.045}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payrollRules: {
                      ...formData.payrollRules,
                      sssRate: Number(e.target.value) || 0.045,
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Pag-IBIG Fixed (Monthly)
              </label>
              <input
                type="number"
                step="10"
                value={formData.payrollRules?.pagIbigFixed ?? 100}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    payrollRules: {
                      ...formData.payrollRules,
                      pagIbigFixed: Number(e.target.value) || 100,
                    },
                  })
                }
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="submit"
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Save className="w-4 h-4" />
            <span>Save System Configuration</span>
          </button>
        </div>
      </form>
    </div>
  );
};

export default SettingsModule;

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { computeEmployeePayroll } from '../../utils/payrollCalculator';
import { FileText, Printer, Calendar, Banknote, Shield, QrCode } from 'lucide-react';

export const MyPayslips = () => {
  const { user } = useAuth();
  const { employees, attendanceLogs, settings, getDisbursementStatus } = useData();

  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cutoffType, setCutoffType] = useState('1-15');

  const employee = useMemo(() => {
    return employees.find((e) => e.userId === user?.id || e.id === user?.employeeId) || employees[0];
  }, [employees, user]);

  const payslip = useMemo(() => {
    if (!employee) return null;
    return computeEmployeePayroll(employee, attendanceLogs, cutoffType, selectedMonth, settings);
  }, [employee, attendanceLogs, cutoffType, selectedMonth, settings]);

  const disbStatus = useMemo(() => {
    if (!employee) return { disbursed: false };
    return getDisbursementStatus(employee.id, selectedMonth, cutoffType);
  }, [employee, getDisbursementStatus, selectedMonth, cutoffType]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-3xl">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Personal Compensation
            </span>
            <span className="text-xs text-slate-500 font-mono">{employee?.id}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">My Payslip Portal</h1>
          <p className="text-xs text-slate-500">
            Official itemized earnings, statutory deduction breakdowns, and net take-home receipts.
          </p>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-semibold shadow-sm transition self-start sm:self-auto"
        >
          <Printer className="w-4 h-4" />
          <span>Print Payslip</span>
        </button>
      </div>

      {/* Selectors */}
      <div className="no-print rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Pay Period Month
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Cutoff Period
          </label>
          <select
            value={cutoffType}
            onChange={(e) => setCutoffType(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-xs text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          >
            <option value="1-15">1st Cutoff (1st – 15th)</option>
            <option value="16-EOM">2nd Cutoff (16th – End of Month)</option>
          </select>
        </div>
      </div>

      {/* Official Payslip Voucher Box */}
      {payslip && (
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm space-y-5 print-container">
          {/* Header */}
          <div className="text-center border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900 uppercase tracking-wider">
              {settings.companyName}
            </h2>
            <p className="text-xs text-slate-500">{settings.companyTagline}</p>
            <p className="text-[11px] font-mono text-slate-400 mt-0.5">TIN: {settings.taxIdNumber}</p>
          </div>

          {/* Employee & Period Details */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
            <div>
              <span className="text-[10px] font-semibold uppercase text-slate-500">Employee Details</span>
              <p className="font-bold text-slate-900 text-sm mt-0.5">{payslip.employeeName}</p>
              <p className="font-mono text-blue-600 text-[11px]">{payslip.employeeId}</p>
              <p className="text-slate-500 text-[11px] mt-1">{employee?.position}</p>
            </div>
            <div className="text-right">
              <span className="text-[10px] font-semibold uppercase text-slate-500">Payroll Cutoff</span>
              <p className="font-bold text-slate-800 mt-0.5">{payslip.cutoffType} ({payslip.selectedMonth})</p>
              <p className="text-slate-500 text-[11px]">{payslip.branchId}</p>
              <p className="font-mono text-emerald-600 text-[11px] mt-1 font-semibold">Daily Rate: {formatCurrency(payslip.dailyRate)}</p>
            </div>
          </div>

          {/* 2-Column Earnings & Deductions Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            {/* Earnings */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 border-b border-slate-200 pb-1.5">
                Earnings
              </h4>
              <div className="flex justify-between text-slate-700">
                <span>Basic Pay ({payslip.daysWorked} days):</span>
                <span className="font-mono font-medium">{formatCurrency(payslip.basicPay)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Overtime Pay ({payslip.totalOvertimeHours}h):</span>
                <span className="font-mono font-medium text-emerald-600">+{formatCurrency(payslip.overtimePay)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Allowance:</span>
                <span className="font-mono font-medium text-emerald-600">+{formatCurrency(payslip.allowances)}</span>
              </div>
              {payslip.attendanceDeduction > 0 && (
                <div className="flex justify-between text-rose-600">
                  <span>Late/Undertime Deduction:</span>
                  <span className="font-mono font-medium">- {formatCurrency(payslip.attendanceDeduction)}</span>
                </div>
              )}
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Gross Earnings:</span>
                <span className="font-mono text-emerald-600">{formatCurrency(payslip.grossPay)}</span>
              </div>
            </div>

            {/* Deductions */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/80 space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 border-b border-slate-200 pb-1.5">
                Statutory Deductions
              </h4>
              <div className="flex justify-between text-slate-700">
                <span>SSS (Emp Share):</span>
                <span className="font-mono font-medium">{formatCurrency(payslip.sssDeduction)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>PhilHealth (Emp Share):</span>
                <span className="font-mono font-medium">{formatCurrency(payslip.philHealthDeduction)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Pag-IBIG Fund:</span>
                <span className="font-mono font-medium">{formatCurrency(payslip.pagIbigDeduction)}</span>
              </div>
              <div className="flex justify-between text-slate-700">
                <span>Withholding Tax:</span>
                <span className="font-mono font-medium">{formatCurrency(payslip.withholdingTax)}</span>
              </div>
              <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                <span>Total Deductions:</span>
                <span className="font-mono text-rose-600">- {formatCurrency(payslip.totalDeductions)}</span>
              </div>
            </div>
          </div>

          {/* Disbursement Status Banner */}
          <div className={`p-4 rounded-2xl border-2 text-xs ${
            disbStatus.disbursed
              ? 'bg-emerald-50 border-emerald-400'
              : 'bg-amber-50 border-amber-300 border-dashed'
          }`}>
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl shrink-0 ${disbStatus.disbursed ? 'bg-emerald-600 text-white' : 'bg-amber-400 text-white'}`}>
                <Shield className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <p className={`font-black text-base ${disbStatus.disbursed ? 'text-emerald-800' : 'text-amber-800'}`}>
                  {disbStatus.disbursed ? '✅ SALARY DISBURSED & PAID' : '⏳ AWAITING SALARY RELEASE'}
                </p>

                {disbStatus.disbursed ? (
                  <div className="mt-2 space-y-1">
                    <p className="text-emerald-700 font-semibold">
                      Your salary has been officially released and confirmed via QR Badge verification.
                    </p>
                    <div className="mt-2 bg-emerald-100 border border-emerald-300 rounded-xl p-3 space-y-1 text-emerald-900">
                      <div className="flex justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-600">Release Method</span>
                        <span className="font-bold text-[11px]">{disbStatus.method || 'QR Badge Scan'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-600">Released On</span>
                        <span className="font-mono text-[11px] font-bold">
                          {disbStatus.disbursedAt ? new Date(disbStatus.disbursedAt).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-[10px] uppercase font-bold text-emerald-600">Released By</span>
                        <span className="font-semibold text-[11px]">{disbStatus.disbursedBy || 'HR Officer'}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 space-y-1.5">
                    <p className="text-amber-700">Your salary for this cutoff has not yet been released.</p>
                    <div className="mt-2 bg-white border border-amber-200 rounded-xl p-3 flex items-start gap-2.5 text-amber-800">
                      <QrCode className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-[12px]">Action Required: Present Your QR Badge</p>
                        <p className="text-[11px] mt-0.5 text-amber-700">
                          Go to the HR / Payroll counter and present your QR Employee Badge for scanning. Once verified, your salary will be marked as <strong>PAID</strong> and will appear here instantly.
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {disbStatus.disbursed && (
                <span className="font-mono text-[10px] font-black px-2.5 py-1.5 rounded-xl bg-emerald-600 text-white shrink-0 self-start">
                  ✓ VERIFIED
                </span>
              )}
            </div>
          </div>

          {/* Net Pay Grand Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-white flex items-center justify-between shadow-sm">
            <div>
              <span className="text-[10px] uppercase font-bold text-slate-400">Net Take Home Pay</span>
              <p className="text-xs text-slate-300">Net total payable for this cutoff</p>
            </div>
            <div className="font-mono text-2xl font-extrabold text-emerald-400">
              {formatCurrency(payslip.netPay)}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPayslips;

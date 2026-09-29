import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useBranchScope } from '../../hooks/useBranchScope';
import Modal from '../../components/shared/Modal';
import { formatCurrency, formatDate } from '../../utils/formatters';
import { computeEmployeePayroll } from '../../utils/payrollCalculator';
import { useToast } from '../../components/shared/Toast';
import {
  Banknote,
  Calendar,
  Building2,
  Users,
  Download,
  Printer,
  FileText,
  Search,
  CheckCircle2,
  ChevronRight,
  Shield,
  FileSpreadsheet,
} from 'lucide-react';

export const PayrollModule = () => {
  const { role, user } = useAuth();
  const { branches, employees, attendanceLogs, settings } = useData();
  const branchScope = useBranchScope();
  const { addToast } = useToast();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isSupervisor = role === 'SUPERVISOR';
  const supervisorBranchId = user?.branchId;

  // Selected period
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [cutoffType, setCutoffType] = useState('1-15');
  const [branchFilter, setBranchFilter] = useState(isSuperAdmin ? 'ALL' : supervisorBranchId);
  const [searchQuery, setSearchQuery] = useState('');

  // Selected Payslip for printable view
  const [activePayslip, setActivePayslip] = useState(null);

  // Scoped employees
  const targetEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!isSuperAdmin) {
        if (emp.branchId !== supervisorBranchId) return false;
      } else if (branchFilter !== 'ALL') {
        if (emp.branchId !== branchFilter) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchId = emp.id.toLowerCase().includes(q);
        const matchDept = emp.department?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDept) return false;
      }

      return true;
    });
  }, [employees, isSuperAdmin, supervisorBranchId, branchFilter, searchQuery]);

  // Compute payroll records for all target employees
  const payrollRecords = useMemo(() => {
    return targetEmployees.map((emp) =>
      computeEmployeePayroll(emp, attendanceLogs, cutoffType, selectedMonth, settings)
    );
  }, [targetEmployees, attendanceLogs, cutoffType, selectedMonth, settings]);

  // Aggregated totals
  const grandTotals = useMemo(() => {
    let gross = 0;
    let basic = 0;
    let ot = 0;
    let lateDeductions = 0;
    let sss = 0;
    let philHealth = 0;
    let pagIbig = 0;
    let tax = 0;
    let totalDeductions = 0;
    let net = 0;

    payrollRecords.forEach((p) => {
      gross += p.grossPay;
      basic += p.basicPay;
      ot += p.overtimePay;
      lateDeductions += p.attendanceDeduction;
      sss += p.sssDeduction;
      philHealth += p.philHealthDeduction;
      pagIbig += p.pagIbigDeduction;
      tax += p.withholdingTax;
      totalDeductions += p.totalDeductions;
      net += p.netPay;
    });

    return {
      gross,
      basic,
      ot,
      lateDeductions,
      sss,
      philHealth,
      pagIbig,
      tax,
      totalDeductions,
      net,
      headcount: payrollRecords.length,
    };
  }, [payrollRecords]);

  // Per Branch Summaries (For Super Admin)
  const branchPayrollBreakdowns = useMemo(() => {
    if (!isSuperAdmin) return [];
    return branches.map((b) => {
      const bEmployees = employees.filter((e) => e.branchId === b.id);
      const bRecords = bEmployees.map((e) =>
        computeEmployeePayroll(e, attendanceLogs, cutoffType, selectedMonth, settings)
      );
      const bGross = bRecords.reduce((sum, r) => sum + r.grossPay, 0);
      const bNet = bRecords.reduce((sum, r) => sum + r.netPay, 0);
      return {
        ...b,
        employeeCount: bEmployees.length,
        gross: bGross,
        net: bNet,
      };
    });
  }, [isSuperAdmin, branches, employees, attendanceLogs, cutoffType, selectedMonth, settings]);

  const handleExportPayrollCSV = () => {
    const headers = [
      'Employee ID',
      'Employee Name',
      'Branch',
      'Position',
      'Days Worked',
      'Basic Pay',
      'OT Pay',
      'Late/Undertime Deduction',
      'Allowances',
      'Gross Pay',
      'SSS',
      'PhilHealth',
      'Pag-IBIG',
      'Tax',
      'Total Deductions',
      'Net Pay',
    ];

    const rows = payrollRecords.map((p) => [
      p.employeeId,
      `"${p.employeeName}"`,
      p.branchId,
      `"${p.position}"`,
      p.daysWorked,
      p.basicPay,
      p.overtimePay,
      p.attendanceDeduction,
      p.allowances,
      p.grossPay,
      p.sssDeduction,
      p.philHealthDeduction,
      p.pagIbigDeduction,
      p.withholdingTax,
      p.totalDeductions,
      p.netPay,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Payroll_${cutoffType}_${selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({
      title: 'Payroll Ledger Exported',
      message: 'Generated CSV format for accounting disbursement.',
      type: 'info',
    });
  };

  const handlePrintPayslip = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Automated Payroll Engine
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isSuperAdmin ? 'Enterprise Consolidated (All 5 Branches)' : `Branch: ${supervisorBranchId}`}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">Payroll Ledger & Payslips</h1>
          <p className="text-xs text-slate-500">
            Philippine labor computations: Basic, Overtime (1.25x), Late penalties, SSS, PhilHealth, Pag-IBIG, and Net Pay.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportPayrollCSV}
            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Period & Scope Control Bar */}
      <div className="no-print rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Month Picker */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Payroll Month
          </label>
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        {/* Cutoff Selector */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Cutoff Period
          </label>
          <select
            value={cutoffType}
            onChange={(e) => setCutoffType(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          >
            <option value="1-15">1st Cutoff (1st – 15th)</option>
            <option value="16-EOM">2nd Cutoff (16th – End of Month)</option>
          </select>
        </div>

        {/* Branch Filter (Super Admin only) */}
        {isSuperAdmin && (
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
              Branch Filter
            </label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value="ALL">All 5 Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Search */}
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
            Search Staff
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
        </div>
      </div>

      {/* Super Admin: 5-Branch Payroll Breakdown Cards */}
      {isSuperAdmin && branchFilter === 'ALL' && (
        <div className="no-print space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Building2 className="w-4 h-4 text-blue-600" />
              <span>5-Branch Payroll Summary Breakdown</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {branchPayrollBreakdowns.map((b) => (
              <div
                key={b.id}
                onClick={() => setBranchFilter(b.id)}
                className="p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-blue-500 shadow-sm cursor-pointer transition flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                      {b.code}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">{b.employeeCount} staff</span>
                  </div>
                  <h4 className="text-xs font-bold text-slate-900 mt-2 truncate">{b.name}</h4>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-100">
                  <p className="text-[10px] text-slate-500 uppercase font-semibold">Net Disbursement</p>
                  <p className="font-mono text-sm font-bold text-emerald-600 mt-0.5">{formatCurrency(b.net)}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Executive Grand Total Summary Banner */}
      <div className="no-print rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-[11px] uppercase font-semibold text-slate-500">Processed Staff</p>
            <p className="text-xl font-bold text-slate-900 mt-1">{grandTotals.headcount} Employees</p>
          </div>
          <div>
            <p className="text-[11px] uppercase font-semibold text-slate-500">Total Basic Pay</p>
            <p className="font-mono text-lg font-bold text-slate-800 mt-1">{formatCurrency(grandTotals.basic)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase font-semibold text-slate-500">Total Overtime Pay</p>
            <p className="font-mono text-lg font-bold text-amber-600 mt-1">{formatCurrency(grandTotals.ot)}</p>
          </div>
          <div>
            <p className="text-[11px] uppercase font-semibold text-slate-500">Total Deductions</p>
            <p className="font-mono text-lg font-bold text-rose-600 mt-1">- {formatCurrency(grandTotals.totalDeductions)}</p>
          </div>
          <div className="col-span-2 sm:col-span-4 lg:col-span-1 bg-emerald-50 p-3 rounded-xl border border-emerald-200">
            <p className="text-[11px] uppercase font-bold text-emerald-800">Grand Total Net Pay</p>
            <p className="font-mono text-xl font-extrabold text-emerald-600 mt-0.5">{formatCurrency(grandTotals.net)}</p>
          </div>
        </div>
      </div>

      {/* Comprehensive Payroll Ledger Table */}
      <div className="no-print rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Payroll Ledger ({payrollRecords.length} Employees)
          </span>
          <span className="text-xs font-mono font-medium text-blue-600">
            Cutoff: {cutoffType} | Period: {selectedMonth}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                {isSuperAdmin && <th className="py-3.5 px-4">Branch</th>}
                <th className="py-3.5 px-4">Days</th>
                <th className="py-3.5 px-4">Basic Pay</th>
                <th className="py-3.5 px-4">Overtime</th>
                <th className="py-3.5 px-4">Late / Undertime</th>
                <th className="py-3.5 px-4">Gross Pay</th>
                <th className="py-3.5 px-4">Total Deductions</th>
                <th className="py-3.5 px-4">Net Take Home</th>
                <th className="py-3.5 px-4 text-right">Payslip</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {payrollRecords.map((p) => {
                const branchObj = branches.find((b) => b.id === p.branchId);

                return (
                  <tr key={p.employeeId} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{p.employeeName}</div>
                      <div className="font-mono text-[10px] text-blue-600">{p.employeeId}</div>
                    </td>

                    {isSuperAdmin && (
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] text-slate-600">{branchObj?.code || p.branchId}</span>
                      </td>
                    )}

                    <td className="py-3 px-4 font-mono font-medium text-slate-700">
                      {p.daysWorked} days
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-slate-800">
                      {formatCurrency(p.basicPay)}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-amber-600">
                      {p.overtimePay > 0 ? formatCurrency(p.overtimePay) : '₱0.00'}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-rose-600">
                      {p.attendanceDeduction > 0 ? `- ${formatCurrency(p.attendanceDeduction)}` : '₱0.00'}
                    </td>

                    <td className="py-3 px-4 font-mono font-bold text-slate-900">
                      {formatCurrency(p.grossPay)}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-rose-600">
                      - {formatCurrency(p.totalDeductions)}
                    </td>

                    <td className="py-3 px-4 font-mono font-extrabold text-emerald-600">
                      {formatCurrency(p.netPay)}
                    </td>

                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setActivePayslip(p)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Payslip</span>
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {payrollRecords.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No payroll records found for the selected scope.
            </div>
          )}
        </div>
      </div>

      {/* Official Printable Payslip Modal */}
      {activePayslip && (
        <Modal
          isOpen={!!activePayslip}
          onClose={() => setActivePayslip(null)}
          title="Official Employee Payslip"
          subtitle={`Pay Period: ${activePayslip.cutoffType} (${activePayslip.selectedMonth})`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 print-container">
            {/* Payslip Official Header */}
            <div className="text-center border-b border-slate-100 pb-4">
              <h2 className="text-base font-bold text-slate-900 uppercase tracking-wider">
                {settings.companyName}
              </h2>
              <p className="text-xs text-slate-500">{settings.companyTagline}</p>
              <p className="text-[11px] font-mono text-slate-400 mt-0.5">TIN: {settings.taxIdNumber}</p>
            </div>

            {/* Employee info grid */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-500">Employee Name</span>
                <p className="font-bold text-slate-900 text-sm mt-0.5">{activePayslip.employeeName}</p>
                <p className="font-mono text-blue-600 text-[11px]">{activePayslip.employeeId}</p>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-semibold text-slate-500">Branch & Position</span>
                <p className="font-semibold text-slate-800 mt-0.5">{activePayslip.branchId}</p>
                <p className="text-slate-500 text-[11px]">{activePayslip.position}</p>
              </div>
            </div>

            {/* Earnings & Deductions 2-Column Table */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              {/* Earnings column */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-700 border-b border-slate-200 pb-1.5">
                  Earnings
                </h4>
                <div className="flex justify-between text-slate-700">
                  <span>Basic Pay ({activePayslip.daysWorked} days):</span>
                  <span className="font-mono font-medium">{formatCurrency(activePayslip.basicPay)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Overtime Pay ({activePayslip.totalOvertimeHours}h):</span>
                  <span className="font-mono font-medium text-emerald-600">+{formatCurrency(activePayslip.overtimePay)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Allowances:</span>
                  <span className="font-mono font-medium text-emerald-600">+{formatCurrency(activePayslip.allowances)}</span>
                </div>
                {activePayslip.attendanceDeduction > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Late/Undertime Deduction:</span>
                    <span className="font-mono font-medium">- {formatCurrency(activePayslip.attendanceDeduction)}</span>
                  </div>
                )}
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                  <span>Gross Earnings:</span>
                  <span className="font-mono text-emerald-600">{formatCurrency(activePayslip.grossPay)}</span>
                </div>
              </div>

              {/* Deductions column */}
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-rose-700 border-b border-slate-200 pb-1.5">
                  Statutory Deductions
                </h4>
                <div className="flex justify-between text-slate-700">
                  <span>SSS Contribution:</span>
                  <span className="font-mono font-medium">{formatCurrency(activePayslip.sssDeduction)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>PhilHealth Contribution:</span>
                  <span className="font-mono font-medium">{formatCurrency(activePayslip.philHealthDeduction)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Pag-IBIG Fund:</span>
                  <span className="font-mono font-medium">{formatCurrency(activePayslip.pagIbigDeduction)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Withholding Tax:</span>
                  <span className="font-mono font-medium">{formatCurrency(activePayslip.withholdingTax)}</span>
                </div>
                <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-slate-900">
                  <span>Total Deductions:</span>
                  <span className="font-mono text-rose-600">- {formatCurrency(activePayslip.totalDeductions)}</span>
                </div>
              </div>
            </div>

            {/* Net Pay Grand Box */}
            <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold text-emerald-800">Net Take Home Pay</span>
                <p className="text-xs text-slate-600">Direct Deposit via Branch Payroll Account</p>
              </div>
              <div className="font-mono text-2xl font-extrabold text-emerald-600">
                {formatCurrency(activePayslip.netPay)}
              </div>
            </div>

            {/* Modal Bottom Actions */}
            <div className="no-print flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                onClick={() => setActivePayslip(null)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Close
              </button>
              <button
                onClick={handlePrintPayslip}
                className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                <Printer className="w-4 h-4" />
                <span>Print Official Payslip</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default PayrollModule;

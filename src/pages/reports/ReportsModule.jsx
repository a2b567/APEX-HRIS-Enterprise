import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useBranchScope } from '../../hooks/useBranchScope';
import { formatCurrency } from '../../utils/formatters';
import { computeEmployeePayroll } from '../../utils/payrollCalculator';
import {
  BarChart3,
  Calendar,
  Building2,
  Users,
  Download,
  TrendingUp,
  Clock,
  Banknote,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const ReportsModule = () => {
  const { role, user } = useAuth();
  const { branches, employees, attendanceLogs, settings } = useData();
  const branchScope = useBranchScope();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const supervisorBranchId = user?.branchId;

  const [selectedBranch, setSelectedBranch] = useState(isSuperAdmin ? 'ALL' : supervisorBranchId);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  // Scoped employees
  const targetEmployees = useMemo(() => {
    if (!isSuperAdmin) return employees.filter((e) => e.branchId === supervisorBranchId);
    if (selectedBranch === 'ALL') return employees;
    return employees.filter((e) => e.branchId === selectedBranch);
  }, [employees, isSuperAdmin, supervisorBranchId, selectedBranch]);

  // Attendance summary metrics
  const attendanceAnalytics = useMemo(() => {
    const branchLogs = attendanceLogs.filter((l) => {
      if (!isSuperAdmin) return l.branchId === supervisorBranchId;
      if (selectedBranch !== 'ALL') return l.branchId === selectedBranch;
      return true;
    });

    const present = branchLogs.filter((l) => l.status === 'Present').length;
    const late = branchLogs.filter((l) => l.status === 'Late').length;
    const absent = branchLogs.filter((l) => l.status === 'Absent').length;
    const onLeave = branchLogs.filter((l) => l.status === 'On Leave').length;

    return {
      totalLogs: branchLogs.length,
      present,
      late,
      absent,
      onLeave,
      lateRate: branchLogs.length > 0 ? Math.round((late / branchLogs.length) * 100) : 0,
      punctualityRate: branchLogs.length > 0 ? Math.round((present / branchLogs.length) * 100) : 0,
    };
  }, [attendanceLogs, isSuperAdmin, supervisorBranchId, selectedBranch]);

  // 5-Branch Comparison Data for Charts
  const branchComparisonData = useMemo(() => {
    return branches.map((b) => {
      const bLogs = attendanceLogs.filter((l) => l.branchId === b.id);
      const bEmps = employees.filter((e) => e.branchId === b.id);
      const bPayroll = bEmps.reduce((sum, e) => {
        const p = computeEmployeePayroll(e, attendanceLogs, '1-15', selectedMonth, settings);
        return sum + p.netPay;
      }, 0);

      return {
        name: b.code,
        fullName: b.name,
        Employees: bEmps.length,
        Present: bLogs.filter((l) => l.status === 'Present').length,
        Late: bLogs.filter((l) => l.status === 'Late').length,
        Absent: bLogs.filter((l) => l.status === 'Absent').length,
        Payroll: bPayroll,
      };
    });
  }, [branches, attendanceLogs, employees, selectedMonth, settings]);

  const PIE_COLORS = ['#10b981', '#f59e0b', '#f43f5e', '#8b5cf6'];

  const attendancePieData = [
    { name: 'On-Time Present', value: attendanceAnalytics.present },
    { name: 'Late (Within Grace/Penalty)', value: attendanceAnalytics.late },
    { name: 'Absent', value: attendanceAnalytics.absent },
    { name: 'On Leave', value: attendanceAnalytics.onLeave },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Intelligence & Analytics
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isSuperAdmin ? 'Enterprise Consolidated (All Branches)' : `Branch Scope: ${supervisorBranchId}`}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">Reports & Insights</h1>
          <p className="text-xs text-slate-500">
            Attendance punctuality trends, overtime disbursements, and cross-branch labor metrics.
          </p>
        </div>

        {/* Branch Filter (Super Admin only) */}
        {isSuperAdmin && (
          <div className="w-full sm:w-60">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full py-2 px-3 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:ring-2 focus:ring-blue-500 font-medium shadow-sm"
            >
              <option value="ALL">All Branches (Consolidated)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <p className="text-[11px] uppercase font-semibold text-slate-500">Punctuality Rate</p>
          <p className="text-2xl font-bold text-emerald-600 mt-1">{attendanceAnalytics.punctualityRate}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">On-time clock-in</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <p className="text-[11px] uppercase font-semibold text-slate-500">Late Rate</p>
          <p className="text-2xl font-bold text-amber-600 mt-1">{attendanceAnalytics.lateRate}%</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Exceeded 15m grace</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <p className="text-[11px] uppercase font-semibold text-slate-500">Active Workforce</p>
          <p className="text-2xl font-bold text-blue-600 mt-1">{targetEmployees.length} Staff</p>
          <p className="text-[11px] text-slate-400 mt-0.5">In selected scope</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
          <p className="text-[11px] uppercase font-semibold text-slate-500">Recorded DTR Logs</p>
          <p className="text-2xl font-bold text-slate-900 mt-1">{attendanceAnalytics.totalLogs}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Logged shifts</p>
        </div>
      </div>

      {/* Visual Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendance Distribution Pie Chart */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Attendance Distribution Status</h3>
          <p className="text-xs text-slate-500 mb-4">Proportion of on-time, late, absent, and leave records</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={attendancePieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={85}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {attendancePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cross-Branch Comparative Bar Chart */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm">
          <h3 className="text-sm font-bold text-slate-900 mb-1">Branch Payroll Expense Distribution</h3>
          <p className="text-xs text-slate-500 mb-4">Estimated net disbursement comparison across branches</p>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={branchComparisonData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                <YAxis
                  stroke="#94a3b8"
                  fontSize={10}
                  tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`}
                />
                <Tooltip
                  formatter={(val) => formatCurrency(val)}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#e2e8f0',
                    borderRadius: '12px',
                    fontSize: '12px',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="Payroll" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReportsModule;

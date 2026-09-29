import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useClock } from '../../hooks/useClock';
import { formatCurrency, formatTime, formatDate, getStatusBadge } from '../../utils/formatters';
import { computeEmployeePayroll } from '../../utils/payrollCalculator';
import {
  User,
  Clock,
  Calendar,
  Building2,
  Banknote,
  CheckCircle2,
  AlertCircle,
  FileText,
  CreditCard,
  Shield,
  Briefcase,
} from 'lucide-react';
import { useToast } from '../../components/shared/Toast';

export const EmployeeDashboard = () => {
  const { user } = useAuth();
  const { branches, employees, attendanceLogs, recordPunch, settings } = useData();
  const { formattedTime, formattedDate, greeting, currentTimeHHMM } = useClock();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  // Match the logged in employee profile
  const employee = useMemo(() => {
    return employees.find((e) => e.userId === user?.id || e.id === user?.employeeId) || employees[0];
  }, [employees, user]);

  const branch = branches.find((b) => b.id === employee?.branchId);

  // Today's log for this employee
  const todayLog = useMemo(() => {
    return attendanceLogs.find((l) => l.employeeId === employee?.id && l.date === todayStr);
  }, [attendanceLogs, employee?.id, todayStr]);

  // Recent attendance history (last 5 records)
  const recentLogs = useMemo(() => {
    return attendanceLogs
      .filter((l) => l.employeeId === employee?.id)
      .slice(0, 7);
  }, [attendanceLogs, employee?.id]);

  // Estimated current payroll payslip
  const latestPayroll = useMemo(() => {
    if (!employee) return null;
    return computeEmployeePayroll(
      employee,
      attendanceLogs,
      '1-15',
      new Date().toISOString().slice(0, 7),
      settings
    );
  }, [employee, attendanceLogs, settings]);

  const handlePunch = (type) => {
    if (!employee) return;
    const res = recordPunch(employee.id, type);
    if (res.success) {
      addToast({
        title: 'DTR Punch Confirmed',
        message: res.message,
        type: 'success',
      });
    } else {
      addToast({
        title: 'Punch Notice',
        message: res.message,
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Employee Greeting & Live Punch Hero Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Welcome Profile Card */}
        <div className="lg:col-span-2 rounded-2xl bg-white border border-slate-200/80 p-6 flex flex-col justify-between shadow-sm">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Employee Portal
              </span>
              <span className="font-mono text-xs text-blue-600 font-semibold">{employee?.id}</span>
            </div>

            <div className="mt-4 flex items-start gap-4">
              <div className="h-16 w-16 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700 font-bold text-xl">
                {employee?.name?.slice(0, 2) || 'EM'}
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{employee?.name}</h1>
                <p className="text-xs text-slate-500 font-medium">
                  {employee?.position} · <span className="text-blue-600 font-semibold">{employee?.department}</span>
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span>{branch?.name} ({branch?.id})</span>
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Daily Rate</span>
              <p className="font-mono font-bold text-slate-900 mt-0.5">{formatCurrency(employee?.dailyRate)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Hourly Rate</span>
              <p className="font-mono font-bold text-emerald-600 mt-0.5">{formatCurrency(employee?.hourlyRate)}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Type</span>
              <p className="font-semibold text-slate-800 mt-0.5 truncate">{employee?.employmentType}</p>
            </div>
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200/80">
              <span className="text-[10px] uppercase font-semibold text-slate-500">Status</span>
              <p className="font-semibold text-emerald-600 mt-0.5">{employee?.status}</p>
            </div>
          </div>
        </div>

        {/* Live Punch Clock Widget */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-6 shadow-sm flex flex-col justify-between text-center relative overflow-hidden">
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Real-time Clock In / Out
            </span>
            <div className="mt-2 text-3xl sm:text-4xl font-mono font-bold text-slate-900 tracking-wider">
              {formattedTime}
            </div>
            <p className="text-xs text-slate-500 mt-1 font-medium">{formattedDate}</p>

            {/* Shift hours indicator */}
            <div className="mt-3 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-50 border border-slate-200 text-[11px] text-slate-600 font-medium">
              <Clock className="w-3.5 h-3.5 text-blue-600" />
              <span>Shift: 08:00 AM – 05:00 PM (15m grace)</span>
            </div>
          </div>

          {/* Today's Punch Status Display */}
          <div className="my-4 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
            <div className="flex justify-between items-center text-slate-600 mb-1">
              <span>Time In:</span>
              <span className="font-mono font-bold text-emerald-600">
                {todayLog?.timeIn ? formatTime(todayLog.timeIn) : 'Not Clocked In'}
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-600">
              <span>Time Out:</span>
              <span className="font-mono font-bold text-blue-600">
                {todayLog?.timeOut ? formatTime(todayLog.timeOut) : 'Pending Out'}
              </span>
            </div>
          </div>

          {/* Punch Action Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => handlePunch('IN')}
              disabled={!!todayLog?.timeIn}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                !todayLog?.timeIn
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{todayLog?.timeIn ? 'Clocked In' : 'Time In'}</span>
            </button>

            <button
              onClick={() => handlePunch('OUT')}
              disabled={!todayLog?.timeIn || !!todayLog?.timeOut}
              className={`py-2.5 px-3 rounded-xl text-xs font-semibold transition flex items-center justify-center gap-1.5 ${
                todayLog?.timeIn && !todayLog?.timeOut
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-400 cursor-not-allowed'
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{todayLog?.timeOut ? 'Clocked Out' : 'Time Out'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2-Column: Recent DTR Activity + Latest Payslip Snapshot */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent DTR Activity */}
        <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>My Recent Attendance Records</span>
              </h3>
              <p className="text-xs text-slate-500">Past punch logs and computed shift hours</p>
            </div>
            <button
              onClick={() => navigate('/employee/dtr')}
              className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
            >
              View All Logs →
            </button>
          </div>

          <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white overflow-hidden text-xs">
            {recentLogs.length > 0 ? (
              recentLogs.map((log) => (
                <div key={log.id} className="p-3.5 flex items-center justify-between hover:bg-slate-50/80 transition">
                  <div>
                    <p className="font-semibold text-slate-900">{formatDate(log.date)}</p>
                    <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                      {formatTime(log.timeIn)} – {formatTime(log.timeOut)}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(log.status)}`}>
                      {log.status}
                    </span>
                    <p className="font-mono text-slate-500 text-[11px] mt-0.5">
                      {log.regularHours}h {log.overtimeHours > 0 ? `(+${log.overtimeHours}h OT)` : ''}
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 text-xs">
                No time logs recorded yet. Use the Time In button above or scan your QR badge.
              </div>
            )}
          </div>
        </div>

        {/* Current Cutoff Payslip Snapshot */}
        {latestPayroll && (
          <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-emerald-600" />
                    <span>Estimated Semi-Monthly Payslip</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cutoff: {latestPayroll.cutoffType} ({latestPayroll.selectedMonth})
                  </p>
                </div>
                <button
                  onClick={() => navigate('/employee/payslips')}
                  className="text-xs text-blue-600 hover:text-blue-700 font-semibold"
                >
                  Print Payslip →
                </button>
              </div>

              <div className="space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200/80 text-xs">
                <div className="flex justify-between text-slate-700">
                  <span>Days Worked ({latestPayroll.daysWorked} days):</span>
                  <span className="font-mono font-medium">{formatCurrency(latestPayroll.basicPay)}</span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Overtime Pay ({latestPayroll.totalOvertimeHours} hrs):</span>
                  <span className="font-mono font-medium text-emerald-600">
                    + {formatCurrency(latestPayroll.overtimePay)}
                  </span>
                </div>
                <div className="flex justify-between text-slate-700">
                  <span>Allowance:</span>
                  <span className="font-mono font-medium text-emerald-600">
                    + {formatCurrency(latestPayroll.allowances)}
                  </span>
                </div>
                {latestPayroll.attendanceDeduction > 0 && (
                  <div className="flex justify-between text-rose-600">
                    <span>Late/Undertime Deduction:</span>
                    <span className="font-mono font-medium">
                      - {formatCurrency(latestPayroll.attendanceDeduction)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-rose-600">
                  <span>Total Govt & Tax Deductions:</span>
                  <span className="font-mono font-medium">
                    - {formatCurrency(latestPayroll.totalDeductions)}
                  </span>
                </div>
                <div className="pt-3 border-t border-slate-200 flex justify-between text-sm font-bold text-slate-900">
                  <span>Estimated Net Take Home:</span>
                  <span className="font-mono text-emerald-600 text-base font-extrabold">
                    {formatCurrency(latestPayroll.netPay)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
              <span>Govt IDs: SSS, PhilHealth, Pag-IBIG on file</span>
              <button
                onClick={() => navigate('/employee/payslips')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Inspect Official Breakdown
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployeeDashboard;

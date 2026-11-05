import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useClock } from '../../hooks/useClock';
import { formatDate, formatTime, formatHours, getStatusBadge } from '../../utils/formatters';
import { Clock, Calendar, Download, Printer, Filter, FileCheck2 } from 'lucide-react';
import { useToast } from '../../components/shared/Toast';

export const MyDTR = () => {
  const { user } = useAuth();
  const { employees, attendanceLogs, recordPunch } = useData();
  const { formattedTime, formattedDate } = useClock();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  const employee = useMemo(() => {
    return employees.find((e) => e.userId === user?.id || e.id === user?.employeeId) || employees[0];
  }, [employees, user]);

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const todayLog = useMemo(() => {
    return attendanceLogs.find((l) => l.employeeId === employee?.id && l.date === todayStr);
  }, [attendanceLogs, employee?.id, todayStr]);

  const myLogs = useMemo(() => {
    return attendanceLogs.filter((l) => {
      if (l.employeeId !== employee?.id) return false;
      if (monthFilter && !l.date.startsWith(monthFilter)) return false;
      return true;
    });
  }, [attendanceLogs, employee?.id, monthFilter]);

  const handlePunch = (type) => {
    if (!employee) return;
    const res = recordPunch(employee.id, type);
    if (res.success) {
      addToast({ title: 'DTR Recorded', message: res.message, type: 'success' });
    } else {
      addToast({ title: 'Notice', message: res.message, type: 'error' });
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              Personal Attendance
            </span>
            <span className="text-xs text-blue-600 font-mono font-semibold">{employee?.id}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">My Daily Time Record</h1>
          <p className="text-xs text-slate-500">
            View attendance punch timestamps, total regular hours, overtime, and late penalties.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate('/employee/corrections')}
            className="flex items-center gap-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-300 px-4 py-2 text-xs font-semibold shadow-xs transition"
          >
            <FileCheck2 className="w-4 h-4 text-amber-700" />
            <span>Request Correction</span>
          </button>
          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4 text-blue-600" />
            <span>Print My DTR</span>
          </button>
        </div>
      </div>

      {/* Live Punch Hero Bar */}
      <div className="no-print rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="p-3 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600">
            <Clock className="w-7 h-7" />
          </div>
          <div>
            <p className="text-xs text-slate-500 font-medium">Real-Time Clock</p>
            <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900">
              {formattedTime}
            </div>
            <p className="text-xs text-slate-500">{formattedDate}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs flex flex-wrap items-center gap-3">
            <span className="text-slate-500 font-medium">Today's Punches:</span>
            <div className="flex items-center gap-2 font-mono text-[11px]">
              <span className="px-2 py-0.5 rounded bg-blue-50 text-blue-800 border border-blue-200">
                AM: {todayLog?.in1 || todayLog?.timeIn ? formatTime(todayLog.in1 || todayLog.timeIn) : '—'} / {todayLog?.out1 ? formatTime(todayLog.out1) : (!todayLog?.in2 && todayLog?.timeOut ? formatTime(todayLog.timeOut) : '—')}
              </span>
              <span className="px-2 py-0.5 rounded bg-indigo-50 text-indigo-800 border border-indigo-200">
                PM: {todayLog?.in2 ? formatTime(todayLog.in2) : '—'} / {todayLog?.out2 ? formatTime(todayLog.out2) : '—'}
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200">
                OT: {todayLog?.in3 ? formatTime(todayLog.in3) : '—'} / {todayLog?.out3 ? formatTime(todayLog.out3) : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Month Filter */}
      <div className="no-print flex items-center gap-3">
        <label className="text-xs font-semibold text-slate-600">Select Month:</label>
        <input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          className="bg-white border border-slate-200 text-xs text-slate-900 rounded-xl px-3 py-1.5 focus:ring-2 focus:ring-blue-500 shadow-sm font-medium"
        />
      </div>

      {/* Logs Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden print-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th rowSpan="2" className="py-3 px-3 align-middle">Date</th>
                <th colSpan="2" className="py-1.5 px-2 text-center bg-blue-50/70 text-blue-900 border-x border-slate-200 font-bold">Session 1 (AM)</th>
                <th colSpan="2" className="py-1.5 px-2 text-center bg-indigo-50/70 text-indigo-900 border-r border-slate-200 font-bold">Session 2 (PM)</th>
                <th colSpan="2" className="py-1.5 px-2 text-center bg-amber-50/70 text-amber-900 border-r border-slate-200 font-bold">Session 3 (OT)</th>
                <th rowSpan="2" className="py-3 px-2 text-center align-middle">Reg Hours</th>
                <th rowSpan="2" className="py-3 px-2 text-center align-middle">Overtime</th>
                <th rowSpan="2" className="py-3 px-2 text-center align-middle">Late</th>
                <th rowSpan="2" className="py-3 px-2 text-center align-middle">Status</th>
                <th rowSpan="2" className="py-3 px-3 align-middle">Remarks</th>
              </tr>
              <tr>
                <th className="py-1.5 px-2 text-center bg-emerald-50/50 text-emerald-700 font-bold border-l border-slate-200">In 1</th>
                <th className="py-1.5 px-2 text-center bg-rose-50/50 text-rose-700 font-bold border-r border-slate-200">Out 1</th>
                <th className="py-1.5 px-2 text-center bg-emerald-50/50 text-emerald-700 font-bold">In 2</th>
                <th className="py-1.5 px-2 text-center bg-rose-50/50 text-rose-700 font-bold border-r border-slate-200">Out 2</th>
                <th className="py-1.5 px-2 text-center bg-emerald-50/50 text-emerald-700 font-bold">In 3</th>
                <th className="py-1.5 px-2 text-center bg-rose-50/50 text-rose-700 font-bold border-r border-slate-200">Out 3</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myLogs.map((log) => {
                const in1Val = log.in1 || log.timeIn;
                const out1Val = log.out1 || (!log.in2 && log.timeOut ? log.timeOut : null);
                const in2Val = log.in2;
                const out2Val = log.out2;
                const in3Val = log.in3;
                const out3Val = log.out3;

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-3 font-semibold text-slate-900 whitespace-nowrap">{formatDate(log.date)}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-emerald-600 bg-emerald-50/20 border-l border-slate-100 whitespace-nowrap">
                      {in1Val ? formatTime(in1Val) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-rose-600 bg-rose-50/20 border-r border-slate-100 whitespace-nowrap">
                      {out1Val ? formatTime(out1Val) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-emerald-600 bg-emerald-50/20 whitespace-nowrap">
                      {in2Val ? formatTime(in2Val) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-rose-600 bg-rose-50/20 border-r border-slate-100 whitespace-nowrap">
                      {out2Val ? formatTime(out2Val) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-emerald-600 bg-emerald-50/20 whitespace-nowrap">
                      {in3Val ? formatTime(in3Val) : '—'}
                    </td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium text-rose-600 bg-rose-50/20 border-r border-slate-100 whitespace-nowrap">
                      {out3Val ? formatTime(out3Val) : '—'}
                    </td>
                    <td className="py-3 px-2 text-center font-mono text-slate-700">{formatHours(log.regularHours)}</td>
                    <td className="py-3 px-2 text-center font-mono font-medium text-amber-600">
                      {log.overtimeHours > 0 ? `+${log.overtimeHours}h` : '0.0h'}
                    </td>
                    <td className="py-3 px-2 text-center font-mono font-medium text-rose-600">
                      {log.lateMinutes > 0 ? `${log.lateMinutes}m` : '0m'}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-slate-500 text-[11px]">{log.remarks || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {myLogs.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No attendance logs found for this period.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyDTR;

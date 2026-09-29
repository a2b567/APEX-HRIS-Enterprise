import React, { useMemo, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useClock } from '../../hooks/useClock';
import { formatDate, formatTime, formatHours, getStatusBadge } from '../../utils/formatters';
import { Clock, Calendar, Download, Printer, Filter } from 'lucide-react';
import { useToast } from '../../components/shared/Toast';

export const MyDTR = () => {
  const { user } = useAuth();
  const { employees, attendanceLogs, recordPunch } = useData();
  const { formattedTime, formattedDate } = useClock();
  const { addToast } = useToast();

  const [monthFilter, setMonthFilter] = useState(new Date().toISOString().slice(0, 7));

  const employee = useMemo(() => {
    return employees.find((e) => e.userId === user?.id || e.id === user?.employeeId) || employees[0];
  }, [employees, user]);

  const todayStr = new Date().toISOString().split('T')[0];

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
          <div className="bg-slate-50 border border-slate-200/80 px-4 py-2.5 rounded-xl text-xs flex items-center gap-3">
            <span className="text-slate-500 font-medium">Status:</span>
            {todayLog?.timeIn && !todayLog?.timeOut ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                <span className="w-2 h-2 rounded-full bg-emerald-600 animate-ping"></span>
                Clocked In
              </span>
            ) : todayLog?.timeIn && todayLog?.timeOut ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                Clocked Out
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                Not Clocked In
              </span>
            )}
            <div className="h-4 w-px bg-slate-200 mx-1"></div>
            <span className="text-slate-500">In: <strong className="text-slate-900 font-mono">{todayLog?.timeIn ? formatTime(todayLog.timeIn) : '— —'}</strong></span>
            <span className="text-slate-500">Out: <strong className="text-slate-900 font-mono">{todayLog?.timeOut ? formatTime(todayLog.timeOut) : '— —'}</strong></span>
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
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Time In</th>
                <th className="py-3.5 px-4">Time Out</th>
                <th className="py-3.5 px-4">Hours Worked</th>
                <th className="py-3.5 px-4">Overtime</th>
                <th className="py-3.5 px-4">Late (mins)</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Remarks</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50/80 transition">
                  <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">{formatDate(log.date)}</td>
                  <td className="py-3 px-4 font-mono font-medium text-emerald-600">{formatTime(log.timeIn)}</td>
                  <td className="py-3 px-4 font-mono font-medium text-blue-600">{formatTime(log.timeOut)}</td>
                  <td className="py-3 px-4 font-mono text-slate-700">{formatHours(log.regularHours)}</td>
                  <td className="py-3 px-4 font-mono font-medium text-amber-600">
                    {log.overtimeHours > 0 ? `+${log.overtimeHours}h` : '0.0h'}
                  </td>
                  <td className="py-3 px-4 font-mono font-medium text-rose-600">
                    {log.lateMinutes > 0 ? `${log.lateMinutes}m` : '0m'}
                  </td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-medium border ${getStatusBadge(log.status)}`}>
                      {log.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-500 text-[11px]">{log.remarks || '—'}</td>
                </tr>
              ))}
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

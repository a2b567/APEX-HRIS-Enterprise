import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useBranchScope } from '../../hooks/useBranchScope';
import StatCard from '../../components/shared/StatCard';
import { formatCurrency, formatTime, getStatusBadge } from '../../utils/formatters';
import { computeEmployeePayroll } from '../../utils/payrollCalculator';
import {
  Building2,
  Users,
  Clock,
  UserCheck,
  AlertTriangle,
  Banknote,
  PlusCircle,
  Calendar,
  ChevronRight,
  ShieldCheck,
  QrCode,
  Zap,
} from 'lucide-react';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';

export const SupervisorDashboard = () => {
  const { user } = useAuth();
  const { branches, employees, attendanceLogs, recordPunch, liveScanFeed, settings } = useData();
  const branchScope = useBranchScope();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const [punchModalOpen, setPunchModalOpen] = useState(false);
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [punchType, setPunchType] = useState('IN');

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // NOTE: This is UI-level guard only. Go Fiber backend MUST enforce branch_id isolation.
  const myBranch = branches.find((b) => b.id === user?.branchId);
  const branchEmployees = useMemo(() => {
    return employees.filter((e) => e.branchId === user?.branchId);
  }, [employees, user?.branchId]);

  const todayLogs = useMemo(() => {
    return attendanceLogs.filter(
      (l) => l.branchId === user?.branchId && l.date === todayStr
    );
  }, [attendanceLogs, user?.branchId, todayStr]);

  const stats = useMemo(() => {
    const present = todayLogs.filter((l) => l.status === 'Present').length;
    const late = todayLogs.filter((l) => l.status === 'Late').length;
    const absent = todayLogs.filter((l) => l.status === 'Absent').length;
    const onLeave = todayLogs.filter((l) => l.status === 'On Leave').length;
    const qrScanned = todayLogs.filter((l) => l.method === 'QR').length;
    return {
      total: branchEmployees.length,
      present,
      late,
      absent,
      onLeave,
      qrScanned,
    };
  }, [todayLogs, branchEmployees]);

  const branchScanFeed = useMemo(() => {
    return liveScanFeed.filter((s) => s.branchId === user?.branchId).slice(0, 5);
  }, [liveScanFeed, user?.branchId]);

  // Branch Payroll estimation for current cutoff
  const branchPayrollEst = useMemo(() => {
    return branchEmployees.reduce((sum, emp) => {
      const p = computeEmployeePayroll(emp, attendanceLogs, '1-15', new Date().toISOString().slice(0, 7), settings);
      return sum + p.netPay;
    }, 0);
  }, [branchEmployees, attendanceLogs, settings]);

  const handleQuickPunch = (e) => {
    e.preventDefault();
    if (!selectedEmpId) return;

    const res = recordPunch(selectedEmpId, punchType);
    if (res.success) {
      addToast({
        title: 'Attendance Recorded',
        message: res.message,
        type: 'success',
      });
      setPunchModalOpen(false);
    } else {
      addToast({
        title: 'Punch Failed',
        message: res.message,
        type: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-2xl bg-gradient-to-r from-blue-900/40 via-indigo-900/30 to-slate-900 border border-blue-500/20 p-6 backdrop-blur">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-500/20 text-blue-300 border border-blue-500/30">
              Branch Supervisor
            </span>
            <span className="text-xs text-slate-400 font-mono">
              Branch: {myBranch?.id || user?.branchId}
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-extrabold text-white">
            Welcome, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-slate-300">
            Assigned Branch: <strong className="text-blue-300">{myBranch?.name || 'Assigned Branch'}</strong> ({myBranch?.location})
          </p>
        </div>

        {/* Big CTA for QR Attendance */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/supervisor/scan')}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-5 py-3 text-xs font-extrabold shadow-xl shadow-blue-600/40 transition transform hover:-translate-y-0.5"
          >
            <QrCode className="w-5 h-5 animate-pulse" />
            <span>SCAN QR ATTENDANCE</span>
          </button>

          <button
            onClick={() => navigate('/supervisor/qr-codes')}
            className="flex items-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 px-3.5 py-2.5 text-xs font-semibold transition"
          >
            <Users className="w-4 h-4 text-indigo-400" />
            <span>Badge Center</span>
          </button>
        </div>
      </div>

      {/* Attendance Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <StatCard
          title="Branch Staff"
          value={`${stats.total}`}
          subtitle="Assigned to branch"
          icon={Users}
          accentColor="blue"
          onClick={() => navigate('/supervisor/employees')}
        />
        <StatCard
          title="Present Today"
          value={`${stats.present}`}
          subtitle={`QR Scanned: ${stats.qrScanned}`}
          icon={UserCheck}
          accentColor="emerald"
        />
        <StatCard
          title="Late Today"
          value={`${stats.late}`}
          subtitle="Past 15m grace period"
          icon={Clock}
          accentColor="amber"
        />
        <StatCard
          title="Absent"
          value={`${stats.absent}`}
          subtitle="Unexcused / No logs"
          icon={AlertTriangle}
          accentColor="rose"
        />
        <StatCard
          title="Est. Payroll"
          value={formatCurrency(branchPayrollEst)}
          subtitle="Current semi-monthly"
          icon={Banknote}
          accentColor="indigo"
          onClick={() => navigate('/supervisor/payroll')}
        />
      </div>

      {/* 2-Column: Today's Attendance Roster + Live QR Scan Feed */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Today's Attendance Roster */}
        <div className="lg:col-span-8 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-400" />
                <span>Today's Branch Attendance Monitor ({todayStr})</span>
              </h3>
              <p className="text-xs text-slate-400">
                Live time-in and shift completion status for {myBranch?.name} staff.
              </p>
            </div>
            <button
              onClick={() => navigate('/supervisor/dtr')}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>View Full History →</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950/80 text-[11px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="py-3 px-3">Employee</th>
                  <th className="py-3 px-3">Time In</th>
                  <th className="py-3 px-3">Time Out</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Status</th>
                  <th className="py-3 px-3 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {branchEmployees.map((emp) => {
                  const todayLog = todayLogs.find((l) => l.employeeId === emp.id);

                  return (
                    <tr key={emp.id} className="hover:bg-slate-850/50 transition">
                      <td className="py-3 px-3">
                        <div className="font-bold text-white">{emp.name}</div>
                        <div className="font-mono text-[10px] text-slate-400">{emp.id}</div>
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {todayLog?.timeIn ? (
                          <span className="text-emerald-400 font-semibold">{formatTime(todayLog.timeIn)}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3 font-mono">
                        {todayLog?.timeOut ? (
                          <span className="text-indigo-300 font-semibold">{formatTime(todayLog.timeOut)}</span>
                        ) : (
                          <span className="text-slate-500">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        {todayLog ? (
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              todayLog.method === 'QR'
                                ? 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/30'
                                : 'bg-slate-800 text-slate-400'
                            }`}
                          >
                            <QrCode className="w-2.5 h-2.5" />
                            <span>{todayLog.method || 'MANUAL'}</span>
                          </span>
                        ) : (
                          <span className="text-slate-600">—</span>
                        )}
                      </td>
                      <td className="py-3 px-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(
                            todayLog?.status || 'Absent'
                          )}`}
                        >
                          {todayLog?.status || 'No Punch'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        {!todayLog?.timeIn ? (
                          <button
                            onClick={() => {
                              setSelectedEmpId(emp.id);
                              setPunchType('IN');
                              setPunchModalOpen(true);
                            }}
                            className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-lg text-[10px] font-semibold transition"
                          >
                            Clock In
                          </button>
                        ) : !todayLog?.timeOut ? (
                          <button
                            onClick={() => {
                              setSelectedEmpId(emp.id);
                              setPunchType('OUT');
                              setPunchModalOpen(true);
                            }}
                            className="px-2 py-1 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[10px] font-semibold transition"
                          >
                            Clock Out
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-500 font-mono">Shift Completed</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live Branch QR Telemetry Feed */}
        <div className="lg:col-span-4 rounded-2xl bg-slate-900/90 border border-slate-800 p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-400" />
                <span>Recent Branch Scans</span>
              </h3>
              <span className="text-[10px] font-mono text-emerald-400">Live</span>
            </div>

            <div className="divide-y divide-slate-800 rounded-xl border border-slate-800 bg-slate-950/60 overflow-hidden">
              {branchScanFeed.map((scan) => (
                <div key={scan.id} className="p-3 flex items-center justify-between text-xs">
                  <div>
                    <p className="font-bold text-white leading-tight">{scan.employeeName}</p>
                    <p className="text-[10px] text-slate-400 font-mono">{scan.employeeId}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        scan.action === 'TIME_IN'
                          ? 'bg-emerald-500/10 text-emerald-300'
                          : 'bg-blue-500/10 text-blue-300'
                      }`}
                    >
                      {scan.action === 'TIME_IN' ? 'Time In' : 'Time Out'}
                    </span>
                    <p className="font-mono text-[10px] text-slate-400 mt-0.5">{scan.time}</p>
                  </div>
                </div>
              ))}

              {branchScanFeed.length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  No QR scans recorded for your branch today yet.
                </div>
              )}
            </div>
          </div>

          <button
            onClick={() => navigate('/supervisor/scan')}
            className="w-full mt-4 flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition shadow-lg shadow-blue-600/30"
          >
            <QrCode className="w-4 h-4" />
            <span>Launch Live Scanner</span>
          </button>
        </div>
      </div>

      {/* Supervisor Manual Punch Modal */}
      {punchModalOpen && (
        <Modal
          isOpen={punchModalOpen}
          onClose={() => setPunchModalOpen(false)}
          title={`Manual Attendance Punch: ${punchType === 'IN' ? 'Time In' : 'Time Out'}`}
          subtitle={`Scoped to ${myBranch?.name}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleQuickPunch} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Select Branch Employee
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="mt-1 w-full bg-slate-950 border border-slate-700 text-sm text-white rounded-xl p-2.5 focus:ring-2 focus:ring-blue-500"
              >
                {branchEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id}) — {emp.position}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                Punch Action
              </label>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => setPunchType('IN')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    punchType === 'IN'
                      ? 'bg-emerald-600 text-white border-emerald-500 shadow-md shadow-emerald-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-700'
                  }`}
                >
                  Time In
                </button>
                <button
                  type="button"
                  onClick={() => setPunchType('OUT')}
                  className={`py-2 rounded-xl text-xs font-bold border transition ${
                    punchType === 'OUT'
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30'
                      : 'bg-slate-950 text-slate-400 border-slate-700'
                  }`}
                >
                  Time Out
                </button>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setPunchModalOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-semibold shadow-lg shadow-blue-600/30"
              >
                Confirm Punch
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SupervisorDashboard;

import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useClock } from '../../hooks/useClock';
import { useBranchScope } from '../../hooks/useBranchScope';
import Modal from '../../components/shared/Modal';
import { formatTime, formatDate, formatHours, getStatusBadge } from '../../utils/formatters';
import { useToast } from '../../components/shared/Toast';
import {
  Clock,
  Calendar,
  Filter,
  PlusCircle,
  Download,
  Search,
  CheckCircle2,
  AlertTriangle,
  Building2,
  Users,
  Trash2,
  QrCode,
  FileSpreadsheet,
} from 'lucide-react';

export const DTRModule = () => {
  const { role, user } = useAuth();
  const { branches, employees, attendanceLogs, addManualAttendance, deleteAttendanceLog } = useData();
  const { formattedTime, formattedDate } = useClock();
  const branchScope = useBranchScope();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isSupervisor = role === 'SUPERVISOR';
  const isEmployee = role === 'EMPLOYEE';

  // Filters
  const [selectedBranch, setSelectedBranch] = useState(isSuperAdmin ? 'ALL' : user?.branchId || 'BRANCH-001');
  const [selectedEmployee, setSelectedEmployee] = useState(isEmployee ? user?.employeeId || 'ALL' : 'ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [methodFilter, setMethodFilter] = useState('ALL'); // 'ALL' | 'QR' | 'MANUAL'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Manual Entry Modal
  const [manualModalOpen, setManualModalOpen] = useState(false);
  const [manualForm, setManualForm] = useState({
    employeeId: '',
    date: new Date().toISOString().split('T')[0],
    timeIn: '08:00',
    timeOut: '17:00',
    breakMinutes: 60,
    remarks: 'Manual Shift Entry',
    status: 'Present',
  });

  const availableEmployees = useMemo(() => {
    if (isSuperAdmin) {
      if (selectedBranch === 'ALL') return employees;
      return employees.filter((e) => e.branchId === selectedBranch);
    }
    if (isSupervisor) {
      return employees.filter((e) => e.branchId === user?.branchId);
    }
    return employees.filter((e) => e.id === user?.employeeId || e.userId === user?.id);
  }, [employees, isSuperAdmin, isSupervisor, selectedBranch, user]);

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return attendanceLogs.filter((log) => {
      // Branch scoping
      if (!isSuperAdmin) {
        if (log.branchId !== user?.branchId) return false;
      } else if (selectedBranch !== 'ALL') {
        if (log.branchId !== selectedBranch) return false;
      }

      // Employee scoping
      if (isEmployee) {
        const myEmpId = user?.employeeId || employees.find((e) => e.userId === user?.id)?.id;
        if (log.employeeId !== myEmpId) return false;
      } else if (selectedEmployee !== 'ALL') {
        if (log.employeeId !== selectedEmployee) return false;
      }

      // Status
      if (statusFilter !== 'ALL' && log.status !== statusFilter) return false;

      // Method (QR vs Manual)
      if (methodFilter !== 'ALL' && (log.method || 'MANUAL') !== methodFilter) return false;

      // Date range
      if (startDate && log.date < startDate) return false;
      if (endDate && log.date > endDate) return false;

      // Search Query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchEmp = log.employeeName?.toLowerCase().includes(q);
        const matchId = log.employeeId?.toLowerCase().includes(q);
        const matchRemarks = log.remarks?.toLowerCase().includes(q);
        if (!matchEmp && !matchId && !matchRemarks) return false;
      }

      return true;
    });
  }, [attendanceLogs, isSuperAdmin, isEmployee, selectedBranch, user, selectedEmployee, statusFilter, methodFilter, startDate, endDate, searchQuery, employees]);

  const metrics = useMemo(() => {
    let totalRegHours = 0;
    let totalOtHours = 0;
    let totalLateMinutes = 0;
    let presentCount = 0;
    let lateCount = 0;
    let qrCount = 0;

    filteredLogs.forEach((l) => {
      totalRegHours += Number(l.regularHours) || 0;
      totalOtHours += Number(l.overtimeHours) || 0;
      totalLateMinutes += Number(l.lateMinutes) || 0;
      if (l.status === 'Present') presentCount++;
      if (l.status === 'Late') lateCount++;
      if (l.method === 'QR') qrCount++;
    });

    return {
      totalLogs: filteredLogs.length,
      totalRegHours: totalRegHours.toFixed(1),
      totalOtHours: totalOtHours.toFixed(1),
      totalLateMinutes,
      presentCount,
      lateCount,
      qrCount,
    };
  }, [filteredLogs]);

  const handleManualSubmit = (e) => {
    e.preventDefault();
    if (!manualForm.employeeId) {
      alert('Please select an employee.');
      return;
    }

    const res = addManualAttendance(manualForm);
    if (res.success) {
      addToast({
        title: 'Manual DTR Entry Saved',
        message: `Added attendance record for ${manualForm.date}`,
        type: 'success',
      });
      setManualModalOpen(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['ID', 'Date', 'Employee ID', 'Employee Name', 'Branch', 'Time In', 'Time Out', 'Reg Hours', 'OT Hours', 'Late (min)', 'Method', 'Status', 'Remarks'];
    const rows = filteredLogs.map((l) => [
      l.id,
      l.date,
      l.employeeId,
      `"${l.employeeName || ''}"`,
      l.branchId,
      l.timeIn || '—',
      l.timeOut || '—',
      l.regularHours || 0,
      l.overtimeHours || 0,
      l.lateMinutes || 0,
      l.method || 'MANUAL',
      l.status,
      `"${l.remarks || ''}"`,
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `DTR_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({
      title: 'CSV Export Generated',
      message: 'Downloaded DTR attendance dataset.',
      type: 'info',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Daily Time Record
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isSuperAdmin ? 'Enterprise Scope (5 Branches)' : `Branch: ${user?.branchId || 'Personal'}`}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">Daily Time Record (DTR)</h1>
          <p className="text-xs text-slate-500">
            Attendance monitoring, QR badge tagging, 15m grace periods, and overtime calculations.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {isSupervisor && (
            <button
              onClick={() => navigate('/supervisor/scan')}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition"
            >
              <QrCode className="w-4 h-4" />
              <span>Scan QR</span>
            </button>
          )}

          {!isEmployee && (
            <button
              onClick={() => {
                setManualForm({
                  ...manualForm,
                  employeeId: availableEmployees[0]?.id || '',
                });
                setManualModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-sm transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Manual Entry</span>
            </button>
          )}

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 text-xs font-semibold shadow-sm transition"
          >
            <Download className="w-4 h-4 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Strip */}
      <div className="no-print grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Logs</p>
          <p className="text-xl font-bold text-slate-900 mt-1">{metrics.totalLogs}</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">QR Scanned</p>
          <p className="text-xl font-bold text-blue-600 mt-1">{metrics.qrCount}</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Reg Hours</p>
          <p className="text-xl font-bold text-slate-800 mt-1">{metrics.totalRegHours}h</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Overtime</p>
          <p className="text-xl font-bold text-amber-600 mt-1">{metrics.totalOtHours}h</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Present</p>
          <p className="text-xl font-bold text-emerald-600 mt-1">{metrics.presentCount}</p>
        </div>
        <div className="bg-white border border-slate-200/80 p-4 rounded-2xl shadow-sm">
          <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Grace Period</p>
          <p className="text-xl font-bold text-purple-600 mt-1">15 mins</p>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="no-print rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search employee..."
            className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        {/* Branch Filter (SUPER ADMIN ONLY) */}
        {isSuperAdmin && (
          <div>
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option value="ALL">All Branches (5)</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.id})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Method Filter (QR vs Manual) */}
        <div>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          >
            <option value="ALL">All Methods</option>
            <option value="QR">Recorded via QR</option>
            <option value="MANUAL">Manual / Kiosk</option>
          </select>
        </div>

        {/* Status Filter */}
        <div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          >
            <option value="ALL">All Statuses</option>
            <option value="Present">Present</option>
            <option value="Late">Late</option>
            <option value="Absent">Absent</option>
            <option value="On Leave">On Leave</option>
          </select>
        </div>

        {/* Start Date */}
        <div>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>

        {/* End Date */}
        <div>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
          />
        </div>
      </div>

      {/* DTR Records Table */}
      <div className="rounded-2xl bg-white border border-slate-200/80 shadow-sm overflow-hidden print-container">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Date</th>
                <th className="py-3.5 px-4">Employee</th>
                {isSuperAdmin && <th className="py-3.5 px-4">Branch</th>}
                <th className="py-3.5 px-4">Time In</th>
                <th className="py-3.5 px-4">Time Out</th>
                <th className="py-3.5 px-4">Reg Hours</th>
                <th className="py-3.5 px-4">OT</th>
                <th className="py-3.5 px-4">Late (mins)</th>
                <th className="py-3.5 px-4">Method</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Remarks</th>
                {!isEmployee && <th className="py-3.5 px-4 text-right no-print">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredLogs.map((log) => {
                const branchObj = branches.find((b) => b.id === log.branchId);

                return (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition">
                    <td className="py-3 px-4 font-semibold text-slate-900 whitespace-nowrap">
                      {formatDate(log.date)}
                    </td>

                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.employeeName}</div>
                      <div className="font-mono text-[10px] text-blue-600">{log.employeeId}</div>
                    </td>

                    {isSuperAdmin && (
                      <td className="py-3 px-4">
                        <span className="font-mono text-[11px] text-slate-600">{branchObj?.code || log.branchId}</span>
                      </td>
                    )}

                    <td className="py-3 px-4 font-mono font-medium text-emerald-600">
                      {formatTime(log.timeIn)}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-blue-600">
                      {formatTime(log.timeOut)}
                    </td>

                    <td className="py-3 px-4 font-mono text-slate-700">
                      {formatHours(log.regularHours)}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-amber-600">
                      {log.overtimeHours > 0 ? `+${log.overtimeHours}h` : '0.0h'}
                    </td>

                    <td className="py-3 px-4 font-mono font-medium text-rose-600">
                      {log.lateMinutes > 0 ? `${log.lateMinutes}m` : '0m'}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                          log.method === 'QR'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : 'bg-slate-100 text-slate-600 border-slate-200'
                        }`}
                      >
                        <QrCode className="w-2.5 h-2.5" />
                        <span>{log.method || 'MANUAL'}</span>
                      </span>
                    </td>

                    <td className="py-3 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-medium border ${getStatusBadge(log.status)}`}>
                        {log.status}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-slate-500 text-[11px] max-w-[140px] truncate">
                      {log.remarks || '—'}
                    </td>

                    {!isEmployee && (
                      <td className="py-3 px-4 text-right no-print">
                        <button
                          onClick={() => deleteAttendanceLog(log.id)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                          title="Delete Record"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filteredLogs.length === 0 && (
            <div className="p-8 text-center text-slate-400 text-xs">
              No DTR attendance records found for the active criteria.
            </div>
          )}
        </div>
      </div>

      {/* Manual Entry Modal */}
      {manualModalOpen && (
        <Modal
          isOpen={manualModalOpen}
          onClose={() => setManualModalOpen(false)}
          title="Manual Attendance Adjustment"
          subtitle="Directly log hours for an employee"
          maxWidth="max-w-md"
        >
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Employee *
              </label>
              <select
                value={manualForm.employeeId}
                onChange={(e) => setManualForm({ ...manualForm, employeeId: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                {availableEmployees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.id}) — {emp.branchId}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Date *
              </label>
              <input
                type="date"
                required
                value={manualForm.date}
                onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Time In
                </label>
                <input
                  type="time"
                  value={manualForm.timeIn}
                  onChange={(e) => setManualForm({ ...manualForm, timeIn: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Time Out
                </label>
                <input
                  type="time"
                  value={manualForm.timeOut}
                  onChange={(e) => setManualForm({ ...manualForm, timeOut: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Remarks / Reason
              </label>
              <input
                type="text"
                value={manualForm.remarks}
                onChange={(e) => setManualForm({ ...manualForm, remarks: e.target.value })}
                placeholder="e.g. Approved overtime / site adjustment"
                className="w-full bg-slate-50 border border-slate-200 text-sm text-slate-800 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setManualModalOpen(false)}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm transition"
              >
                Save Attendance Record
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default DTRModule;

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useBranchScope } from '../../hooks/useBranchScope';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import { formatDate, formatTime } from '../../utils/formatters';
import {
  Clock,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Plus,
  Filter,
  Search,
  Building2,
  User,
  FileText,
  Send,
  Trash2,
  Check,
  X,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';

const REASON_OPTIONS = [
  'Forgot to scan QR Badge',
  'QR Scanner / Kiosk Hardware Malfunction',
  'Official Business / Store Errand Offsite',
  'Kiosk Queue / Network Sync Latency',
  'Emergency / Medical Matter',
  'Other Missed Punch Discrepancy',
];

export const AttendanceCorrectionModule = () => {
  const { role, user } = useAuth();
  const {
    branches,
    employees,
    attendanceLogs,
    attendanceCorrections,
    submitAttendanceCorrection,
    approveAttendanceCorrection,
    rejectAttendanceCorrection,
    deleteAttendanceCorrection,
  } = useData();
  const branchScope = useBranchScope();
  const { addToast } = useToast();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isSupervisor = role === 'SUPERVISOR';
  const isEmployee = role === 'EMPLOYEE';
  const supervisorBranchId = user?.branchId;

  // Match current employee if employee role
  const currentEmployee = useMemo(() => {
    return employees.find((e) => e.userId === user?.id || e.id === user?.employeeId) || null;
  }, [employees, user]);

  // Filters
  const [selectedBranch, setSelectedBranch] = useState(isSuperAdmin ? 'ALL' : supervisorBranchId || 'BRANCH-001');
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'
  const [searchQuery, setSearchQuery] = useState('');

  // Submit Request Modal State
  const [requestModalOpen, setRequestModalOpen] = useState(false);
  const [requestForm, setRequestForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    requestType: 'BOTH', // 'TIME_IN' | 'TIME_OUT' | 'BOTH'
    requestedTimeIn: '08:00',
    requestedTimeOut: '17:00',
    reason: REASON_OPTIONS[0],
    remarks: '',
  });

  // Reject Modal State
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectTargetId, setRejectTargetId] = useState(null);
  const [rejectNote, setRejectNote] = useState('');

  // Scoped requests
  const filteredRequests = useMemo(() => {
    return attendanceCorrections.filter((req) => {
      // Role scoping
      if (isEmployee) {
        const myEmpId = currentEmployee?.id || user?.employeeId;
        if (req.employeeId !== myEmpId) return false;
      } else if (isSupervisor) {
        if (req.branchId !== supervisorBranchId) return false;
      } else if (isSuperAdmin && selectedBranch !== 'ALL') {
        if (req.branchId !== selectedBranch) return false;
      }

      // Status filter
      if (statusFilter !== 'ALL' && req.status !== statusFilter) return false;

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = req.employeeName?.toLowerCase().includes(q);
        const matchId = req.employeeId?.toLowerCase().includes(q);
        const matchReason = req.reason?.toLowerCase().includes(q);
        return matchName || matchId || matchReason;
      }

      return true;
    });
  }, [
    attendanceCorrections,
    isEmployee,
    isSupervisor,
    isSuperAdmin,
    currentEmployee,
    user,
    supervisorBranchId,
    selectedBranch,
    statusFilter,
    searchQuery,
  ]);

  // Metric counts
  const pendingCount = useMemo(() => {
    return attendanceCorrections.filter((r) => {
      if (isEmployee) return r.employeeId === (currentEmployee?.id || user?.employeeId) && r.status === 'PENDING';
      if (isSupervisor) return r.branchId === supervisorBranchId && r.status === 'PENDING';
      if (isSuperAdmin && selectedBranch !== 'ALL') return r.branchId === selectedBranch && r.status === 'PENDING';
      return r.status === 'PENDING';
    }).length;
  }, [attendanceCorrections, isEmployee, isSupervisor, isSuperAdmin, currentEmployee, user, supervisorBranchId, selectedBranch]);

  const approvedCount = useMemo(() => {
    return attendanceCorrections.filter((r) => r.status === 'APPROVED').length;
  }, [attendanceCorrections]);

  const rejectedCount = useMemo(() => {
    return attendanceCorrections.filter((r) => r.status === 'REJECTED').length;
  }, [attendanceCorrections]);

  // Submit request handler
  const handleSubmitRequest = (e) => {
    e.preventDefault();
    if (!currentEmployee && isEmployee) {
      addToast({ title: 'Error', message: 'Employee profile not associated with your account.', type: 'error' });
      return;
    }

    const empId = currentEmployee?.id || user?.employeeId || 'EMP-001';
    const empName = currentEmployee?.name || user?.name || 'Employee';
    const bId = currentEmployee?.branchId || user?.branchId || 'BRANCH-001';

    const res = submitAttendanceCorrection({
      employeeId: empId,
      employeeName: empName,
      branchId: bId,
      date: requestForm.date,
      requestType: requestForm.requestType,
      requestedTimeIn: requestForm.requestType !== 'TIME_OUT' ? requestForm.requestedTimeIn : null,
      requestedTimeOut: requestForm.requestType !== 'TIME_IN' ? requestForm.requestedTimeOut : null,
      reason: requestForm.reason,
      remarks: requestForm.remarks,
    });

    if (res.success) {
      addToast({ title: 'Request Submitted', message: res.message, type: 'success' });
      setRequestModalOpen(false);
      setRequestForm({
        date: new Date().toISOString().slice(0, 10),
        requestType: 'BOTH',
        requestedTimeIn: '08:00',
        requestedTimeOut: '17:00',
        reason: REASON_OPTIONS[0],
        remarks: '',
      });
    }
  };

  // Approve request handler
  const handleApprove = (reqId) => {
    const reviewerName = user?.name || (isSuperAdmin ? 'System Administrator' : 'Branch Supervisor');
    const res = approveAttendanceCorrection(reqId, reviewerName);
    if (res.success) {
      addToast({ title: 'Request Approved', message: res.message, type: 'success' });
    } else {
      addToast({ title: 'Error', message: res.message, type: 'error' });
    }
  };

  // Open Reject Modal
  const handleOpenReject = (reqId) => {
    setRejectTargetId(reqId);
    setRejectNote('');
    setRejectModalOpen(true);
  };

  // Confirm Reject
  const handleConfirmReject = (e) => {
    e.preventDefault();
    const reviewerName = user?.name || (isSuperAdmin ? 'System Administrator' : 'Branch Supervisor');
    const res = rejectAttendanceCorrection(rejectTargetId, reviewerName, rejectNote);
    if (res.success) {
      addToast({ title: 'Request Rejected', message: res.message, type: 'info' });
      setRejectModalOpen(false);
      setRejectTargetId(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
              Attendance Corrections & Approvals
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isSuperAdmin
                ? 'Enterprise Scope (5 Branches)'
                : isSupervisor
                  ? `Branch Scope: ${supervisorBranchId}`
                  : `Personal Portal: ${currentEmployee?.id || user?.username}`}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">
            {isEmployee ? 'My Attendance Correction Requests' : 'Attendance Correction Approvals'}
          </h1>
          <p className="text-xs text-slate-500">
            {isEmployee
              ? 'Request adjustments for missed QR scans, device hardware issues, or punch errors for supervisor review.'
              : 'Review and approve employee missed time-in and time-out correction requests with automated DTR updates.'}
          </p>
        </div>

        {/* Action Button */}
        {isEmployee && (
          <button
            onClick={() => setRequestModalOpen(true)}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 text-xs font-semibold shadow-sm shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Request Correction</span>
          </button>
        )}
      </div>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Pending Approvals</span>
            <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-amber-600">{pendingCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Awaiting supervisor or admin verification</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Approved Corrections</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-600">{approvedCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">DTR logs automatically updated and validated</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Rejected Requests</span>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-rose-600">{rejectedCount}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Declined with feedback explanation</p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setStatusFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'ALL' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            All Requests ({attendanceCorrections.length})
          </button>
          <button
            onClick={() => setStatusFilter('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1 ${statusFilter === 'PENDING' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            <span>Pending</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-100 text-amber-800 font-bold">
                {pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setStatusFilter('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'APPROVED' ? 'bg-white text-emerald-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Approved
          </button>
          <button
            onClick={() => setStatusFilter('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${statusFilter === 'REJECTED' ? 'bg-white text-rose-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Rejected
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter for Admin */}
          {isSuperAdmin && (
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="text-xs rounded-xl border border-slate-200 bg-white px-3 py-2 font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">All Branches ({branches.length})</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          )}

          {/* Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search request or staff..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* Requests Table / List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900">
            {isEmployee ? 'My Submitted Correction Requests' : 'Requests Queue for Review'}
          </h2>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
            {filteredRequests.length} Record(s)
          </span>
        </div>

        {filteredRequests.length === 0 ? (
          <div className="p-12 text-center">
            <Clock className="w-12 h-12 mx-auto text-slate-300 mb-3" />
            <p className="text-sm font-bold text-slate-700">No attendance correction requests</p>
            <p className="text-xs text-slate-400 mt-1">
              {isEmployee
                ? 'Click "Request Correction" to submit missed time-in or time-out punch details.'
                : 'All employee attendance logs are currently up to date.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4 min-w-[180px]">Employee Details</th>
                  <th className="py-3 px-3 min-w-[110px]">Target Date</th>
                  <th className="py-3 px-3 min-w-[160px]">Requested Punches</th>
                  <th className="py-3 px-3 min-w-[180px]">Reason & Remarks</th>
                  <th className="py-3 px-3 min-w-[110px]">Status</th>
                  <th className="py-3 px-3 min-w-[140px]">Reviewer Info</th>
                  <th className="py-3 px-4 text-right min-w-[120px]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredRequests.map((req) => {
                  const branchObj = branches.find((b) => b.id === req.branchId);

                  return (
                    <tr key={req.id} className="hover:bg-slate-50/50 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{req.employeeName}</div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {req.employeeId} • {branchObj?.name?.replace(' Branch', '') || req.branchId}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-bold text-slate-800">{formatDate(req.date)}</div>
                        <div className="text-[10px] text-slate-400">
                          Sub: {req.createdAt ? new Date(req.createdAt).toLocaleDateString() : 'N/A'}
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono">
                        <div className="flex flex-col gap-0.5">
                          {req.requestedTimeIn && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              <span className="font-bold">IN:</span> {req.requestedTimeIn}
                            </span>
                          )}
                          {req.requestedTimeOut && (
                            <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              <span className="font-bold">OUT:</span> {req.requestedTimeOut}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <div className="font-semibold text-slate-800">{req.reason}</div>
                        {req.remarks && (
                          <div className="text-[11px] text-slate-500 italic mt-0.5 line-clamp-2">
                            "{req.remarks}"
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3">
                        {req.status === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-300">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            Pending Approval
                          </span>
                        )}
                        {req.status === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3" />
                            Approved
                          </span>
                        )}
                        {req.status === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-300">
                            <XCircle className="w-3 h-3" />
                            Rejected
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-[11px]">
                        {req.reviewedBy ? (
                          <div>
                            <span className="font-semibold text-slate-700">{req.reviewedBy}</span>
                            {req.reviewNote && (
                              <p className="text-[10px] text-rose-600 mt-0.5 italic">"{req.reviewNote}"</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Pending review</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {/* Approver Actions */}
                        {!isEmployee && req.status === 'PENDING' && (
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => handleApprove(req.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] shadow-xs transition"
                              title="Approve & Apply to DTR"
                            >
                              <Check className="w-3 h-3" />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleOpenReject(req.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 font-semibold text-[11px] border border-rose-200 transition"
                              title="Reject Request"
                            >
                              <X className="w-3 h-3" />
                              <span>Reject</span>
                            </button>
                          </div>
                        )}

                        {/* Employee cancel action */}
                        {isEmployee && req.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Cancel this pending correction request?')) {
                                deleteAttendanceCorrection(req.id);
                                addToast({ title: 'Cancelled', message: 'Request cancelled.', type: 'info' });
                              }
                            }}
                            className="text-xs text-rose-500 hover:text-rose-700 font-medium"
                          >
                            Cancel
                          </button>
                        )}

                        {/* Completed actions view / cleanup */}
                        {(isSuperAdmin || isSupervisor) && req.status !== 'PENDING' && (
                          <button
                            onClick={() => {
                              if (window.confirm('Remove this archive record?')) {
                                deleteAttendanceCorrection(req.id);
                                addToast({ title: 'Removed', message: 'Record removed.', type: 'info' });
                              }
                            }}
                            className="text-xs text-slate-400 hover:text-rose-600"
                            title="Delete Record"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: SUBMIT ATTENDANCE CORRECTION (EMPLOYEE)
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={requestModalOpen}
        onClose={() => setRequestModalOpen(false)}
        title="Request Attendance Correction"
      >
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-800 leading-relaxed">
            Submit your missed punch times for supervisor review. Once approved, your Daily Time Record (DTR) and regular working hours will be automatically recalculated.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Target Date of Missed Punch *</label>
            <input
              type="date"
              value={requestForm.date}
              max={new Date().toISOString().slice(0, 10)}
              onChange={(e) => setRequestForm({ ...requestForm, date: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Correction Type</label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setRequestForm({ ...requestForm, requestType: 'TIME_IN' })}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${requestForm.requestType === 'TIME_IN'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
              >
                Missed Time In
              </button>
              <button
                type="button"
                onClick={() => setRequestForm({ ...requestForm, requestType: 'TIME_OUT' })}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${requestForm.requestType === 'TIME_OUT'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
              >
                Missed Time Out
              </button>
              <button
                type="button"
                onClick={() => setRequestForm({ ...requestForm, requestType: 'BOTH' })}
                className={`py-2 px-2 text-xs font-bold rounded-xl border transition ${requestForm.requestType === 'BOTH'
                  ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                  : 'bg-slate-50 text-slate-700 border-slate-200'
                  }`}
              >
                Both In & Out
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {requestForm.requestType !== 'TIME_OUT' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Time In *</label>
                <input
                  type="time"
                  value={requestForm.requestedTimeIn}
                  onChange={(e) => setRequestForm({ ...requestForm, requestedTimeIn: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
            )}
            {requestForm.requestType !== 'TIME_IN' && (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Requested Time Out *</label>
                <input
                  type="time"
                  value={requestForm.requestedTimeOut}
                  onChange={(e) => setRequestForm({ ...requestForm, requestedTimeOut: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  required
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Reason *</label>
            <select
              value={requestForm.reason}
              onChange={(e) => setRequestForm({ ...requestForm, reason: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {REASON_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Detailed Explanation / Notes</label>
            <textarea
              rows={3}
              placeholder="State the circumstances for the missed scan (e.g. Assigned to emergency receiving dock, scanner camera timed out)..."
              value={requestForm.remarks}
              onChange={(e) => setRequestForm({ ...requestForm, remarks: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRequestModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              Submit Request
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: REJECT CORRECTION (SUPERVISOR / ADMIN)
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={rejectModalOpen}
        onClose={() => setRejectModalOpen(false)}
        title="Reject Correction Request"
      >
        <form onSubmit={handleConfirmReject} className="space-y-4">
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 leading-relaxed flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Please state the reason for rejecting this attendance correction request.</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Rejection Feedback / Note *</label>
            <textarea
              rows={3}
              placeholder="e.g. Unverified punch; security logs show arrival was at 09:30 AM."
              value={rejectNote}
              onChange={(e) => setRejectNote(e.target.value)}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-rose-500"
              required
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
            >
              Confirm Rejection
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default AttendanceCorrectionModule;

import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useBranchScope } from '../../hooks/useBranchScope';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import {
  Calendar,
  Clock,
  Users,
  Plus,
  Filter,
  Search,
  CheckCircle2,
  CalendarDays,
  Coffee,
  Building2,
  Edit2,
  Trash2,
  FileSpreadsheet,
  Sun,
  Moon,
  Sunset,
  Sunrise,
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'Monday', label: 'Mon' },
  { key: 'Tuesday', label: 'Tue' },
  { key: 'Wednesday', label: 'Wed' },
  { key: 'Thursday', label: 'Thu' },
  { key: 'Friday', label: 'Fri' },
  { key: 'Saturday', label: 'Sat' },
  { key: 'Sunday', label: 'Sun' },
];

export const ShiftScheduling = () => {
  const { role, user } = useAuth();
  const {
    branches,
    employees,
    shiftTemplates,
    schedules,
    saveShiftTemplate,
    deleteShiftTemplate,
    assignEmployeeSchedule,
    deleteEmployeeSchedule,
    getEmployeeSchedule,
  } = useData();
  const branchScope = useBranchScope();
  const { addToast } = useToast();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isSupervisor = role === 'SUPERVISOR';
  const supervisorBranchId = user?.branchId;

  const [activeTab, setActiveTab] = useState('ROSTER'); // 'ROSTER' | 'SHIFTS'
  const [selectedBranch, setSelectedBranch] = useState(isSuperAdmin ? 'ALL' : supervisorBranchId || 'BRANCH-001');
  const [searchQuery, setSearchQuery] = useState('');

  // Assign Schedule Modal
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [assignForm, setAssignForm] = useState({
    employeeId: '',
    shiftId: 'SHIFT-REGULAR',
    restDays: ['Sunday'],
    notes: 'Standard store schedule',
  });

  // Shift Template Modal
  const [shiftModalOpen, setShiftModalOpen] = useState(false);
  const [shiftForm, setShiftForm] = useState({
    id: '',
    name: '',
    code: '',
    startTime: '08:00',
    endTime: '17:00',
    breakMinutes: 60,
    gracePeriodMinutes: 15,
    description: '',
    color: 'blue',
  });

  // Available employees based on role
  const availableEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!isSuperAdmin && emp.branchId !== supervisorBranchId) return false;
      if (isSuperAdmin && selectedBranch !== 'ALL' && emp.branchId !== selectedBranch) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name?.toLowerCase().includes(q);
        const matchId = emp.id?.toLowerCase().includes(q);
        const matchPos = emp.position?.toLowerCase().includes(q);
        return matchName || matchId || matchPos;
      }
      return true;
    });
  }, [employees, isSuperAdmin, supervisorBranchId, selectedBranch, searchQuery]);

  // Handle open assign modal
  const handleOpenAssign = (emp) => {
    const existing = getEmployeeSchedule(emp.id);
    setAssignForm({
      employeeId: emp.id,
      shiftId: existing.shiftId || 'SHIFT-REGULAR',
      restDays: Array.isArray(existing.restDays) ? existing.restDays : ['Sunday'],
      notes: existing.notes || '',
    });
    setAssignModalOpen(true);
  };

  // Toggle rest day checkbox in assign modal
  const toggleRestDay = (day) => {
    setAssignForm((prev) => {
      const exists = prev.restDays.includes(day);
      const nextDays = exists
        ? prev.restDays.filter((d) => d !== day)
        : [...prev.restDays, day];
      return { ...prev, restDays: nextDays };
    });
  };

  // Save Schedule Assignment
  const handleSaveAssignment = (e) => {
    e.preventDefault();
    if (!assignForm.employeeId) {
      addToast({ title: 'Error', message: 'Please select an employee.', type: 'error' });
      return;
    }
    const template = shiftTemplates.find((s) => s.id === assignForm.shiftId) || shiftTemplates[0];

    const res = assignEmployeeSchedule({
      employeeId: assignForm.employeeId,
      shiftId: template.id,
      shiftName: template.name,
      startTime: template.startTime,
      endTime: template.endTime,
      breakMinutes: template.breakMinutes || 60,
      gracePeriodMinutes: template.gracePeriodMinutes || 15,
      restDays: assignForm.restDays,
      notes: assignForm.notes,
    });

    if (res.success) {
      addToast({ title: 'Schedule Saved', message: res.message, type: 'success' });
      setAssignModalOpen(false);
    }
  };

  // Save Shift Template
  const handleSaveShiftTemplate = (e) => {
    e.preventDefault();
    if (!shiftForm.name.trim() || !shiftForm.startTime || !shiftForm.endTime) {
      addToast({ title: 'Validation Error', message: 'Name, Start Time, and End Time are required.', type: 'error' });
      return;
    }

    const shiftId = shiftForm.id || `SHIFT-${Date.now()}`;
    const res = saveShiftTemplate({
      ...shiftForm,
      id: shiftId,
      code: shiftForm.code || shiftForm.name.slice(0, 3).toUpperCase(),
    });

    if (res.success) {
      addToast({ title: 'Shift Saved', message: res.message, type: 'success' });
      setShiftModalOpen(false);
    }
  };

  // Export Roster to CSV
  const exportRosterCSV = () => {
    const headers = ['Employee ID', 'Employee Name', 'Branch', 'Position', 'Shift Assigned', 'Shift Hours', 'Rest Days', 'Notes'];
    const rows = availableEmployees.map((emp) => {
      const sched = getEmployeeSchedule(emp.id);
      const branchObj = branches.find((b) => b.id === emp.branchId);
      return [
        `"${emp.id}"`,
        `"${emp.name}"`,
        `"${branchObj?.name || emp.branchId}"`,
        `"${emp.position || 'Staff'}"`,
        `"${sched.shiftName}"`,
        `"${sched.startTime} - ${sched.endTime}"`,
        `"${(sched.restDays || []).join(', ')}"`,
        `"${sched.notes || ''}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `RedMart_Shift_Roster_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    addToast({ title: 'CSV Exported', message: 'Shift schedule roster exported successfully.', type: 'success' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Shift Scheduling & Rest Days
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isSuperAdmin ? 'Enterprise Consolidated (5 Branches)' : `Branch Scope: ${supervisorBranchId}`}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">Work Schedule & Shift Management</h1>
          <p className="text-xs text-slate-500">
            Assign work schedules, shifts & rest days to employees across branches for streamlined timekeeping.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportRosterCSV}
            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-3.5 py-2 text-xs font-semibold shadow-xs transition"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Export Roster CSV</span>
          </button>
          <button
            onClick={() => {
              setShiftForm({
                id: '',
                name: '',
                code: '',
                startTime: '08:00',
                endTime: '17:00',
                breakMinutes: 60,
                gracePeriodMinutes: 15,
                description: '',
                color: 'blue',
              });
              setShiftModalOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 text-xs font-semibold shadow-sm shadow-blue-600/20 transition"
          >
            <Plus className="w-4 h-4" />
            <span>New Shift Preset</span>
          </button>
        </div>
      </div>

      {/* Top Stats Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total Scheduled Staff</span>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{availableEmployees.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Active personnel in schedule scope</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Shift Templates</span>
            <div className="p-2 bg-purple-50 text-purple-600 rounded-xl">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">{shiftTemplates.length}</div>
          <p className="text-[11px] text-slate-400 mt-0.5">Morning, Day, Mid, Closing, Night presets</p>
        </div>

        <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Branches Covered</span>
            <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
              <Building2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2 text-2xl font-black text-slate-900">
            {isSuperAdmin ? `${branches.length} Branches` : '1 Branch (Isolated)'}
          </div>
          <p className="text-[11px] text-slate-400 mt-0.5">Centralized work shift assignment</p>
        </div>
      </div>

      {/* Tab Switcher & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200/80 shadow-xs">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl">
          <button
            onClick={() => setActiveTab('ROSTER')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'ROSTER' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Weekly Schedule Roster
          </button>
          <button
            onClick={() => setActiveTab('SHIFTS')}
            className={`px-4 py-2 rounded-lg text-xs font-bold transition ${activeTab === 'SHIFTS' ? 'bg-white text-blue-600 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
          >
            Shift Presets ({shiftTemplates.length})
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch Filter for Super Admin */}
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

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search staff, ID, position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: WEEKLY SCHEDULE ROSTER MATRIX
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'ROSTER' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-200/80 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Weekly Schedule Roster Matrix</h2>
              <p className="text-xs text-slate-500">
                Live timetable mapping each employee's working shifts and designated rest days (Monday – Sunday).
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">
              {availableEmployees.length} Personnel
            </span>
          </div>

          {availableEmployees.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="w-12 h-12 mx-auto text-slate-300 mb-3" />
              <p className="text-sm font-bold text-slate-700">No employees found in this scope</p>
              <p className="text-xs text-slate-400 mt-1">Add employees to assign work schedules and rest days.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 min-w-[200px]">Employee & Role</th>
                    <th className="py-3 px-3 min-w-[130px]">Branch</th>
                    <th className="py-3 px-3 min-w-[140px]">Assigned Shift</th>
                    {DAYS_OF_WEEK.map((d) => (
                      <th key={d.key} className="py-3 px-2 text-center min-w-[85px]">
                        {d.label}
                      </th>
                    ))}
                    <th className="py-3 px-3 text-right min-w-[100px]">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {availableEmployees.map((emp) => {
                    const sched = getEmployeeSchedule(emp.id);
                    const branchObj = branches.find((b) => b.id === emp.branchId);
                    const restDays = sched.restDays || ['Sunday'];

                    return (
                      <tr key={emp.id} className="hover:bg-slate-50/50 transition">
                        <td className="py-3 px-4">
                          <div className="font-bold text-slate-900">{emp.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            {emp.id} • {emp.position || 'Staff'}
                          </div>
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="inline-flex items-center gap-1 font-medium text-slate-700">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {branchObj?.name?.replace(' Branch', '') || emp.branchId}
                          </span>
                        </td>
                        <td className="py-3 px-3">
                          <div className="font-semibold text-blue-700 bg-blue-50/80 border border-blue-200/60 rounded-lg px-2 py-1 inline-block">
                            {sched.shiftName}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            {sched.startTime} – {sched.endTime}
                          </div>
                        </td>

                        {/* 7 Days Matrix Columns */}
                        {DAYS_OF_WEEK.map((d) => {
                          const isRest = restDays.includes(d.key);
                          return (
                            <td key={d.key} className="py-2.5 px-2 text-center">
                              {isRest ? (
                                <span className="inline-block px-2 py-1 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                  REST DAY
                                </span>
                              ) : (
                                <span className="inline-block px-1.5 py-1 rounded-md text-[10px] font-mono font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {sched.startTime}
                                </span>
                              )}
                            </td>
                          );
                        })}

                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleOpenAssign(emp)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 font-semibold text-xs transition"
                          >
                            <Edit2 className="w-3 h-3" />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: SHIFT TEMPLATES / PRESETS
         ───────────────────────────────────────────────────────────── */}
      {activeTab === 'SHIFTS' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {shiftTemplates.map((shift) => (
              <div
                key={shift.id}
                className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs flex flex-col justify-between hover:shadow-md transition"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200 font-mono">
                      {shift.code || 'SHIFT'}
                    </span>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                      <Clock className="w-3.5 h-3.5 text-blue-500" />
                      <span>{shift.gracePeriodMinutes || 15}m Grace Period</span>
                    </div>
                  </div>

                  <h3 className="text-base font-bold text-slate-900">{shift.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{shift.description || 'Standard work shift definition.'}</p>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between font-mono">
                      <span className="text-slate-500 font-sans">Working Hours:</span>
                      <span className="font-bold text-slate-800">
                        {shift.startTime} – {shift.endTime} (8 hrs)
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Meal / Lunch Break:</span>
                      <span className="font-semibold text-slate-700">{shift.breakMinutes || 60} mins</span>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">Reusable across 5 branches</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => {
                        setShiftForm(shift);
                        setShiftModalOpen(true);
                      }}
                      className="text-xs font-semibold text-blue-600 hover:text-blue-800 px-2 py-1"
                    >
                      Edit
                    </button>
                    {shiftTemplates.length > 1 && (
                      <button
                        onClick={() => {
                          if (window.confirm(`Delete shift "${shift.name}"?`)) {
                            deleteShiftTemplate(shift.id);
                            addToast({ title: 'Shift Deleted', message: 'Shift template removed.', type: 'info' });
                          }
                        }}
                        className="text-xs font-semibold text-rose-500 hover:text-rose-700 px-2 py-1"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ASSIGN SCHEDULE & REST DAYS
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        title="Assign Work Schedule & Rest Days"
      >
        <form onSubmit={handleSaveAssignment} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Select Employee</label>
            <select
              value={assignForm.employeeId}
              onChange={(e) => setAssignForm({ ...assignForm, employeeId: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              <option value="">-- Choose Employee --</option>
              {availableEmployees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.id}) • {emp.position}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Work Shift Preset</label>
            <select
              value={assignForm.shiftId}
              onChange={(e) => setAssignForm({ ...assignForm, shiftId: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 font-semibold"
            >
              {shiftTemplates.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.startTime} - {s.endTime}, {s.gracePeriodMinutes || 15}m grace)
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Designated Rest Days (Select Days Off)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {DAYS_OF_WEEK.map((d) => {
                const isSelected = assignForm.restDays.includes(d.key);
                return (
                  <button
                    key={d.key}
                    type="button"
                    onClick={() => toggleRestDay(d.key)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border text-center transition ${isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                  >
                    {d.key}
                    {isSelected && <span className="block text-[10px] font-normal opacity-90">REST DAY</span>}
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-slate-400 mt-1.5">
              Employees not punching on their rest days will not be penalized for absence.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Schedule Notes / Instructions</label>
            <input
              type="text"
              placeholder="e.g. Assigned to Front Register / Inventory replenishment"
              value={assignForm.notes}
              onChange={(e) => setAssignForm({ ...assignForm, notes: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setAssignModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              Save Schedule
            </button>
          </div>
        </form>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD / EDIT SHIFT PRESET
         ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={shiftModalOpen}
        onClose={() => setShiftModalOpen(false)}
        title={shiftForm.id ? 'Edit Shift Preset' : 'Create New Shift Preset'}
      >
        <form onSubmit={handleSaveShiftTemplate} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Name *</label>
              <input
                type="text"
                placeholder="e.g. Morning Shift"
                value={shiftForm.name}
                onChange={(e) => setShiftForm({ ...shiftForm, name: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Shift Code</label>
              <input
                type="text"
                placeholder="e.g. MS, DS, CS"
                value={shiftForm.code}
                onChange={(e) => setShiftForm({ ...shiftForm, code: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Time *</label>
              <input
                type="time"
                value={shiftForm.startTime}
                onChange={(e) => setShiftForm({ ...shiftForm, startTime: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">End Time *</label>
              <input
                type="time"
                value={shiftForm.endTime}
                onChange={(e) => setShiftForm({ ...shiftForm, endTime: e.target.value })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Grace Period (Minutes)</label>
              <input
                type="number"
                min="0"
                max="60"
                value={shiftForm.gracePeriodMinutes}
                onChange={(e) => setShiftForm({ ...shiftForm, gracePeriodMinutes: Number(e.target.value) || 0 })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lunch Break (Minutes)</label>
              <input
                type="number"
                min="0"
                max="120"
                value={shiftForm.breakMinutes}
                onChange={(e) => setShiftForm({ ...shiftForm, breakMinutes: Number(e.target.value) || 0 })}
                className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
            <input
              type="text"
              placeholder="e.g. Primary opening store shift for cashiers and inventory"
              value={shiftForm.description}
              onChange={(e) => setShiftForm({ ...shiftForm, description: e.target.value })}
              className="w-full text-xs rounded-xl border border-slate-200 p-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShiftModalOpen(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white shadow-xs"
            >
              Save Shift
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ShiftScheduling;

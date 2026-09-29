import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Modal from '../../components/shared/Modal';
import { formatCurrency, getStatusBadge } from '../../utils/formatters';
import { useToast } from '../../components/shared/Toast';
import {
  Building2,
  Users,
  MapPin,
  Mail,
  Phone,
  Plus,
  Trash2,
  Pencil,
  AlertTriangle,
} from 'lucide-react';

export const BranchManagement = () => {
  const {
    branches,
    users,
    employees,
    attendanceLogs,
    reassignSupervisorToBranch,
    addBranch,
    updateBranch,
    deleteBranch,
  } = useData();
  const { addToast } = useToast();

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [reassignModalBranch, setReassignModalBranch] = useState(null);
  const [newSupervisorId, setNewSupervisorId] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Add Branch state
  const [isAddBranchModalOpen, setIsAddBranchModalOpen] = useState(false);
  const [addBranchForm, setAddBranchForm] = useState({
    name: '',
    location: '',
    contactNumber: '',
    email: '',
  });
  const [addBranchError, setAddBranchError] = useState('');

  // Edit Branch state
  const [editBranchModal, setEditBranchModal] = useState(null);
  const [editBranchForm, setEditBranchForm] = useState({
    name: '',
    location: '',
    contactNumber: '',
    email: '',
    status: 'Active',
  });
  const [editBranchError, setEditBranchError] = useState('');

  // Delete Branch state
  const [deleteConfirmBranch, setDeleteConfirmBranch] = useState(null);

  const supervisors = users.filter((u) => u.role === 'SUPERVISOR');
  const todayStr = new Date().toISOString().split('T')[0];

  const handleOpenReassign = (branch) => {
    setReassignModalBranch(branch);
    setNewSupervisorId(branch.supervisorId ? String(branch.supervisorId) : '');
    setErrorMsg('');
  };

  const handleSaveReassignment = (e) => {
    e.preventDefault();
    if (!newSupervisorId) {
      setErrorMsg('Please select a supervisor to assign.');
      return;
    }

    const res = reassignSupervisorToBranch(Number(newSupervisorId), reassignModalBranch.id);
    if (res.success) {
      addToast({
        title: 'Supervisor Assigned',
        message: `Branch ${reassignModalBranch.name} updated successfully.`,
        type: 'success',
      });
      setReassignModalBranch(null);
    } else {
      setErrorMsg(res.message);
    }
  };

  const handleCreateBranch = (e) => {
    e.preventDefault();
    if (!addBranchForm.name.trim()) {
      setAddBranchError('Branch name is required.');
      return;
    }

    const res = addBranch(addBranchForm);
    if (res.success) {
      addToast({
        title: 'Branch Created',
        message: `Branch "${res.branch.name}" (${res.branch.id}) was created successfully.`,
        type: 'success',
      });
      setIsAddBranchModalOpen(false);
      setAddBranchForm({ name: '', location: '', contactNumber: '', email: '' });
      setAddBranchError('');
    } else {
      setAddBranchError(res.message || 'Failed to create branch.');
    }
  };

  const handleOpenEditBranch = (branch) => {
    setEditBranchModal(branch);
    setEditBranchForm({
      name: branch.name || '',
      location: branch.location || '',
      contactNumber: branch.contactNumber || '',
      email: branch.email || '',
      status: branch.status || 'Active',
    });
    setEditBranchError('');
  };

  const handleSaveEditBranch = (e) => {
    e.preventDefault();
    if (!editBranchForm.name.trim()) {
      setEditBranchError('Branch name is required.');
      return;
    }

    const res = updateBranch(editBranchModal.id, {
      name: editBranchForm.name.trim(),
      location: editBranchForm.location.trim(),
      contactNumber: editBranchForm.contactNumber.trim(),
      email: editBranchForm.email.trim(),
      status: editBranchForm.status,
    });

    if (res.success) {
      addToast({
        title: 'Branch Updated',
        message: `Branch "${editBranchForm.name}" updated successfully.`,
        type: 'success',
      });
      setEditBranchModal(null);
      setEditBranchError('');
    } else {
      setEditBranchError(res.message || 'Failed to update branch.');
    }
  };

  const handleDeleteBranchConfirm = () => {
    if (!deleteConfirmBranch) return;
    const res = deleteBranch(deleteConfirmBranch.id);
    if (res.success) {
      addToast({
        title: 'Branch Deleted',
        message: `Branch "${deleteConfirmBranch.name}" has been removed.`,
        type: 'success',
      });
      setDeleteConfirmBranch(null);
    } else {
      addToast({
        title: 'Cannot Delete Branch',
        message: res.message,
        type: 'error',
      });
      setDeleteConfirmBranch(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
              Governance Matrix
            </span>
            <span className="text-xs text-slate-500 font-medium">Multi-Branch Management</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Branch Management
          </h1>
          <p className="text-xs text-slate-500">
            Enterprise multi-site administration and supervisor alignment. Add, edit, or remove branches.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 border border-blue-200 px-3 py-2 rounded-xl">
            {branches.length} Branch{branches.length !== 1 ? 'es' : ''} Configured
          </span>
          <button
            onClick={() => {
              setAddBranchError('');
              setIsAddBranchModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            <Plus className="w-4 h-4" />
            <span>Add Branch</span>
          </button>
        </div>
      </div>

      {/* Branches Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {branches.map((branch) => {
          const supervisor = users.find((u) => u.id === branch.supervisorId && u.role === 'SUPERVISOR');
          const branchEmployees = employees.filter((e) => e.branchId === branch.id);
          const branchLogsToday = attendanceLogs.filter(
            (l) => l.branchId === branch.id && l.date === todayStr
          );
          const presentCount = branchLogsToday.filter((l) => l.status === 'Present' || l.status === 'Late').length;

          return (
            <div
              key={branch.id}
              className="rounded-3xl bg-white border border-slate-200/90 p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                      <Building2 className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-mono text-xs font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                        {branch.id}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-1">{branch.name}</h3>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      branch.status === 'Active'
                        ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                        : 'text-slate-600 bg-slate-100 border-slate-200'
                    }`}>
                      {branch.status}
                    </span>
                    <button
                      onClick={() => handleOpenEditBranch(branch)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition"
                      title="Edit Branch"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmBranch(branch)}
                      className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                      title="Remove Branch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Info rows */}
                <div className="mt-4 space-y-2 text-xs text-slate-600 border-t border-slate-100 pt-3">
                  <div className="flex items-start gap-2">
                    <MapPin className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <span className="text-slate-600 line-clamp-2">{branch.location || 'No location set'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                    <span className="text-slate-600">{branch.email || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="text-slate-600">{branch.contactNumber || 'N/A'}</span>
                  </div>
                </div>

                {/* Supervisor Block */}
                <div className="mt-4 p-3 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-bold uppercase tracking-wider text-slate-500">
                      Assigned Supervisor
                    </span>
                  </div>

                  {supervisor ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="h-7 w-7 rounded-xl overflow-hidden bg-blue-100 text-blue-800 font-bold text-xs flex items-center justify-center">
                          {supervisor.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-900">{supervisor.name}</p>
                          <p className="text-[10px] text-slate-500">@{supervisor.username}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleOpenReassign(branch)}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-700 bg-white border border-slate-200 px-2.5 py-1 rounded-xl shadow-sm transition"
                      >
                        Reassign
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-amber-700 text-xs">
                      <div className="flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        <span>No Supervisor Assigned</span>
                      </div>
                      <button
                        onClick={() => handleOpenReassign(branch)}
                        className="text-[11px] font-bold text-amber-800 bg-amber-100 px-2.5 py-1 rounded-xl hover:bg-amber-200 transition"
                      >
                        Assign
                      </button>
                    </div>
                  )}
                </div>

                {/* Stats badge row */}
                <div className="mt-4 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Headcount</p>
                    <p className="text-sm font-black text-slate-900 mt-0.5">{branchEmployees.length} Staff</p>
                  </div>
                  <div className="bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                    <p className="text-[10px] text-slate-500 uppercase font-bold">Present Today</p>
                    <p className="text-sm font-black text-emerald-600 mt-0.5">
                      {presentCount} / {branchEmployees.length}
                    </p>
                  </div>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="mt-5 pt-3 border-t border-slate-100">
                <button
                  onClick={() => setSelectedBranch(branch)}
                  className="w-full flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 py-2.5 text-xs font-bold transition"
                >
                  <Users className="w-3.5 h-3.5 text-blue-600" />
                  <span>Inspect Branch Staff Roster</span>
                </button>
              </div>
            </div>
          );
        })}

        {/* Add New Branch Card Placeholder */}
        <button
          onClick={() => {
            setAddBranchError('');
            setIsAddBranchModalOpen(true);
          }}
          className="rounded-3xl border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/30 p-8 flex flex-col items-center justify-center text-center transition group min-h-[300px]"
        >
          <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 text-blue-600 flex items-center justify-center shadow-sm group-hover:scale-110 transition">
            <Plus className="w-6 h-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
            Add New Branch
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-[200px]">
            Expand enterprise coverage by creating a new operational site.
          </p>
        </button>
      </div>

      {/* Add Branch Modal */}
      {isAddBranchModalOpen && (
        <Modal
          isOpen={isAddBranchModalOpen}
          onClose={() => setIsAddBranchModalOpen(false)}
          title="Add New Branch"
          subtitle="Create a new location for employee attendance & supervisor management."
          maxWidth="max-w-md"
        >
          <form onSubmit={handleCreateBranch} className="space-y-4">
            {addBranchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{addBranchError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Branch Name *
              </label>
              <input
                type="text"
                placeholder="e.g. BGC Corporate Hub"
                value={addBranchForm.name}
                onChange={(e) => setAddBranchForm({ ...addBranchForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Location Address
              </label>
              <input
                type="text"
                placeholder="e.g. 5th Ave, Bonifacio Global City, Taguig"
                value={addBranchForm.location}
                onChange={(e) => setAddBranchForm({ ...addBranchForm, location: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. (02) 8888-0000"
                  value={addBranchForm.contactNumber}
                  onChange={(e) => setAddBranchForm({ ...addBranchForm, contactNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="e.g. bgc@company.com"
                  value={addBranchForm.email}
                  onChange={(e) => setAddBranchForm({ ...addBranchForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsAddBranchModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Create Branch
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Edit Branch Modal */}
      {editBranchModal && (
        <Modal
          isOpen={!!editBranchModal}
          onClose={() => setEditBranchModal(null)}
          title={`Edit Branch — ${editBranchModal.name}`}
          subtitle={`Update location profile and contact details for ${editBranchModal.id}.`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveEditBranch} className="space-y-4">
            {editBranchError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{editBranchError}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Branch Name *
              </label>
              <input
                type="text"
                value={editBranchForm.name}
                onChange={(e) => setEditBranchForm({ ...editBranchForm, name: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Location Address
              </label>
              <input
                type="text"
                value={editBranchForm.location}
                onChange={(e) => setEditBranchForm({ ...editBranchForm, location: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Contact Number
                </label>
                <input
                  type="text"
                  value={editBranchForm.contactNumber}
                  onChange={(e) => setEditBranchForm({ ...editBranchForm, contactNumber: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={editBranchForm.email}
                  onChange={(e) => setEditBranchForm({ ...editBranchForm, email: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1">
                Operational Status
              </label>
              <select
                value={editBranchForm.status}
                onChange={(e) => setEditBranchForm({ ...editBranchForm, status: e.target.value })}
                className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditBranchModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Changes
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Delete Branch Confirmation Modal */}
      {deleteConfirmBranch && (
        <Modal
          isOpen={!!deleteConfirmBranch}
          onClose={() => setDeleteConfirmBranch(null)}
          title={`Delete Branch "${deleteConfirmBranch.name}"?`}
          subtitle="Are you sure you want to remove this branch?"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Branch <span className="font-bold text-slate-900">{deleteConfirmBranch.name}</span> ({deleteConfirmBranch.id}) will be permanently deleted.
            </p>
            {employees.some((e) => e.branchId === deleteConfirmBranch.id) && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-2xl font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600" />
                <span>
                  This branch has staff assigned to it. Reassign or delete staff members before removing this branch.
                </span>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmBranch(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteBranchConfirm}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Reassign Supervisor Modal */}
      {reassignModalBranch && (
        <Modal
          isOpen={!!reassignModalBranch}
          onClose={() => setReassignModalBranch(null)}
          title={`Assign Supervisor to ${reassignModalBranch.name}`}
          subtitle="Assign an active supervisor to manage this branch."
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSaveReassignment} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-1.5">
                Select Supervisor
              </label>
              <select
                value={newSupervisorId}
                onChange={(e) => {
                  setNewSupervisorId(e.target.value);
                  setErrorMsg('');
                }}
                className="w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
              >
                <option value="">-- Choose a Supervisor --</option>
                {supervisors.map((sup) => {
                  const isCurrent = sup.id === reassignModalBranch.supervisorId;
                  const otherBranch = branches.find((b) => b.id === sup.branchId && b.id !== reassignModalBranch.id);
                  return (
                    <option key={sup.id} value={sup.id}>
                      {sup.name} (@{sup.username}) {isCurrent ? ' [Currently Assigned]' : otherBranch ? ` [Currently at ${otherBranch.code}]` : ' [Unassigned]'}
                    </option>
                  );
                })}
              </select>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Note: Assigning a supervisor currently on another branch will transfer them to this branch.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReassignModalBranch(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Save Assignment
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Roster Modal */}
      {selectedBranch && (
        <Modal
          isOpen={!!selectedBranch}
          onClose={() => setSelectedBranch(null)}
          title={`Staff Roster — ${selectedBranch.name}`}
          subtitle={`${selectedBranch.id} · Established ${selectedBranch.establishedDate}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
              {employees
                .filter((e) => e.branchId === selectedBranch.id)
                .map((emp) => (
                  <div key={emp.id} className="p-3.5 flex items-center justify-between text-xs hover:bg-slate-50 transition">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] text-blue-600 font-bold bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                          {emp.id}
                        </span>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {emp.position} · {emp.department} · {emp.phone}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(emp.status)}`}>
                        {emp.status}
                      </span>
                      <p className="font-mono text-slate-900 mt-1 font-bold">{formatCurrency(emp.dailyRate)}/day</p>
                    </div>
                  </div>
                ))}
              {employees.filter((e) => e.branchId === selectedBranch.id).length === 0 && (
                <div className="p-6 text-center text-xs text-slate-500">
                  No staff members currently assigned to this branch.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                onClick={() => setSelectedBranch(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default BranchManagement;

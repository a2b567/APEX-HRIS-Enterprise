import React, { useState } from 'react';
import { useData } from '../../context/DataContext';
import Modal from '../../components/shared/Modal';
import { useToast } from '../../components/shared/Toast';
import {
  ShieldCheck,
  Building2,
  UserPlus,
  Edit2,
  Power,
  Mail,
  Phone,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';

export const SupervisorManagement = () => {
  const { branches, users, addSupervisor, updateSupervisor, toggleSupervisorStatus } = useData();
  const { addToast } = useToast();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupervisor, setEditingSupervisor] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    username: '',
    email: '',
    phone: '',
    position: 'Branch Operations Supervisor',
    branchId: '',
    status: 'Active',
  });
  const [errorMsg, setErrorMsg] = useState('');

  const supervisors = users.filter((u) => u.role === 'SUPERVISOR');

  const handleOpenCreate = () => {
    setEditingSupervisor(null);
    setFormData({
      name: '',
      username: '',
      email: '',
      phone: '',
      position: 'Branch Operations Supervisor',
      branchId: '',
      status: 'Active',
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleOpenEdit = (sup) => {
    setEditingSupervisor(sup);
    setFormData({
      name: sup.name,
      username: sup.username,
      email: sup.email,
      phone: sup.phone || '',
      position: sup.position || 'Branch Operations Supervisor',
      branchId: sup.branchId || '',
      status: sup.status || 'Active',
    });
    setErrorMsg('');
    setModalOpen(true);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!formData.name.trim() || !formData.username.trim() || !formData.email.trim()) {
      setErrorMsg('Please fill in all required supervisor fields.');
      return;
    }

    if (editingSupervisor) {
      const res = updateSupervisor(editingSupervisor.id, formData);
      if (res.success) {
        addToast({
          title: 'Supervisor Updated',
          message: `Supervisor profile for ${formData.name} updated.`,
          type: 'success',
        });
        setModalOpen(false);
      } else {
        setErrorMsg(res.message);
      }
    } else {
      const res = addSupervisor(formData);
      if (res.success) {
        addToast({
          title: 'Supervisor Added',
          message: `Created supervisor account for ${formData.name}.`,
          type: 'success',
        });
        setModalOpen(false);
      } else {
        setErrorMsg(res.message);
      }
    }
  };

  const handleToggleStatus = (sup) => {
    toggleSupervisorStatus(sup.id);
    addToast({
      title: 'Status Toggled',
      message: `${sup.name} is now ${sup.status === 'Active' ? 'Inactive' : 'Active'}.`,
      type: 'info',
    });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Supervisors
            </span>
            <span className="text-xs text-slate-500 font-medium">Strict Rule: 1 Supervisor per Branch</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Supervisor Governance
          </h1>
          <p className="text-xs text-slate-500">
            Manage site supervisors. Each branch is strictly tied to one active supervisor.
          </p>
        </div>

        <button
          onClick={handleOpenCreate}
          className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>+ Add Supervisor</span>
        </button>
      </div>

      {/* Supervisors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {supervisors.map((sup) => {
          const assignedBranch = branches.find((b) => b.id === sup.branchId);

          return (
            <div
              key={sup.id}
              className={`rounded-3xl border p-5 shadow-card hover:shadow-card-hover transition-all flex flex-col justify-between ${
                sup.status === 'Active'
                  ? 'bg-white border-slate-200/90'
                  : 'bg-slate-50 border-slate-200 opacity-75'
              }`}
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-blue-100 text-blue-700 font-extrabold text-base flex items-center justify-center border border-blue-200 shadow-sm">
                      {sup.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900">{sup.name}</h3>
                      <p className="text-xs text-slate-500 font-mono">@{sup.username}</p>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                      sup.status === 'Active'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border-rose-200'
                    }`}
                  >
                    {sup.status}
                  </span>
                </div>

                {/* Assigned Branch Box */}
                <div className="mt-4 p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-bold uppercase tracking-wider text-slate-500">Assigned Branch</span>
                    <span className="text-[10px] text-blue-600 font-bold">1:1 Locked</span>
                  </div>

                  {assignedBranch ? (
                    <div className="flex items-center gap-2 pt-1">
                      <Building2 className="w-4 h-4 text-blue-600 shrink-0" />
                      <div>
                        <p className="text-xs font-bold text-slate-900">{assignedBranch.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{assignedBranch.id}</p>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-amber-600 italic font-semibold">No branch assigned</p>
                  )}
                </div>

                {/* Contact info */}
                <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                  <p className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.email}</span>
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-slate-400" />
                    <span>{sup.phone || '+63 900 000 0000'}</span>
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <button
                  onClick={() => handleToggleStatus(sup)}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold border transition ${
                    sup.status === 'Active'
                      ? 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                      : 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                  }`}
                >
                  <Power className="w-3.5 h-3.5" />
                  <span>{sup.status === 'Active' ? 'Deactivate' : 'Activate'}</span>
                </button>

                <button
                  onClick={() => handleOpenEdit(sup)}
                  className="flex items-center justify-center gap-1.5 py-2 px-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition"
                >
                  <Edit2 className="w-3.5 h-3.5 text-blue-600" />
                  <span>Edit</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingSupervisor ? `Edit Supervisor: ${editingSupervisor.name}` : 'Add New Branch Supervisor'}
          subtitle="Strict rule: 1 active supervisor per branch."
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-2xl font-medium flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Full Name *
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Marco Antonio Rivera"
                className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Username *
                </label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  placeholder="e.g. supervisor1"
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                >
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Phone Number
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+63 917 000 0000"
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Assign Branch (1:1 Rule)
              </label>
              <select
                value={formData.branchId}
                onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
              >
                <option value="">-- Unassigned --</option>
                {branches.map((b) => {
                  const currentSup = users.find(
                    (u) =>
                      u.role === 'SUPERVISOR' &&
                      u.branchId === b.id &&
                      (!editingSupervisor || u.id !== editingSupervisor.id) &&
                      u.status === 'Active'
                  );
                  return (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.id}) {currentSup ? `[Occupied by ${currentSup.name}]` : '[Available]'}
                    </option>
                  );
                })}
              </select>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                {editingSupervisor ? 'Update Supervisor' : 'Create Supervisor'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
};

export default SupervisorManagement;

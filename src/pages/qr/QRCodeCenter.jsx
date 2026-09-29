import React, { useState, useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useBranchScope } from '../../hooks/useBranchScope';
import QRCodeBadge from '../../components/qr/QRCodeBadge';
import Modal from '../../components/shared/Modal';
import { QRCodeCanvas } from 'qrcode.react';
import { encodeQRPayload } from '../../utils/qrUtils';
import { useToast } from '../../components/shared/Toast';
import {
  QrCode,
  Printer,
  Download,
  Search,
  RefreshCw,
  Building2,
  Users,
  Eye,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';

export const QRCodeCenter = () => {
  const { role, user } = useAuth();
  const { branches, employees, regenerateEmployeeQR } = useData();
  const branchScope = useBranchScope();
  const { addToast } = useToast();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const supervisorBranchId = user?.branchId;

  const [selectedBranch, setSelectedBranch] = useState(isSuperAdmin ? 'ALL' : supervisorBranchId);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeEmployeeBadge, setActiveEmployeeBadge] = useState(null);
  const [bulkPrintMode, setBulkPrintMode] = useState(false);

  // Scoped employees
  const targetEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!isSuperAdmin) {
        if (emp.branchId !== supervisorBranchId) return false;
      } else if (selectedBranch !== 'ALL') {
        if (emp.branchId !== selectedBranch) return false;
      }

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchId = emp.id.toLowerCase().includes(q);
        const matchDept = emp.department?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDept) return false;
      }

      return true;
    });
  }, [employees, isSuperAdmin, supervisorBranchId, selectedBranch, searchQuery]);

  const handleRegenerate = (employee) => {
    if (window.confirm(`Regenerate security QR token for ${employee.name}? Any previous printed badges will be invalidated.`)) {
      const res = regenerateEmployeeQR(employee.id);
      if (res.success) {
        addToast({
          title: 'QR Token Regenerated',
          message: `Generated fresh token for ${employee.name}.`,
          type: 'success',
        });
      }
    }
  };

  const handleBulkPrint = () => {
    setBulkPrintMode(true);
    setTimeout(() => {
      window.print();
      setBulkPrintMode(false);
    }, 400);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Badge Management Hub
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isSuperAdmin ? 'Consolidated All 5 Branches' : `Branch: ${supervisorBranchId}`}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">QR Code Badge Center</h1>
          <p className="text-xs text-slate-500">
            Generate, inspect, download, and print official employee digital ID cards and QR badges.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleBulkPrint}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-semibold shadow-sm transition"
          >
            <Printer className="w-4 h-4" />
            <span>Print All Badges</span>
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="no-print rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search staff by name, ID, or position..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:bg-white focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {isSuperAdmin && (
          <div className="w-full sm:w-60">
            <select
              value={selectedBranch}
              onChange={(e) => setSelectedBranch(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:ring-2 focus:ring-blue-500 font-medium"
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
      </div>

      {/* Grid of Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 print-container">
        {targetEmployees.map((emp) => {
          const branch = branches.find((b) => b.id === emp.branchId);
          const payloadString = encodeQRPayload(emp);

          return (
            <div
              key={emp.id}
              className="rounded-2xl bg-white border border-slate-200/80 p-4 shadow-sm hover:border-blue-400 transition flex flex-col justify-between"
            >
              <div>
                {/* Header */}
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
                      {emp.id}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900 mt-1.5">{emp.name}</h3>
                    <p className="text-[11px] text-slate-500">{emp.position}</p>
                  </div>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                    {branch?.code || emp.branchId}
                  </span>
                </div>

                {/* QR Canvas Container */}
                <div className="my-3.5 flex justify-center p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <QRCodeCanvas
                    value={payloadString}
                    size={130}
                    level="H"
                    includeMargin={false}
                    bgColor="#f8fafc"
                    fgColor="#0f172a"
                  />
                </div>

                <div className="text-[11px] text-slate-500 text-center">
                  <span className="font-mono text-[10px] text-slate-400">Token: {emp.qrToken?.slice(-8) || 'active'}</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="no-print mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                <button
                  onClick={() => setActiveEmployeeBadge(emp)}
                  className="flex-1 flex items-center justify-center gap-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-xs font-semibold transition"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Inspect</span>
                </button>

                <button
                  onClick={() => handleRegenerate(emp)}
                  className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
                  title="Regenerate Security Token"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Inspect Single Badge Modal */}
      {activeEmployeeBadge && (
        <Modal
          isOpen={!!activeEmployeeBadge}
          onClose={() => setActiveEmployeeBadge(null)}
          title={`Employee Badge: ${activeEmployeeBadge.name}`}
          subtitle={`${activeEmployeeBadge.id} · ${activeEmployeeBadge.branchId}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <QRCodeBadge
              employee={activeEmployeeBadge}
              branch={branches.find((b) => b.id === activeEmployeeBadge.branchId)}
            />
          </div>
        </Modal>
      )}
    </div>
  );
};

export default QRCodeCenter;

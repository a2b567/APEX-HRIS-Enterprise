import React, { useState, useMemo, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useBranchScope } from '../../hooks/useBranchScope';
import Modal from '../../components/shared/Modal';
import QRCodeBadge from '../../components/qr/QRCodeBadge';
import { formatCurrency, getStatusBadge } from '../../utils/formatters';
import { useToast } from '../../components/shared/Toast';
import {
  Users,
  UserPlus,
  Search,
  Filter,
  Building2,
  Edit2,
  Trash2,
  Phone,
  Mail,
  Briefcase,
  DollarSign,
  AlertTriangle,
  QrCode,
  CheckCircle2,
  Clock,
  Key,
  UserCheck,
  ShieldAlert,
  Sparkles,
  Lock,
  ShieldCheck,
  FileSearch,
  XCircle,
  BadgeCheck,
  Eye,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCheck,
  X,
  RefreshCw,
} from 'lucide-react';

export const EmployeeManagement = () => {
  const { role, user } = useAuth();
  const {
    branches,
    users,
    employees,
    addEmployee,
    addEmployeesBulk,
    updateEmployee,
    deleteEmployee,
    regenerateEmployeeQR,
    createEmployeeUser,
    verifyEmployeeId,
    isLoading,
    refreshData,
  } = useData();
  const branchScope = useBranchScope();
  const { addToast } = useToast();

  const isSuperAdmin = role === 'SUPER_ADMIN';
  const supervisorBranchId = user?.branchId;

  // ── CSV Bulk Import State ──────────────────────────────────────────────
  const csvInputRef = useRef(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [importPreview, setImportPreview] = useState([]); // parsed rows
  const [importErrors, setImportErrors] = useState([]);
  const [importingRows, setImportingRows] = useState(false);

  const CSV_TEMPLATE_HEADERS = [
    'name', 'email', 'phone', 'branchId', 'department', 'position',
    'employmentType', 'dailyRate', 'status', 'tin', 'sss', 'philhealth',
    'pagibig', 'bankAccount', 'username', 'password',
  ];

  const downloadTemplate = () => {
    const targetBranch = (isSuperAdmin ? branches[0]?.id : supervisorBranchId) || 'BRANCH-001';

    const headers = [
      'Full Name',
      'Email Address',
      'Phone Number',
      'Branch ID',
      'Department',
      'Position',
      'Employment Type',
      'Daily Rate (PHP)',
      'Status',
      'TIN Number',
      'SSS Number',
      'PhilHealth Number',
      'Pag-IBIG Number',
      'Bank Account Number',
      'Portal Username',
      'Initial Password',
    ];

    const sampleRows = [
      [
        'Juan Dela Cruz',
        'juan.delacruz@company.ph',
        '+63 917 123 4567',
        targetBranch,
        'Operations',
        'Front Desk Officer',
        'Regular Full-Time',
        '850',
        'Active',
        '123-456-789-000',
        '34-1234567-8',
        '12-345678901-2',
        '1234-5678-9012',
        '1092837465',
        'juan.delacruz',
        'Emp@2026',
      ],
      [
        'Maria Santos',
        'maria.santos@company.ph',
        '+63 918 987 6543',
        targetBranch,
        'Logistics & Warehouse',
        'Inventory Clerk',
        'Regular Full-Time',
        '750',
        'Active',
        '234-567-890-000',
        '34-8765432-1',
        '12-987654321-0',
        '2345-6789-0123',
        '5098765432',
        'maria.santos',
        'Emp@2026',
      ],
      [
        'Mark Anthony Reyes',
        'mark.reyes@company.ph',
        '+63 920 555 1234',
        targetBranch,
        'Sales & Retail',
        'Cashier Associate',
        'Probationary',
        '650',
        'Active',
        '345-678-901-000',
        '34-5551234-9',
        '12-555123456-7',
        '3456-7890-1234',
        '7012345678',
        'mark.reyes',
        'Emp@2026',
      ],
      [
        'Elena Bautista',
        'elena.bautista@company.ph',
        '+63 922 444 8899',
        targetBranch,
        'Security & Safety',
        'Security Personnel',
        'Regular Full-Time',
        '700',
        'Active',
        '456-789-012-000',
        '34-4448899-0',
        '12-444889900-1',
        '4567-8901-2345',
        '8098761234',
        'elena.bautista',
        'Emp@2026',
      ],
    ];

    const formatRow = (row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    const csvRows = [formatRow(headers), ...sampleRows.map(formatRow)].join('\r\n');
    
    // Add UTF-8 BOM (\uFEFF) for crystal clear opening in Excel, WPS, and Google Sheets
    const blob = new Blob(['\uFEFF' + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `apex_employee_import_template_${targetBranch.toLowerCase()}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    addToast({
      title: 'Template Downloaded',
      message: 'Professional Excel/WPS compatible CSV template generated.',
      type: 'success',
    });
  };

  const parseCsvRow = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (ch === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = !inQuotes;
        }
      } else if (ch === ',' && !inQuotes) {
        result.push(current.trim());
        current = '';
      } else {
        current += ch;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleCsvUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target.result;
      const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
      if (lines.length < 2) {
        addToast({ title: 'Empty File', message: 'CSV has no data rows.', type: 'error' });
        return;
      }

      // Normalized clean header mapper
      const rawHeaders = parseCsvRow(lines[0]);
      const normalizedHeaders = rawHeaders.map((h) => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

      const getVal = (vals, ...keys) => {
        for (const key of keys) {
          const idx = normalizedHeaders.indexOf(key);
          if (idx !== -1 && vals[idx] !== undefined && vals[idx] !== '') {
            return vals[idx];
          }
        }
        return '';
      };

      const rows = [];
      const errs = [];

      lines.slice(1).forEach((line, idx) => {
        const vals = parseCsvRow(line);
        const name = getVal(vals, 'fullname', 'name', 'employeename');
        const position = getVal(vals, 'position', 'jobtitle', 'role');

        if (!name) errs.push(`Row ${idx + 2}: Missing employee name`);
        if (!position) errs.push(`Row ${idx + 2}: Missing position`);

        const email = getVal(vals, 'emailaddress', 'email');
        const phone = getVal(vals, 'phonenumber', 'phone', 'contactnumber', 'mobile');
        const branchId = getVal(vals, 'branchid', 'branch', 'branchcode') || (isSuperAdmin ? (branches[0]?.id || 'BRANCH-001') : supervisorBranchId);
        const department = getVal(vals, 'department', 'dept') || 'Operations';
        const employmentType = getVal(vals, 'employmenttype', 'type') || 'Regular Full-Time';
        const dailyRate = Number(getVal(vals, 'dailyratephp', 'dailyrate', 'rate', 'salary')) || 750;
        const status = getVal(vals, 'status') || 'Active';
        const tin = getVal(vals, 'tinnumber', 'tin');
        const sss = getVal(vals, 'sssnumber', 'sss');
        const philhealth = getVal(vals, 'philhealthnumber', 'philhealth');
        const pagibig = getVal(vals, 'pagibignumber', 'pagibig', 'hdmf');
        const bankAccount = getVal(vals, 'bankaccountnumber', 'bankaccount', 'accountnumber');
        const username = getVal(vals, 'portalusername', 'username', 'loginusername');
        const password = getVal(vals, 'initialpassword', 'password', 'accountpassword') || 'Emp@2026';

        rows.push({
          name: name || '',
          email,
          phone,
          branchId,
          department,
          position: position || '',
          employmentType,
          dailyRate,
          hourlyRate: Number((dailyRate / 8).toFixed(2)),
          status,
          tin,
          sss,
          philhealth,
          pagibig,
          bankAccount,
          username,
          accountPassword: password,
          createAccount: !!username || true,
        });
      });

      setImportPreview(rows);
      setImportErrors(errs);
      setImportModalOpen(true);
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleBulkImport = async () => {
    setImportingRows(true);
    const validRows = importPreview.filter((row) => row.name && row.position);
    if (validRows.length > 0) {
      await addEmployeesBulk(validRows);
    }
    setImportingRows(false);
    setImportModalOpen(false);
    setImportPreview([]);
    addToast({
      title: 'Bulk Import Complete',
      message: `Successfully registered ${validRows.length} employee${validRows.length !== 1 ? 's' : ''} and saved directly to the database.`,
      type: 'success',
    });
  };
  // ──────────────────────────────────────────────────────────────────────


  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedBranchFilter, setSelectedBranchFilter] = useState(isSuperAdmin ? 'ALL' : supervisorBranchId);
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState(null);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [qrModalEmployee, setQrModalEmployee] = useState(null);
  const [accountModalEmployee, setAccountModalEmployee] = useState(null);
  const [quickAccountForm, setQuickAccountForm] = useState({ username: '', password: 'Emp@123' });
  const [idVerifyModalId, setIdVerifyModalId] = useState(null); // employee ID string
  // Derive live employee object so verify/reject reflects the current state
  const idVerifyModal = idVerifyModalId ? employees.find((e) => e.id === idVerifyModalId) || null : null;

  const [formData, setFormData] = useState({
    id: '',
    name: '',
    email: '',
    phone: '',
    branchId: isSuperAdmin ? 'BRANCH-001' : supervisorBranchId,
    department: 'Operations',
    position: '',
    employmentType: 'Regular Full-Time',
    dailyRate: 750,
    hourlyRate: 93.75,
    status: 'Active',
    createAccount: true,
    username: '',
    accountPassword: 'Emp@123',
    tin: '',
    sss: '',
    philhealth: '',
    pagibig: '',
    bankAccount: '',
  });

  // Filtered list
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (!isSuperAdmin) {
        if (emp.branchId !== supervisorBranchId) return false;
      } else if (selectedBranchFilter !== 'ALL') {
        if (emp.branchId !== selectedBranchFilter) return false;
      }

      if (statusFilter !== 'ALL' && emp.status !== statusFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = emp.name.toLowerCase().includes(q);
        const matchId = emp.id.toLowerCase().includes(q);
        const matchDept = emp.department?.toLowerCase().includes(q);
        const matchPos = emp.position?.toLowerCase().includes(q);
        if (!matchName && !matchId && !matchDept && !matchPos) return false;
      }

      return true;
    });
  }, [employees, isSuperAdmin, supervisorBranchId, selectedBranchFilter, statusFilter, searchQuery]);

  // KPI Metrics Strip
  const stats = useMemo(() => {
    const total = filteredEmployees.length;
    const active = filteredEmployees.filter((e) => e.status === 'Active').length;
    const onLeave = filteredEmployees.filter((e) => e.status === 'On Leave').length;
    const avgDailyRate = total > 0 ? filteredEmployees.reduce((sum, e) => sum + (e.dailyRate || 0), 0) / total : 0;
    return { total, active, onLeave, avgDailyRate };
  }, [filteredEmployees]);

  const handleOpenAdd = () => {
    setEditingEmployee(null);
    setFormData({
      id: '',
      name: '',
      email: '',
      phone: '',
      branchId: isSuperAdmin ? 'BRANCH-001' : supervisorBranchId,
      department: 'Operations',
      position: '',
      employmentType: 'Regular Full-Time',
      dailyRate: 750,
      hourlyRate: 93.75,
      status: 'Active',
      createAccount: true,
      username: '',
      accountPassword: 'Emp@123',
      tin: '',
      sss: '',
      philhealth: '',
      pagibig: '',
      bankAccount: '',
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (emp) => {
    setEditingEmployee(emp);
    const existingUser = users.find((u) => u.employeeId === emp.id || u.id === emp.userId);
    setFormData({
      ...emp,
      dailyRate: emp.dailyRate || 750,
      hourlyRate: emp.hourlyRate || (emp.dailyRate ? emp.dailyRate / 8 : 93.75),
      createAccount: !existingUser,
      username: existingUser?.username || '',
      accountPassword: 'Emp@123',
    });
    setModalOpen(true);
  };

  const handleDailyRateChange = (rateVal) => {
    const daily = Number(rateVal) || 0;
    setFormData({
      ...formData,
      dailyRate: daily,
      hourlyRate: Number((daily / 8).toFixed(2)),
    });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.position.trim()) {
      alert('Please fill in required fields');
      return;
    }

    if (editingEmployee) {
      updateEmployee(editingEmployee.id, formData);
      addToast({
        title: 'Employee Updated',
        message: `${formData.name}'s profile was updated.`,
        type: 'success',
      });
    } else {
      const res = addEmployee(formData);
      const accMessage = res.user
        ? ` Created login account (@${res.user.username}).`
        : '';
      addToast({
        title: 'Employee Registered',
        message: `Generated QR badge & registered ${formData.name}.${accMessage}`,
        type: 'success',
      });
    }
    setModalOpen(false);
  };

  const handleOpenCreateAccountModal = (emp) => {
    setAccountModalEmployee(emp);
    const defaultUsername = emp.name.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
    setQuickAccountForm({
      username: defaultUsername,
      password: 'Emp@123',
    });
  };

  const handleQuickCreateAccount = (e) => {
    e.preventDefault();
    if (!accountModalEmployee) return;

    const res = createEmployeeUser(accountModalEmployee.id, {
      username: quickAccountForm.username,
      password: quickAccountForm.password,
    });

    if (res.success) {
      addToast({
        title: 'User Account Created',
        message: res.message || `Login credentials created for ${accountModalEmployee.name}.`,
        type: 'success',
      });
      setAccountModalEmployee(null);
    } else {
      addToast({
        title: 'Account Creation Notice',
        message: res.message,
        type: 'error',
      });
    }
  };

  const handleDelete = () => {
    if (!employeeToDelete) return;
    deleteEmployee(employeeToDelete);
    addToast({
      title: 'Employee Removed',
      message: `${employeeToDelete.name} (${employeeToDelete.id}) was removed from the roster.`,
      type: 'info',
    });
    setDeleteConfirmOpen(false);
    setEmployeeToDelete(null);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-200">
              Workforce Directory
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isSuperAdmin ? 'Enterprise Scope (All Branches)' : `Branch Scope: ${supervisorBranchId}`}
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Employee Management
          </h1>
          <p className="text-xs text-slate-500">
            Maintain employee profiles, daily compensation rates, and digital QR attendance badges.
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Hidden CSV file input */}
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleCsvUpload}
          />

          {/* Download Template */}
          <button
            onClick={downloadTemplate}
            className="flex items-center gap-1.5 rounded-xl bg-white hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-slate-700 hover:text-emerald-700 px-3 py-2.5 text-xs font-bold shadow-sm transition"
            title="Download CSV Template"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-500" />
            <span className="hidden sm:inline">CSV Template</span>
          </button>

          {/* Import CSV */}
          <button
            onClick={() => csvInputRef.current?.click()}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition"
          >
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>

          {/* Manual Sync */}
          <button
            onClick={async () => { setIsSyncing(true); await refreshData(); setTimeout(() => setIsSyncing(false), 800); }}
            disabled={isSyncing}
            title="Force sync from database"
            className="flex items-center gap-2 rounded-xl bg-slate-700 hover:bg-slate-900 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition disabled:opacity-60"
          >
            <RefreshCw className={`w-4 h-4 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Syncing...' : 'Sync'}</span>
          </button>

          {/* Add Single */}
          <button
            onClick={handleOpenAdd}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition"
          >
            <UserPlus className="w-4 h-4" />
            <span>+ Add</span>
          </button>
        </div>
      </div>

      {/* Mini KPI Metric Strip matching Figma Screen 3 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-card">
          <p className="text-[10px] uppercase font-bold text-slate-500">Total Staff</p>
          <p className="text-xl font-black text-slate-900 mt-0.5">{stats.total}</p>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-card">
          <p className="text-[10px] uppercase font-bold text-slate-500">Active Roster</p>
          <p className="text-xl font-black text-emerald-600 mt-0.5">{stats.active}</p>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-card">
          <p className="text-[10px] uppercase font-bold text-slate-500">On Leave</p>
          <p className="text-xl font-black text-amber-600 mt-0.5">{stats.onLeave}</p>
        </div>
        <div className="bg-white border border-slate-200 p-3.5 rounded-2xl shadow-card">
          <p className="text-[10px] uppercase font-bold text-slate-500">Avg. Daily Rate</p>
          <p className="text-xl font-black text-blue-600 font-mono mt-0.5">{formatCurrency(stats.avgDailyRate)}</p>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-card flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, ID, position, or department..."
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600 transition"
          />
        </div>

        {isSuperAdmin && (
          <div className="w-full md:w-56">
            <select
              value={selectedBranchFilter}
              onChange={(e) => setSelectedBranchFilter(e.target.value)}
              className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
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

        <div className="w-full md:w-40">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Statuses</option>
            <option value="Active">Active</option>
            <option value="On Leave">On Leave</option>
            <option value="Inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Employees Table matching Figma Screen 3 */}
      <div className="rounded-3xl bg-white border border-slate-200 shadow-card overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Showing {filteredEmployees.length} Staff Records
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500 border-b border-slate-200">
              <tr>
                <th className="py-3.5 px-4">Employee</th>
                {isSuperAdmin && <th className="py-3.5 px-4">Branch</th>}
                <th className="py-3.5 px-4">Position & Dept</th>
                <th className="py-3.5 px-4">Portal Login</th>
                <th className="py-3.5 px-4">ID Verification</th>
                <th className="py-3.5 px-4">Daily Rate</th>
                <th className="py-3.5 px-4">Hourly Rate</th>
                <th className="py-3.5 px-4">QR Token</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredEmployees.map((emp) => {
                const branchObj = branches.find((b) => b.id === emp.branchId);
                const userAcc = users.find((u) => u.employeeId === emp.id || u.id === emp.userId);

                return (
                  <tr key={emp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-xl bg-blue-100 text-blue-700 font-bold text-xs flex items-center justify-center">
                          {emp.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900">{emp.name}</div>
                          <div className="font-mono text-[10px] text-blue-600 font-semibold">{emp.id}</div>
                        </div>
                      </div>
                    </td>

                    {isSuperAdmin && (
                      <td className="py-3.5 px-4">
                        <span className="font-semibold text-slate-800">{branchObj?.name || emp.branchId}</span>
                        <p className="text-[10px] font-mono text-slate-400">{emp.branchId}</p>
                      </td>
                    )}

                    <td className="py-3.5 px-4">
                      <div className="text-slate-900 font-medium">{emp.position}</div>
                      <div className="text-[10px] text-slate-500">{emp.department}</div>
                    </td>

                    <td className="py-3.5 px-4">
                      {userAcc ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[11px] font-semibold">
                          <Key className="w-3 h-3 text-emerald-600" />
                          <span className="font-mono">@{userAcc.username}</span>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleOpenCreateAccountModal(emp)}
                          className="inline-flex items-center gap-1.5 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 rounded-lg text-[10px] font-bold transition"
                          title="Generate user account for this employee"
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>+ Create Login</span>
                        </button>
                      )}
                    </td>

                    {/* ID Verification Column */}
                    <td className="py-3.5 px-4">
                      {(() => {
                        const vs = emp.idVerificationStatus;
                        if (vs === 'Verified') {
                          return (
                            <button
                              onClick={() => setIdVerifyModalId(emp.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition hover:bg-emerald-100"
                            >
                              <BadgeCheck className="w-3 h-3" />
                              <span>Verified</span>
                            </button>
                          );
                        } else if (vs === 'Rejected') {
                          return (
                            <button
                              onClick={() => setIdVerifyModalId(emp.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-50 text-rose-700 border border-rose-200 rounded-lg text-[10px] font-bold transition hover:bg-rose-100"
                            >
                              <XCircle className="w-3 h-3" />
                              <span>Rejected</span>
                            </button>
                          );
                        } else if (emp.idDocumentUrl) {
                          return (
                            <button
                              onClick={() => setIdVerifyModalId(emp.id)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 text-amber-700 border border-amber-300 rounded-lg text-[10px] font-bold transition hover:bg-amber-100 animate-pulse"
                            >
                              <FileSearch className="w-3 h-3" />
                              <span>Review ID</span>
                            </button>
                          );
                        } else {
                          return (
                            <span className="text-[10px] text-slate-400 font-medium">No ID</span>
                          );
                        }
                      })()}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-bold text-slate-900">
                      {formatCurrency(emp.dailyRate)}
                    </td>

                    <td className="py-3.5 px-4 font-mono font-semibold text-emerald-600">
                      {formatCurrency(emp.hourlyRate)}
                    </td>

                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => setQrModalEmployee(emp)}
                        className="inline-flex items-center gap-1.5 px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg text-[10px] font-bold transition"
                      >
                        <QrCode className="w-3 h-3" />
                        <span>View Badge</span>
                      </button>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${getStatusBadge(emp.status)}`}>
                        {emp.status}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleOpenEdit(emp)}
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
                          title="Edit Employee"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setEmployeeToDelete(emp);
                            setDeleteConfirmOpen(true);
                          }}
                          className="p-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition"
                          title="Delete Employee"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {isLoading && (
            <tbody>
              {[...Array(4)].map((_, i) => (
                <tr key={i} className="border-b border-slate-100">
                  {[...Array(9)].map((__, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-3 bg-slate-200 rounded-full animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          )}

          {filteredEmployees.length === 0 && !isLoading && (
            <div className="p-8 text-center text-slate-500 text-xs">
              No employee records match the selected filter.
            </div>
          )}
        </div>
      </div>

      {/* View QR Badge Modal */}
      {qrModalEmployee && (
        <Modal
          isOpen={!!qrModalEmployee}
          onClose={() => setQrModalEmployee(null)}
          title={`Digital QR Badge — ${qrModalEmployee.name}`}
          subtitle={`${qrModalEmployee.id} · ${qrModalEmployee.branchId}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <QRCodeBadge
              employee={qrModalEmployee}
              branch={branches.find((b) => b.id === qrModalEmployee.branchId)}
            />
          </div>
        </Modal>
      )}

      {/* Add / Edit Employee Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingEmployee ? `Edit Employee: ${editingEmployee.name}` : 'Register New Employee'}
          subtitle={isSuperAdmin ? 'Assign to any branch' : `Assigned to ${supervisorBranchId}`}
          maxWidth="max-w-2xl"
        >
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => {
                    const newName = e.target.value;
                    const autoUsername = newName.toLowerCase().trim().replace(/[^a-z0-9]+/g, '.').replace(/^\.|\.$/g, '');
                    setFormData({
                      ...formData,
                      name: newName,
                      username: formData.username && formData.username !== '' ? formData.username : autoUsername,
                    });
                  }}
                  placeholder="e.g. Gabriel Mendoza"
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Branch Assignment
                </label>
                {isSuperAdmin ? (
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.id})
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    disabled
                    value={`${supervisorBranchId} (Locked to your branch)`}
                    className="mt-1 w-full bg-slate-100 border border-slate-200 text-xs text-slate-500 rounded-xl p-2.5"
                  />
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Department *
                </label>
                <input
                  type="text"
                  required
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g. Operations, Finance, Logistics"
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Position / Job Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="e.g. Warehouse Lead Associate"
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
                />
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Daily Rate (PHP) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={formData.dailyRate}
                  onChange={(e) => handleDailyRateChange(e.target.value)}
                  className="mt-1 w-full bg-white border border-slate-300 text-sm font-mono text-slate-900 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Hourly Rate (Auto = Daily / 8)
                </label>
                <input
                  type="number"
                  step="0.01"
                  disabled
                  value={formData.hourlyRate}
                  className="mt-1 w-full bg-slate-100 border border-slate-200 text-sm font-mono text-emerald-700 font-bold rounded-xl p-2.5"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Email
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="name@company.com"
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Phone
                </label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+63 900 000 0000"
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm text-slate-900 rounded-xl p-2.5"
                >
                  <option value="Active">Active</option>
                  <option value="On Leave">On Leave</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>

            {/* User Login Account Section */}
            {!editingEmployee && (
              <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-4 h-4 text-blue-600" />
                    <span className="text-xs font-bold text-slate-900">Create System Login Account</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.createAccount}
                      onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>

                <p className="text-[11px] text-slate-600">
                  Enables employee self-service login to access digital QR badges, clock-in records, and payslips.
                </p>

                {formData.createAccount && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">
                        Username (Sign-in ID)
                      </label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        placeholder="e.g. gabriel.mendoza"
                        className="mt-1 w-full bg-white border border-blue-200 text-xs text-slate-900 rounded-xl p-2 focus:ring-2 focus:ring-blue-600 font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase">
                        Default Password
                      </label>
                      <input
                        type="text"
                        value={formData.accountPassword}
                        onChange={(e) => setFormData({ ...formData, accountPassword: e.target.value })}
                        placeholder="Emp@123"
                        className="mt-1 w-full bg-white border border-blue-200 text-xs text-slate-900 rounded-xl p-2 focus:ring-2 focus:ring-blue-600 font-mono"
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

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
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{editingEmployee ? 'Save Changes' : 'Register & Create Account'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* Standalone Create Account Modal for unlinked existing employees */}
      {accountModalEmployee && (
        <Modal
          isOpen={!!accountModalEmployee}
          onClose={() => setAccountModalEmployee(null)}
          title={`Create User Account — ${accountModalEmployee.name}`}
          subtitle={`Assign login credentials for employee (${accountModalEmployee.id})`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleQuickCreateAccount} className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900">
              <p className="font-semibold">{accountModalEmployee.name}</p>
              <p className="text-[11px] text-blue-700 mt-0.5">{accountModalEmployee.position} · {accountModalEmployee.branchId}</p>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Username *
              </label>
              <input
                type="text"
                required
                value={quickAccountForm.username}
                onChange={(e) => setQuickAccountForm({ ...quickAccountForm, username: e.target.value })}
                placeholder="e.g. employee.username"
                className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm font-mono text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700">
                Password *
              </label>
              <input
                type="text"
                required
                value={quickAccountForm.password}
                onChange={(e) => setQuickAccountForm({ ...quickAccountForm, password: e.target.value })}
                placeholder="Emp@123"
                className="mt-1 w-full bg-slate-50 border border-slate-300 text-sm font-mono text-slate-900 rounded-xl p-2.5 focus:bg-white focus:ring-2 focus:ring-blue-600"
              />
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAccountModalEmployee(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Create Account
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ID Verification Review Modal */}
      {idVerifyModal && (
        <Modal
          isOpen={!!idVerifyModal}
          onClose={() => setIdVerifyModalId(null)}
          title={`ID Verification — ${idVerifyModal.name}`}
          subtitle={`${idVerifyModal.id} · ${idVerifyModal.position || 'Staff'}`}
          maxWidth="max-w-lg"
        >
          <div className="space-y-4">
            {/* ID Type + Submitted By Info */}
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-700">ID Type:</span>
                <span className="text-slate-800">{idVerifyModal.idType || 'Government ID'}</span>
              </div>
              {idVerifyModal.idDocumentName && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">File:</span>
                  <span className="font-mono text-slate-600 truncate max-w-[220px]">{idVerifyModal.idDocumentName}</span>
                </div>
              )}
              {idVerifyModal.idVerifiedAt && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Date:</span>
                  <span className="text-slate-600">{idVerifyModal.idVerifiedAt}</span>
                </div>
              )}
              {idVerifyModal.idVerifiedBy && (
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-700">Verified by:</span>
                  <span className="text-slate-600">{idVerifyModal.idVerifiedBy}</span>
                </div>
              )}
            </div>

            {/* Current Status Badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Current Status:</span>
              {idVerifyModal.idVerificationStatus === 'Verified' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-full text-[11px] font-bold">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  Verified
                </span>
              )}
              {idVerifyModal.idVerificationStatus === 'Rejected' && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-rose-100 text-rose-700 border border-rose-300 rounded-full text-[11px] font-bold">
                  <XCircle className="w-3.5 h-3.5" />
                  Rejected
                </span>
              )}
              {(!idVerifyModal.idVerificationStatus || idVerifyModal.idVerificationStatus === 'Pending Verification') && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-700 border border-amber-300 rounded-full text-[11px] font-bold">
                  <FileSearch className="w-3.5 h-3.5" />
                  Pending Review
                </span>
              )}
            </div>

            {/* ID Document Preview */}
            {idVerifyModal.idDocumentUrl ? (
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-slate-100">
                <img
                  src={idVerifyModal.idDocumentUrl}
                  alt="Employee ID Document"
                  className="w-full max-h-64 object-contain bg-slate-100"
                  onError={(e) => { e.target.style.display = 'none'; }}
                />
                <div className="p-2 text-center text-[10px] text-slate-500 border-t border-slate-200 bg-white">
                  {idVerifyModal.idDocumentName || 'Uploaded ID Document'}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl">
                <ShieldAlert className="w-8 h-8 text-slate-300 mb-2" />
                <p className="text-xs text-slate-400 font-medium">No ID document uploaded yet</p>
              </div>
            )}

            {/* Admin Action Buttons */}
            <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => {
                  const res = verifyEmployeeId(idVerifyModal.id, 'Rejected', user?.name || 'Supervisor/Admin');
                  if (res.success) {
                    addToast({ title: 'ID Rejected', message: `${idVerifyModal.name}'s ID has been marked as rejected.`, type: 'error' });
                    setIdVerifyModalId(null);
                  }
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold transition"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Reject ID</span>
              </button>

              <button
                onClick={() => {
                  const res = verifyEmployeeId(idVerifyModal.id, 'Verified', user?.name || 'Supervisor/Admin');
                  if (res.success) {
                    addToast({ title: 'ID Verified ✓', message: `${idVerifyModal.name}'s ID has been approved and verified.`, type: 'success' });
                    setIdVerifyModalId(null);
                  }
                }}
                disabled={!idVerifyModal.idDocumentUrl}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <BadgeCheck className="w-3.5 h-3.5" />
                <span>Approve & Verify</span>
              </button>
            </div>

            {!idVerifyModal.idDocumentUrl && (
              <p className="text-[11px] text-center text-slate-400">Employee must upload an ID document before verification can be approved.</p>
            )}
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && employeeToDelete && (
        <Modal
          isOpen={deleteConfirmOpen}
          onClose={() => setDeleteConfirmOpen(false)}
          title="Confirm Employee Removal"
          maxWidth="max-w-md"
        >
          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs">
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
              <p>
                Are you sure you want to remove <strong>{employeeToDelete.name}</strong> ({employeeToDelete.id})? This will also remove their associated attendance logs and QR token.
              </p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </Modal>
      )}
      {/* ── CSV Bulk Import Preview Modal ──────────────────────────────── */}
      {importModalOpen && (
        <Modal
          isOpen={importModalOpen}
          onClose={() => { setImportModalOpen(false); setImportPreview([]); setImportErrors([]); }}
          title="CSV Bulk Import Preview"
          subtitle={`${importPreview.length} employee${importPreview.length !== 1 ? 's' : ''} ready to import`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            {/* Errors */}
            {importErrors.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 space-y-1">
                <p className="text-xs font-bold text-amber-800 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> {importErrors.length} Warning{importErrors.length !== 1 ? 's' : ''} Found
                </p>
                {importErrors.map((err, i) => (
                  <p key={i} className="text-[11px] text-amber-700 pl-5">{err}</p>
                ))}
              </div>
            )}

            {/* Info tip */}
            <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-3 text-[11px] text-blue-700">
              <CheckCircle2 className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              <span>Review the data below. Each row will be registered as a new employee with a generated QR badge. Rows with missing Name or Position will be skipped.</span>
            </div>

            {/* Preview Table */}
            <div className="overflow-auto max-h-72 rounded-xl border border-slate-200">
              <table className="w-full text-[11px]">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    {['#', 'Name', 'Position', 'Branch', 'Dept', 'Daily Rate', 'Email', 'Username', 'Status'].map((h) => (
                      <th key={h} className="px-3 py-2 text-left font-bold text-slate-600 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {importPreview.map((row, i) => {
                    const hasError = !row.name || !row.position;
                    return (
                      <tr key={i} className={hasError ? 'bg-rose-50' : 'hover:bg-slate-50'}>
                        <td className="px-3 py-2 font-mono text-slate-400">{i + 1}</td>
                        <td className="px-3 py-2 font-semibold text-slate-800 whitespace-nowrap">
                          {row.name || <span className="text-rose-500">MISSING</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">
                          {row.position || <span className="text-rose-500">MISSING</span>}
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.branchId || '—'}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{row.department}</td>
                        <td className="px-3 py-2 text-slate-700 font-mono">₱{row.dailyRate}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.email || '—'}</td>
                        <td className="px-3 py-2 text-slate-500 whitespace-nowrap">{row.username || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${row.status === 'Active' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                            {row.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2">
              <p className="text-[11px] text-slate-500">
                {importPreview.filter(r => r.name && r.position).length} valid · {importPreview.filter(r => !r.name || !r.position).length} will be skipped
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => { setImportModalOpen(false); setImportPreview([]); setImportErrors([]); }}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleBulkImport}
                  disabled={importingRows || importPreview.filter(r => r.name && r.position).length === 0}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-sm"
                >
                  <CheckCheck className="w-4 h-4" />
                  {importingRows ? 'Importing...' : `Import ${importPreview.filter(r => r.name && r.position).length} Employees`}
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default EmployeeManagement;

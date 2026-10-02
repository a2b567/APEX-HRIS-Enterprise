import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import StatCard from '../../components/shared/StatCard';
import Modal from '../../components/shared/Modal';
import { formatCurrency, formatDate, getStatusBadge } from '../../utils/formatters';
import { computeEmployeePayroll } from '../../utils/payrollCalculator';
import {
  Building2,
  ShieldCheck,
  Users,
  UserCheck,
  Clock,
  AlertTriangle,
  Banknote,
  ArrowUpRight,
  ChevronRight,
  QrCode,
  Zap,
  MapPin,
  Mail,
  Phone,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

export const AdminDashboard = () => {
  const { branches, users, employees, attendanceLogs, liveScanFeed, settings } = useData();
  const navigate = useNavigate();

  const [selectedBranchDetail, setSelectedBranchDetail] = useState(null);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [selectedCutoff, setSelectedCutoff] = useState('1-15');

  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  // Today's attendance analytics across all branches
  const todayAttendance = useMemo(() => {
    const logs = attendanceLogs.filter((log) => log && log.date === todayStr && log.timeIn);
    const present = logs.filter((l) => l.status === 'Present').length;
    const late = logs.filter((l) => l.status === 'Late').length;
    const totalPunched = present + late;
    const absent = Math.max(0, employees.length - totalPunched);
    const onLeave = attendanceLogs.filter((l) => l && l.date === todayStr && l.status === 'On Leave').length;
    const qrScanned = logs.filter((l) => l.method === 'QR').length;
    return { present, late, absent, onLeave, qrScanned, total: totalPunched };
  }, [attendanceLogs, employees.length, todayStr]);

  // Per Branch Analytics Summary
  const branchSummaries = useMemo(() => {
    return branches.map((branch) => {
      const branchEmployees = employees.filter((e) => e.branchId === branch.id);
      const supervisor = users.find((u) => u.id === branch.supervisorId && u.role === 'SUPERVISOR');
      const branchLogsToday = attendanceLogs.filter(
        (l) => (l.branchId === branch.id || branchEmployees.some(e => e.id === l.employeeId)) && l.date === todayStr && l.timeIn
      );

      const present = branchLogsToday.filter((l) => l.status === 'Present').length;
      const late = branchLogsToday.filter((l) => l.status === 'Late').length;
      const totalPunched = present + late;
      const absent = Math.max(0, branchEmployees.length - totalPunched);
      const onLeave = attendanceLogs.filter(
        (l) => (l.branchId === branch.id || branchEmployees.some(e => e.id === l.employeeId)) && l.date === todayStr && l.status === 'On Leave'
      ).length;

      const branchPayroll = branchEmployees.reduce((sum, emp) => {
        const p = computeEmployeePayroll(emp, attendanceLogs, selectedCutoff, selectedMonth, settings);
        return sum + p.netPay;
      }, 0);

      return {
        ...branch,
        supervisorName: supervisor ? supervisor.name : 'Unassigned',
        supervisorEmail: supervisor?.email,
        supervisorPhone: supervisor?.phone,
        totalEmployees: branchEmployees.length,
        present,
        late,
        absent,
        onLeave,
        branchPayroll,
        attendanceRate: branchEmployees.length > 0 ? Math.round((totalPunched / branchEmployees.length) * 100) : 0,
      };
    });
  }, [branches, employees, users, attendanceLogs, todayStr, selectedCutoff, selectedMonth, settings]);

  // Enterprise Payroll Grand Total
  const enterprisePayrollSummary = useMemo(() => {
    let grossTotal = 0;
    let netTotal = 0;
    let deductionsTotal = 0;
    let otHoursTotal = 0;

    employees.forEach((emp) => {
      const p = computeEmployeePayroll(emp, attendanceLogs, selectedCutoff, selectedMonth, settings);
      grossTotal += p.grossPay;
      netTotal += p.netPay;
      deductionsTotal += p.totalDeductions;
      otHoursTotal += p.totalOvertimeHours;
    });

    return { grossTotal, netTotal, deductionsTotal, otHoursTotal };
  }, [employees, attendanceLogs, selectedCutoff, selectedMonth, settings]);

  const chartAttendanceData = branchSummaries.map((b) => ({
    name: b.code,
    Present: b.present,
    Late: b.late,
    Absent: b.absent,
  }));

  const totalAttendanceToday = todayAttendance.present + todayAttendance.late + todayAttendance.absent;

  const punctualityScore = employees.length > 0 && totalAttendanceToday > 0
    ? Math.round(((todayAttendance.present + todayAttendance.late) / employees.length) * 100)
    : 0;

  const donutData = totalAttendanceToday > 0
    ? [
        { name: 'Present (On-Time)', value: todayAttendance.present },
        { name: 'Late (Within Grace)', value: todayAttendance.late },
        { name: 'Absent', value: todayAttendance.absent },
      ].filter((d) => d.value > 0)
    : [
        { name: 'No Records Today', value: 1 },
      ];

  const DONUT_COLORS = totalAttendanceToday > 0 ? ['#2563eb', '#f59e0b', '#f43f5e'] : ['#e2e8f0'];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Figma Header Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-purple-50 text-purple-700 border border-purple-200">
              Executive Governance
            </span>
            <span className="text-xs text-slate-500 font-medium">
              1 Super Admin → {branches.length} Branch{branches.length !== 1 ? 'es' : ''}
            </span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Admin & HR Dashboard
          </h1>
          <p className="text-xs text-slate-500">
            Real-time branch attendance pulse, digital QR telemetry, and automated payroll disbursement.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => navigate('/admin/qr-codes')}
            className="flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-xs font-bold shadow-sm transition"
          >
            <QrCode className="w-4 h-4" />
            <span>QR Badge Center</span>
          </button>
          <button
            onClick={() => navigate('/payroll')}
            className="flex items-center gap-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2.5 text-xs font-bold shadow-sm transition"
          >
            <Banknote className="w-4 h-4 text-emerald-600" />
            <span>Run Payroll</span>
          </button>
        </div>
      </div>

      {/* 4 Top KPI Stat Cards matching Figma Screen 2 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Employees"
          value={`${employees.length}`}
          subtitle={`Across all ${branches.length} branch${branches.length !== 1 ? 'es' : ''}`}
          icon={Users}
          accentColor="blue"
          onClick={() => navigate('/admin/employees')}
        />
        <StatCard
          title="Present Today"
          value={`${todayAttendance.present + todayAttendance.late}`}
          subtitle={`QR Badges: ${todayAttendance.qrScanned}`}
          icon={UserCheck}
          accentColor="emerald"
          onClick={() => navigate('/dtr')}
        />
        <StatCard
          title="Late Arrivals"
          value={`${todayAttendance.late}`}
          subtitle="Past 15m grace period"
          icon={Clock}
          accentColor="amber"
          onClick={() => navigate('/dtr')}
        />
        <StatCard
          title="Total Branches"
          value={`${branches.length}`}
          subtitle="1:1 Supervisor assignment"
          icon={Building2}
          accentColor="purple"
          onClick={() => navigate('/admin/branches')}
        />
      </div>

      {/* Main Grid: Attendance Bar Chart + Donut Gauge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Attendance Bar Chart (8 Columns) */}
        <div className="lg:col-span-8 rounded-3xl bg-white border border-slate-200/90 p-6 shadow-card flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">Branch Attendance Comparison</h3>
                <p className="text-xs text-slate-500">Live breakdown of Present, Late, and Absent staff per branch</p>
              </div>
              <span className="text-xs font-mono font-bold bg-slate-100 text-slate-700 px-2.5 py-1 rounded-xl">
                {todayStr}
              </span>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartAttendanceData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={11} />
                  <YAxis stroke="#94a3b8" fontSize={11} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderColor: '#e2e8f0',
                      borderRadius: '16px',
                      boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="Present" fill="#2563eb" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Late" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="Absent" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Shift Grace Period: 15 minutes</span>
            <button
              onClick={() => navigate('/dtr')}
              className="text-blue-600 font-bold hover:underline flex items-center gap-1"
            >
              <span>Full Attendance Logs</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Punctuality Rate Donut Card (4 Columns) */}
        <div className="lg:col-span-4 rounded-3xl bg-white border border-slate-200/90 p-6 shadow-card flex flex-col justify-between text-center">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-bold text-slate-900">Punctuality Health</h3>
              <span
                className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                  totalAttendanceToday === 0
                    ? 'bg-slate-100 text-slate-600 border-slate-200'
                    : punctualityScore >= 90
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}
              >
                {totalAttendanceToday === 0 ? 'Awaiting Scans' : punctualityScore >= 90 ? 'Optimal' : 'Attention'}
              </span>
            </div>
            <p className="text-xs text-slate-500">Today's workforce compliance</p>

            <div className="h-44 w-full my-2 flex items-center justify-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {donutData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={DONUT_COLORS[index % DONUT_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-black text-slate-900">{punctualityScore}%</span>
                <span className="text-[9px] uppercase font-bold text-slate-400">Attendance</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-1 text-[11px] font-semibold text-slate-600 pt-2 border-t border-slate-100">
              <div>
                <span className="block text-blue-600 font-bold">{todayAttendance.present}</span>
                <span>On-Time</span>
              </div>
              <div>
                <span className="block text-amber-600 font-bold">{todayAttendance.late}</span>
                <span>Late</span>
              </div>
              <div>
                <span className="block text-rose-600 font-bold">{todayAttendance.absent}</span>
                <span>Absent</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => navigate('/reports')}
            className="mt-4 w-full py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs border border-slate-200 transition"
          >
            Inspect Analytics Report
          </button>
        </div>
      </div>

      {/* Bottom Section: 5-Branch Summary Matrix + Live QR Scans + Payroll Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 5-Branch Matrix Cards (7 Columns) */}
        <div className="lg:col-span-7 rounded-3xl bg-white border border-slate-200/90 p-6 shadow-card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                <span>Branch Operations Matrix</span>
              </h3>
              <p className="text-xs text-slate-500">1 Supervisor strictly assigned per branch</p>
            </div>
            <button
              onClick={() => navigate('/admin/branches')}
              className="text-xs text-blue-600 hover:underline font-bold"
            >
              Manage All →
            </button>
          </div>

          <div className="divide-y divide-slate-100">
            {branchSummaries.map((b) => (
              <div
                key={b.id}
                onClick={() => setSelectedBranchDetail(b)}
                className="py-3 flex items-center justify-between hover:bg-slate-50 rounded-2xl px-2.5 transition cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-2xl bg-blue-50 text-blue-600 font-mono font-bold text-xs flex items-center justify-center border border-blue-100">
                    {b.code}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{b.name}</h4>
                    <p className="text-[11px] text-slate-500 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-blue-600" />
                      <span>{b.supervisorName}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 text-right">
                  <div className="hidden sm:block">
                    <p className="text-xs font-bold text-slate-900">{b.present + b.late} / {b.totalEmployees} Present</p>
                    <p className="text-[10px] text-slate-400 font-mono">Est. Net: {formatCurrency(b.branchPayroll)}</p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {b.attendanceRate}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live QR Feed & Quick Payroll (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Live Scan Telemetry Feed */}
          <div className="rounded-3xl bg-white border border-slate-200/90 p-6 shadow-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Live QR Attendance Feed</span>
              </h3>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-ping" />
                Active
              </span>
            </div>

            <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-slate-50/50 max-h-48 overflow-y-auto">
              {liveScanFeed.map((scan) => (
                <div key={scan.id} className="p-2.5 flex items-center justify-between text-xs hover:bg-white transition">
                  <div className="flex items-center gap-2">
                    <div className="p-1 rounded-lg bg-blue-100 text-blue-800 font-mono text-[9px] font-bold">
                      {scan.branchId.replace('BRANCH-', 'B')}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900 leading-tight truncate max-w-[120px]">{scan.employeeName}</p>
                      <p className="text-[10px] text-slate-400 font-mono">{scan.employeeId}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        scan.action === 'TIME_IN'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {scan.action === 'TIME_IN' ? '🟢 Time In' : '🔴 Time Out'}
                    </span>
                    <p className="font-mono text-[10px] text-slate-500 mt-0.5">{scan.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Payroll Snapshot */}
          <div className="rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-navy-850 p-6 text-white shadow-xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider text-blue-300">
                  Consolidated Payroll
                </span>
                <span className="text-[10px] bg-white/10 px-2 py-0.5 rounded-full font-mono">
                  {selectedCutoff} ({selectedMonth})
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-1">Grand total net disbursement</p>
              <p className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono mt-2">
                {formatCurrency(enterprisePayrollSummary.netTotal)}
              </p>
            </div>

            <button
              onClick={() => navigate('/payroll')}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              <span>Review & Run Payroll</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Drill-down Branch Modal */}
      {selectedBranchDetail && (
        <Modal
          isOpen={!!selectedBranchDetail}
          onClose={() => setSelectedBranchDetail(null)}
          title={selectedBranchDetail.name}
          subtitle={`Branch Code: ${selectedBranchDetail.id} (${selectedBranchDetail.code})`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
              <div className="space-y-1 text-xs">
                <p className="text-slate-600 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-500" />
                  <span>{selectedBranchDetail.location}</span>
                </p>
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-blue-600" />
                  <span>{selectedBranchDetail.email}</span>
                </p>
                <p className="text-slate-600 flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-emerald-600" />
                  <span>{selectedBranchDetail.contactNumber}</span>
                </p>
              </div>

              <div className="space-y-1 text-xs bg-white p-3 rounded-xl border border-slate-200">
                <p className="text-[10px] font-bold uppercase text-slate-400">Assigned Branch Supervisor</p>
                <p className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-blue-600" />
                  {selectedBranchDetail.supervisorName}
                </p>
                <p className="text-slate-500">{selectedBranchDetail.supervisorEmail || 'No email registered'}</p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Assigned Employees ({selectedBranchDetail.totalEmployees})
                </h4>
                <button
                  onClick={() => {
                    setSelectedBranchDetail(null);
                    navigate(`/admin/employees?branch=${selectedBranchDetail.id}`);
                  }}
                  className="text-xs text-blue-600 hover:underline font-bold"
                >
                  Manage Roster →
                </button>
              </div>

              <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white overflow-hidden">
                {employees
                  .filter((e) => e.branchId === selectedBranchDetail.id)
                  .map((emp) => (
                    <div key={emp.id} className="flex items-center justify-between p-3 text-xs">
                      <div>
                        <p className="font-bold text-slate-900">{emp.name}</p>
                        <p className="text-[11px] text-slate-500">
                          {emp.position} · {emp.department}
                        </p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold border ${getStatusBadge(emp.status)}`}>
                          {emp.status}
                        </span>
                        <p className="font-mono text-slate-600 mt-0.5 font-semibold">{formatCurrency(emp.dailyRate)}/day</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setSelectedBranchDetail(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const bId = selectedBranchDetail.id;
                  setSelectedBranchDetail(null);
                  navigate(`/dtr?branch=${bId}`);
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm"
              >
                View Branch DTR
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminDashboard;

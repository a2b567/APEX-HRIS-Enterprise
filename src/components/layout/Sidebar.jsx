import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import {
  LayoutDashboard,
  Building2,
  ShieldCheck,
  Users,
  Clock,
  Banknote,
  BarChart3,
  Settings,
  User,
  FileText,
  Building,
  CheckCircle2,
  QrCode,
  ScanLine,
  LogOut,
  Code,
} from 'lucide-react';

export const Sidebar = ({ sidebarOpen, setSidebarOpen }) => {
  const { role, user, logout } = useAuth();
  const { branches } = useData();
  const location = useLocation();

  const userBranch = branches.find((b) => b.id === user?.branchId);

  const getNavItems = () => {
    if (role === 'SUPER_ADMIN') {
      return [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
        { name: 'Branches', path: '/admin/branches', icon: Building2 },
        { name: 'Supervisors', path: '/admin/supervisors', icon: ShieldCheck },
        { name: 'Employees', path: '/admin/employees', icon: Users },
        { name: 'QR Badge Center', path: '/admin/qr-codes', icon: QrCode },
        { name: 'Daily Time Record', path: '/dtr', icon: Clock },
        { name: 'Payroll Run', path: '/payroll', icon: Banknote },
        { name: 'Reports & Analytics', path: '/reports', icon: BarChart3 },
        { name: 'Settings', path: '/settings', icon: Settings },
      ];
    } else if (role === 'SUPERVISOR') {
      return [
        { name: 'Branch Dashboard', path: '/supervisor/dashboard', icon: LayoutDashboard },
        { name: 'Scan Attendance', path: '/supervisor/scan', icon: ScanLine, highlight: true },
        { name: 'QR Badge Center', path: '/supervisor/qr-codes', icon: QrCode },
        { name: 'Branch Employees', path: '/supervisor/employees', icon: Users },
        { name: 'Daily Time Record', path: '/supervisor/dtr', icon: Clock },
        { name: 'Branch Payroll', path: '/supervisor/payroll', icon: Banknote },
        { name: 'Reports', path: '/supervisor/reports', icon: BarChart3 },
      ];
    } else {
      // EMPLOYEE
      return [
        { name: 'My Profile', path: '/employee/dashboard', icon: User },
        { name: 'My QR Badge', path: '/employee/qr', icon: QrCode },
        { name: 'My Attendance', path: '/employee/dtr', icon: Clock },
        { name: 'My Payslips', path: '/employee/payslips', icon: FileText },
      ];
    }
  };

  const navItems = getNavItems();

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 z-40 h-screen w-64 flex flex-col bg-navy-850 border-r border-navy-700 transition-transform duration-300 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-between border-b border-navy-700/80 px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 shadow-md shadow-blue-600/30">
              <Building className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="text-base font-black tracking-tight text-white leading-tight">
                APEX <span className="text-blue-400">HRIS</span>
              </h1>
              <p className="text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                Enterprise Platform
              </p>
            </div>
          </div>
        </div>

        {/* Scope Pill */}
        <div className="px-4 py-3 border-b border-navy-700/50 bg-navy-900/40">
          <div className="rounded-xl border border-navy-700 bg-navy-800/80 p-2.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Scope Isolation
              </span>
              <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400">
                <CheckCircle2 className="w-3 h-3" /> Active
              </span>
            </div>
            <p className="mt-0.5 text-xs font-bold text-white truncate">
              {role === 'SUPER_ADMIN'
                ? '🏢 All Branches'
                : userBranch
                  ? `📍 ${userBranch.name}`
                  : 'Personal Portal'}
            </p>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          <p className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Main Navigation
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;

            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center justify-between rounded-xl px-3.5 py-2.5 text-xs font-semibold transition-all duration-150 ${isActive
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30 font-bold'
                  : item.highlight
                    ? 'bg-blue-500/10 text-blue-300 border border-blue-500/30 hover:bg-blue-500/20'
                    : 'text-slate-300 hover:bg-navy-700/60 hover:text-white'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    className={`h-4.5 w-4.5 ${isActive ? 'text-white' : item.highlight ? 'text-blue-400' : 'text-slate-400'
                      }`}
                  />
                  <span>{item.name}</span>
                </div>
                {item.badge && (
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isActive ? 'bg-white/20 text-white' : 'bg-navy-700 text-slate-300'
                      }`}
                  >
                    {item.badge}
                  </span>
                )}
              </NavLink>
            );
          })}
        </nav>

        {/* Sidebar Footer with Logout Button & Developer Watermark */}
        <div className="p-3 border-t border-navy-700/80 bg-navy-900/60 space-y-2">
          <button
            onClick={() => logout()}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600/10 hover:bg-rose-600 border border-rose-500/20 hover:border-rose-600 py-2.5 px-3 text-xs font-bold text-rose-400 hover:text-white transition-all group shadow-sm"
          >
            <LogOut className="w-4 h-4 text-rose-400 group-hover:text-white transition" />
            <span>Sign Out</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 py-1 px-2 rounded-lg bg-navy-800/80 border border-navy-700/60 text-[10px] font-mono font-semibold text-slate-400">
            <Code className="w-3 h-3 text-blue-400" />
            <span>Devs: LAWRENCE & TAZPER group rene </span>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

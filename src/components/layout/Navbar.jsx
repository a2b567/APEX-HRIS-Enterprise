import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useClock } from '../../hooks/useClock';
import { getRoleBadge } from '../../utils/formatters';
import {
  Clock,
  Building2,
  UserCheck,
  LogOut,
  ChevronDown,
  Bell,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Banknote,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import { useToast } from '../shared/Toast';
import TermsModal from '../shared/TermsModal';

export const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, role, logout } = useAuth();
  const { branches, employees, disbursements } = useData();
  const { formattedTime, formattedDate, greeting } = useClock();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notifMenuOpen, setNotifMenuOpen] = useState(false);
  const [readNotifIds, setReadNotifIds] = useState(new Set());
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const roleInfo = getRoleBadge(role);
  const userBranch = branches.find((b) => b.id === user?.branchId);

  // Match employee profile
  const employee = useMemo(() => {
    return employees.find((e) => e.userId === user?.id || e.id === user?.employeeId) || null;
  }, [employees, user]);

  // Generate real-time payroll notifications
  const notifications = useMemo(() => {
    const list = [];
    if (!user) return list;

    if (role === 'EMPLOYEE' && employee) {
      // Check disbursement records for this employee
      Object.entries(disbursements || {}).forEach(([key, val]) => {
        if (key.startsWith(employee.id)) {
          const parts = key.split('_');
          const month = parts[1] || 'Current Month';
          const cutoff = parts[2] || 'Cutoff';

          if (val.disbursed) {
            list.push({
              id: `disb_${key}`,
              title: '💰 Salary Disbursed & Paid',
              message: `Your net salary for ${month} (${cutoff}) has been officially paid and confirmed!`,
              timestamp: val.disbursedAt || new Date().toISOString(),
              type: 'success',
              link: '/employee/payslips',
            });
          } else {
            list.push({
              id: `await_${key}`,
              title: '⏳ Salary Release Pending',
              message: `Your payroll for ${month} (${cutoff}) is ready. Present your QR badge to release payout.`,
              timestamp: new Date().toISOString(),
              type: 'warning',
              link: '/employee/payslips',
            });
          }
        }
      });

      // Add default current cutoff payslip notification
      const currentMonth = new Date().toISOString().slice(0, 7);
      list.push({
        id: `payslip_${currentMonth}`,
        title: '📄 Payslip Statement Generated',
        message: `Your semi-monthly itemized payslip for ${currentMonth} is available for inspection.`,
        timestamp: new Date().toISOString(),
        type: 'info',
        link: '/employee/payslips',
      });
    } else {
      // Admin / Supervisor notifications
      list.push({
        id: 'system_ready',
        title: '⚡ REDMART Enterprise System Online',
        message: 'Database & real-time telemetry services active.',
        timestamp: new Date().toISOString(),
        type: 'info',
        link: role === 'SUPERVISOR' ? '/supervisor/dashboard' : '/admin/dashboard',
      });
    }

    return list;
  }, [user, role, employee, disbursements]);

  const unreadCount = notifications.filter((n) => !readNotifIds.has(n.id)).length;

  const handleNotifClick = (notif) => {
    setReadNotifIds((prev) => new Set([...prev, notif.id]));
    setNotifMenuOpen(false);
    if (notif.link) navigate(notif.link);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-sm">
      {/* Left section: Hamburger on mobile */}
      <div className="flex items-center gap-4 flex-1 max-w-lg">
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 lg:hidden"
        >
          <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </div>

      {/* Right section: Live Time, Notifications, Badges, Switcher, Profile */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Live Clock Display */}
        <div className="hidden md:flex flex-col text-right pr-2 border-r border-slate-200">
          <span className="text-[11px] font-bold text-slate-900 font-mono flex items-center gap-1 justify-end">
            <Clock className="w-3 h-3 text-blue-600" /> {formattedTime}
          </span>
          <span className="text-[10px] text-slate-500">{formattedDate}</span>
        </div>

        {/* Role Badge */}
        <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${roleInfo.badgeClass}`}>
          <span className={`h-2 w-2 rounded-full ${roleInfo.dotClass}`} />
          <span>{roleInfo.label}</span>
        </div>

        {/* Branch Badge (If Supervisor or Employee) */}
        {userBranch && (
          <div className="hidden lg:flex items-center gap-1.5 rounded-full bg-slate-100 border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-700">
            <Building2 className="w-3.5 h-3.5 text-blue-600" />
            <span className="max-w-[130px] truncate">{userBranch.name}</span>
          </div>
        )}

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => setNotifMenuOpen(!notifMenuOpen)}
            className="relative p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-600 transition"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-4.5 min-w-4.5 px-1 bg-rose-600 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center border-2 border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {notifMenuOpen && (
            <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xl z-50 animate-in fade-in duration-200">
              <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-blue-600" />
                  <span className="text-xs font-bold text-slate-900">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-[10px] font-bold">
                      {unreadCount} New
                    </span>
                  )}
                </div>
                <button
                  onClick={() => setReadNotifIds(new Set(notifications.map((n) => n.id)))}
                  className="text-[10px] text-blue-600 font-semibold hover:underline"
                >
                  Mark all as read
                </button>
              </div>

              <div className="py-2 space-y-1.5 max-h-80 overflow-y-auto">
                {notifications.map((n) => {
                  const isRead = readNotifIds.has(n.id);
                  return (
                    <div
                      key={n.id}
                      onClick={() => handleNotifClick(n)}
                      className={`p-3 rounded-xl border cursor-pointer transition flex items-start gap-3 ${
                        isRead
                          ? 'bg-slate-50 border-slate-200/70 text-slate-600'
                          : 'bg-blue-50/60 border-blue-200 text-slate-900 font-medium'
                      }`}
                    >
                      <div className={`p-2 rounded-lg shrink-0 ${
                        n.type === 'success' ? 'bg-emerald-100 text-emerald-700' : n.type === 'warning' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        <Banknote className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold">{n.title}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5 leading-snug">{n.message}</p>
                        <p className="text-[9px] text-slate-400 font-mono mt-1">
                          {new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      {!isRead && (
                        <span className="h-2 w-2 rounded-full bg-blue-600 shrink-0 mt-1"></span>
                      )}
                    </div>
                  );
                })}
              </div>

              {role === 'EMPLOYEE' && (
                <div className="pt-2 border-t border-slate-100 text-center">
                  <button
                    onClick={() => {
                      setNotifMenuOpen(false);
                      navigate('/employee/payslips');
                    }}
                    className="text-xs font-bold text-blue-600 hover:text-blue-700 transition inline-flex items-center gap-1"
                  >
                    <span>Inspect Payslip Details</span>
                    <span>→</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-1.5 hover:bg-slate-100 transition shadow-sm"
          >
            <div className="h-8 w-8 rounded-xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center font-extrabold text-xs text-white shadow-inner shrink-0">
              {user?.avatar && !avatarError ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarError(true)}
                />
              ) : (
                <span>{user?.name ? user.name.trim().split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() : 'US'}</span>
              )}
            </div>
            <div className="hidden md:block text-left text-xs leading-tight pr-1">
              <p className="font-bold text-slate-900">{user?.name}</p>
              <p className="text-[10px] text-slate-500 font-medium">{user?.position || user?.role}</p>
            </div>
            <ChevronDown className="h-4 w-4 text-slate-400" />
          </button>

          {userMenuOpen && (
            <div className="absolute right-0 mt-2 w-56 rounded-2xl border border-slate-200 bg-white p-2 shadow-2xl z-50 animate-in fade-in">
              <div className="px-3 py-2 border-b border-slate-100">
                <p className="text-xs font-bold text-slate-900">{user?.name}</p>
                <p className="text-[11px] text-slate-500">{user?.email}</p>
                <p className="text-[10px] text-blue-600 font-mono mt-0.5">@{user?.username}</p>
              </div>

              <div className="py-1">
                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    setIsTermsOpen(true);
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  <ShieldCheck className="h-3.5 w-3.5 text-blue-600" />
                  <span>Terms & Privacy Act</span>
                </button>

                <button
                  onClick={() => {
                    setUserMenuOpen(false);
                    logout();
                  }}
                  className="w-full flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition"
                >
                  <LogOut className="h-3.5 w-3.5 text-rose-600" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
    </header>
  );
};

export default Navbar;

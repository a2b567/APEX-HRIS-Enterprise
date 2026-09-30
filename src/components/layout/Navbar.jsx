import React, { useState } from 'react';
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
} from 'lucide-react';
import { useToast } from '../shared/Toast';
import TermsModal from '../shared/TermsModal';

export const Navbar = ({ sidebarOpen, setSidebarOpen }) => {
  const { user, role, logout } = useAuth();
  const { branches } = useData();
  const { formattedTime, formattedDate, greeting } = useClock();
  const { addToast } = useToast();

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  const roleInfo = getRoleBadge(role);
  const userBranch = branches.find((b) => b.id === user?.branchId);



  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6 shadow-sm">
      {/* Left section: Hamburger on mobile + Global Search Input */}
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

      {/* Right section: Live Time, Badges, Switcher, Profile */}
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

import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert } from 'lucide-react';

// NOTE: This is UI-level guard only. Go Fiber backend MUST enforce branch_id isolation.
export const RoleGuard = ({ roles = [], fallback = null, children }) => {
  const { role } = useAuth();

  if (!role || !roles.includes(role)) {
    if (fallback) return fallback;
    return (
      <div className="flex flex-col items-center justify-center p-8 rounded-2xl bg-slate-900/60 border border-rose-500/20 text-center">
        <div className="p-3 bg-rose-500/10 rounded-xl text-rose-400 mb-3">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-200">Access Restricted</h3>
        <p className="text-sm text-slate-400 max-w-md mt-1">
          Your role (<span className="font-semibold text-rose-400">{role}</span>) does not have authorization to view this section.
        </p>
      </div>
    );
  }

  return children;
};

export default RoleGuard;

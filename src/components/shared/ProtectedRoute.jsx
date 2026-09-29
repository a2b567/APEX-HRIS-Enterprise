import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// NOTE: This is UI-level guard only. Go Fiber backend MUST enforce branch_id isolation.
export const ProtectedRoute = ({ children, allowedRoles }) => {
  const { isAuthenticated, role, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent" />
          <p className="text-sm font-medium text-slate-400">Authenticating session...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(role)) {
    // Redirect to proper home based on role
    if (role === 'SUPER_ADMIN') return <Navigate to="/admin/dashboard" replace />;
    if (role === 'SUPERVISOR') return <Navigate to="/supervisor/dashboard" replace />;
    if (role === 'EMPLOYEE') return <Navigate to="/employee/dashboard" replace />;
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;

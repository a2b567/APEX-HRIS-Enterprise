import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

import ProtectedRoute from '../components/shared/ProtectedRoute';
import AppLayout from '../components/layout/AppLayout';

import LoginPage from '../pages/auth/LoginPage';
import KioskPage from '../pages/auth/KioskPage';
import AdminDashboard from '../pages/admin/AdminDashboard';
import BranchManagement from '../pages/admin/BranchManagement';
import SupervisorManagement from '../pages/admin/SupervisorManagement';
import EmployeeManagement from '../pages/employees/EmployeeManagement';
import SupervisorDashboard from '../pages/supervisor/SupervisorDashboard';
import ScanQRPage from '../pages/supervisor/ScanQRPage';
import QRCodeCenter from '../pages/qr/QRCodeCenter';
import EmployeeDashboard from '../pages/employee/EmployeeDashboard';
import MyQRCode from '../pages/employee/MyQRCode';
import MyDTR from '../pages/employee/MyDTR';
import MyPayslips from '../pages/employee/MyPayslips';
import DTRModule from '../pages/dtr/DTRModule';
import PayrollModule from '../pages/payroll/PayrollModule';
import ReportsModule from '../pages/reports/ReportsModule';
import SettingsModule from '../pages/settings/SettingsModule';

export const AppRoutes = () => {
  const { role, isAuthenticated } = useAuth();

  const getDefaultRedirect = () => {
    if (!isAuthenticated) return '/login';
    if (role === 'SUPER_ADMIN') return '/admin/dashboard';
    if (role === 'SUPERVISOR') return '/supervisor/dashboard';
    return '/employee/dashboard';
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/kiosk" element={<KioskPage />} />

      {/* Protected App Shell */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        {/* Default Index Route */}
        <Route index element={<Navigate to={getDefaultRedirect()} replace />} />

        {/* ========================================================================= */}
        {/* SUPER ADMIN DEDICATED ROUTES                                              */}
        {/* NOTE: This is UI-level guard only. Go Fiber backend MUST enforce branch_id isolation. */}
        {/* ========================================================================= */}
        <Route
          path="admin/dashboard"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/branches"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <BranchManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/supervisors"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <SupervisorManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/employees"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <EmployeeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="admin/qr-codes"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <QRCodeCenter />
            </ProtectedRoute>
          }
        />

        {/* ========================================================================= */}
        {/* SUPERVISOR DEDICATED ROUTES (SCOPED STRICTLY TO 1 BRANCH)                */}
        {/* NOTE: This is UI-level guard only. Go Fiber backend MUST enforce branch_id isolation. */}
        {/* ========================================================================= */}
        <Route
          path="supervisor/dashboard"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
              <SupervisorDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="supervisor/scan"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
              <ScanQRPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="supervisor/qr-codes"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
              <QRCodeCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="supervisor/employees"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
              <EmployeeManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="supervisor/dtr"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
              <DTRModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="supervisor/payroll"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
              <PayrollModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="supervisor/reports"
          element={
            <ProtectedRoute allowedRoles={['SUPERVISOR']}>
              <ReportsModule />
            </ProtectedRoute>
          }
        />

        {/* ========================================================================= */}
        {/* EMPLOYEE SELF SERVICE PORTAL                                             */}
        {/* ========================================================================= */}
        <Route
          path="employee/dashboard"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <EmployeeDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="employee/qr"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <MyQRCode />
            </ProtectedRoute>
          }
        />
        <Route
          path="employee/dtr"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <MyDTR />
            </ProtectedRoute>
          }
        />
        <Route
          path="employee/payslips"
          element={
            <ProtectedRoute allowedRoles={['EMPLOYEE']}>
              <MyPayslips />
            </ProtectedRoute>
          }
        />

        {/* ========================================================================= */}
        {/* SHARED / CONSOLIDATED MODULE ROUTES                                      */}
        {/* ========================================================================= */}
        <Route
          path="dtr"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SUPERVISOR', 'EMPLOYEE']}>
              <DTRModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="payroll"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SUPERVISOR']}>
              <PayrollModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="reports"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN', 'SUPERVISOR']}>
              <ReportsModule />
            </ProtectedRoute>
          }
        />
        <Route
          path="settings"
          element={
            <ProtectedRoute allowedRoles={['SUPER_ADMIN']}>
              <SettingsModule />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Catch-all redirect */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

export default AppRoutes;

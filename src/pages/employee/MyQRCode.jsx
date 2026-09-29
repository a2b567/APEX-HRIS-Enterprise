import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import QRCodeBadge from '../../components/qr/QRCodeBadge';
import { QrCode, Shield, CheckCircle2 } from 'lucide-react';

export const MyQRCode = () => {
  const { user } = useAuth();
  const { employees, branches } = useData();

  const employee = useMemo(() => {
    return employees.find((e) => e.userId === user?.id || e.id === user?.employeeId) || employees[0];
  }, [employees, user]);

  const branch = branches.find((b) => b.id === employee?.branchId);

  return (
    <div className="space-y-6 animate-in fade-in duration-300 max-w-lg mx-auto">
      {/* Header */}
      <div className="no-print text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mb-3 shadow-sm">
          <QrCode className="w-6 h-6" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">My Digital Employee Badge</h1>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Present this official QR badge at your branch kiosk or to your supervisor to record attendance.
        </p>
      </div>

      {/* Badge Component */}
      {employee && (
        <QRCodeBadge employee={employee} branch={branch} />
      )}

      <div className="no-print flex items-center justify-center gap-2 text-xs text-slate-500 pt-2 font-medium">
        <Shield className="w-4 h-4 text-emerald-600" />
        <span>Encrypted QR Token · Tied strictly to {branch?.name || employee?.branchId}</span>
      </div>
    </div>
  );
};

export default MyQRCode;

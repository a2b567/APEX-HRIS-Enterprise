import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../../context/DataContext';
import { useClock } from '../../hooks/useClock';
import QRScanner from '../../components/qr/QRScanner';
import ScanResultCard from '../../components/qr/ScanResultCard';
import { encodeQRPayload } from '../../utils/qrUtils';
import {
  Building2,
  Clock,
  LogOut,
  Sparkles,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  Maximize,
} from 'lucide-react';

export const KioskPage = () => {
  const { branches, employees, recordQRScan, settings } = useData();
  const { formattedTime, formattedDate } = useClock();
  const navigate = useNavigate();

  const [kioskBranchId, setKioskBranchId] = useState('BRANCH-001');
  const [scanResult, setScanResult] = useState(null);
  const [countdown, setCountdown] = useState(0);

  const currentBranch = branches.find((b) => b.id === kioskBranchId);
  const branchEmployees = employees.filter((e) => e.branchId === kioskBranchId);
  const otherBranchEmp = employees.find((e) => e.branchId !== kioskBranchId);

  const resetSeconds = settings?.qrSettings?.kioskAutoResetSeconds || 4;

  const handleScan = (qrString) => {
    const result = recordQRScan(qrString, kioskBranchId);
    setScanResult(result);
    setCountdown(resetSeconds);
  };

  // Auto reset timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown((c) => c - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (scanResult) {
      setScanResult(null);
    }
  }, [countdown, scanResult]);

  const handleSimulateScan = (emp) => {
    const payload = encodeQRPayload(emp);
    handleScan(payload);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col justify-between p-4 sm:p-8 relative select-none">
      {/* Top Kiosk Header */}
      <header className="flex flex-col sm:flex-row items-center justify-between gap-4 pb-5 border-b border-slate-200 z-10 bg-white p-5 rounded-2xl shadow-sm">
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-sm">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              {settings.companyName}
            </h1>
            <p className="text-xs text-blue-600 font-semibold flex items-center gap-1.5">
              <span>Attendance Kiosk Station</span> · <span className="font-mono text-slate-600">{currentBranch?.name}</span>
            </p>
          </div>
        </div>

        {/* Live Clock and Location Switcher */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-mono font-bold text-slate-900 tracking-wider">
              {formattedTime}
            </div>
            <p className="text-xs text-slate-500 font-medium">{formattedDate}</p>
          </div>

          <div className="flex items-center gap-2">
            <select
              value={kioskBranchId}
              onChange={(e) => {
                setKioskBranchId(e.target.value);
                setScanResult(null);
              }}
              className="bg-slate-50 border border-slate-200 text-xs text-slate-800 rounded-xl py-2 px-3 focus:ring-2 focus:ring-blue-500 font-medium"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  Kiosk: {b.name} ({b.code})
                </option>
              ))}
            </select>

            <button
              onClick={() => navigate('/login')}
              className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition"
              title="Exit Kiosk Mode"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Kiosk Body */}
      <main className="flex-1 flex flex-col lg:flex-row items-center justify-center gap-8 py-8 z-10 max-w-6xl mx-auto w-full">
        {/* Scanner Box */}
        <div className="w-full max-w-md flex flex-col items-center">
          <div className="mb-3 text-center">
            <span className="px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-semibold uppercase tracking-wider">
              Continuous QR Badge Scanner
            </span>
            <p className="text-xs text-slate-500 mt-1">Please position your badge in the box below</p>
          </div>

          <QRScanner onScanSuccess={handleScan} scannerBranchId={kioskBranchId} isKiosk={true} />
        </div>

        {/* Live Feedback / Result Display Panel */}
        <div className="w-full max-w-md flex flex-col justify-center space-y-4">
          {scanResult ? (
            <div className="space-y-2">
              <ScanResultCard result={scanResult} />
              <div className="flex items-center justify-between text-xs text-slate-500 px-2 font-mono">
                <span>Auto-resetting for next employee...</span>
                <span className="font-bold text-blue-600">{countdown}s</span>
              </div>
            </div>
          ) : (
            <div className="rounded-3xl bg-white border border-slate-200/80 p-8 text-center space-y-3 shadow-sm">
              <div className="h-16 w-16 mx-auto rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-600">
                <QrCode className="w-8 h-8 animate-pulse" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Scanner Active & Ready</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Employees assigned to <strong className="text-slate-800">{currentBranch?.name}</strong> may scan to record Time In or Time Out.
              </p>
            </div>
          )}

          {/* 1-Click Simulation Buttons for testing */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              <span>Simulate Employee Scan</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {branchEmployees.slice(0, 2).map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSimulateScan(emp)}
                  className="p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 text-xs font-semibold truncate border border-slate-200 transition"
                >
                  {emp.name.split(' ')[0]} ({emp.id})
                </button>
              ))}
            </div>

            {otherBranchEmp && (
              <button
                onClick={() => handleSimulateScan(otherBranchEmp)}
                className="w-full mt-1 p-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-800 text-xs font-semibold border border-rose-200 truncate text-left flex items-center justify-between transition"
              >
                <span>Test Other Branch ({otherBranchEmp.name.split(' ')[0]})</span>
                <span className="font-mono text-[10px] text-rose-600 font-bold">Reject Test</span>
              </button>
            )}
          </div>
        </div>
      </main>

      {/* Footer Instructions */}
      <footer className="pt-4 border-t border-slate-200 text-center text-xs text-slate-500 z-10 flex flex-col sm:flex-row items-center justify-between gap-2">
        <span>Shift Grace Period: 15 minutes · Standard Workday: 8.0 hrs</span>
        <span className="font-mono text-blue-600 font-medium">Station ID: KIOSK-{currentBranch?.code}</span>
      </footer>
    </div>
  );
};

export default KioskPage;

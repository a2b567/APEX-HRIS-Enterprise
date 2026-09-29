import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import QRScanner from '../../components/qr/QRScanner';
import ScanResultCard from '../../components/qr/ScanResultCard';
import { encodeQRPayload } from '../../utils/qrUtils';
import { QrCode, Sparkles, Building2, History, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { useToast } from '../../components/shared/Toast';

export const ScanQRPage = () => {
  const { user } = useAuth();
  const { branches, employees, recordQRScan, liveScanFeed } = useData();
  const { addToast } = useToast();

  const [scanResult, setScanResult] = useState(null);
  const supervisorBranchId = user?.branchId;
  const currentBranch = branches.find((b) => b.id === supervisorBranchId);

  // Scoped employees for fast test simulation
  const branchEmployees = employees.filter((e) => e.branchId === supervisorBranchId);
  const otherBranchEmployee = employees.find((e) => e.branchId !== supervisorBranchId);

  const handleScan = (qrString) => {
    const result = recordQRScan(qrString, supervisorBranchId);
    setScanResult(result);

    if (result.success) {
      addToast({
        title: result.action === 'TIME_IN' ? 'Time In Recorded' : 'Time Out Recorded',
        message: result.message,
        type: 'success',
      });
    } else {
      addToast({
        title: result.reason === 'WRONG_BRANCH' ? 'Access Denied' : 'Scan Notice',
        message: result.message,
        type: 'error',
      });
    }
  };

  const handleSimulateScan = (emp) => {
    const payload = encodeQRPayload(emp);
    handleScan(payload);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              On-Site Attendance Scanner
            </span>
            <span className="text-xs text-slate-500 font-medium">
              Branch: {currentBranch?.name} ({supervisorBranchId})
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">QR Code Attendance Scanner</h1>
          <p className="text-xs text-slate-500">
            Hold employee QR badge in front of the camera. System automatically computes Time In / Time Out.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Camera Viewport + Result Card */}
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-3xl bg-white border border-slate-200/80 p-6 shadow-sm">
            <QRScanner onScanSuccess={handleScan} scannerBranchId={supervisorBranchId} />

            {/* Scan Feedback Result Card */}
            {scanResult && (
              <div className="mt-4">
                <ScanResultCard result={scanResult} onClose={() => setScanResult(null)} />
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Simulation Triggers + Recent Scans */}
        <div className="lg:col-span-5 space-y-6">
          {/* 1-Click Simulation Triggers for Fast Testing */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
                Quick Test Simulators
              </h3>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Test scanning staff without holding up a physical camera.
            </p>

            <div className="space-y-2">
              {branchEmployees.slice(0, 3).map((emp) => (
                <button
                  key={emp.id}
                  onClick={() => handleSimulateScan(emp)}
                  className="w-full flex items-center justify-between p-3 rounded-xl bg-emerald-50 hover:bg-emerald-100/80 text-emerald-800 border border-emerald-200 transition text-left text-xs font-semibold"
                >
                  <div className="flex items-center gap-2">
                    <QrCode className="w-4 h-4 text-emerald-600" />
                    <span>Scan: {emp.name}</span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-700">{emp.id}</span>
                </button>
              ))}

              {/* Wrong branch test trigger to verify strict branch isolation rule */}
              {otherBranchEmployee && (
                <div className="pt-2">
                  <button
                    onClick={() => handleSimulateScan(otherBranchEmployee)}
                    className="w-full flex items-center justify-between p-3 rounded-xl bg-rose-50 hover:bg-rose-100/80 text-rose-800 border border-rose-200 transition text-left text-xs font-semibold"
                  >
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>Test Wrong Branch: {otherBranchEmployee.name}</span>
                    </div>
                    <span className="font-mono text-[11px] text-rose-700">{otherBranchEmployee.branchId}</span>
                  </button>
                  <p className="text-[11px] text-rose-600 mt-1 italic">
                    * Verifies that supervisor rejects staff from other branches.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Recent Scans Feed */}
          <div className="rounded-2xl bg-white border border-slate-200/80 p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                <History className="w-4 h-4 text-blue-600" />
                <span>Today's Scan Activity ({liveScanFeed.length})</span>
              </h3>
            </div>

            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-slate-50/50 max-h-72 overflow-y-auto">
              {liveScanFeed.map((scan) => (
                <div key={scan.id} className="p-3 flex items-center justify-between text-xs hover:bg-white transition">
                  <div>
                    <p className="font-bold text-slate-900">{scan.employeeName}</p>
                    <p className="text-[11px] text-slate-500 font-mono">{scan.employeeId} · {scan.branchId}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                        scan.action === 'TIME_IN'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-blue-50 text-blue-700 border-blue-200'
                      }`}
                    >
                      {scan.action === 'TIME_IN' ? 'Time In' : 'Time Out'}
                    </span>
                    <p className="font-mono text-[11px] text-slate-500 mt-0.5">{scan.time}</p>
                  </div>
                </div>
              ))}

              {liveScanFeed.length === 0 && (
                <div className="p-6 text-center text-slate-400 text-xs">
                  No scan logs recorded today yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScanQRPage;

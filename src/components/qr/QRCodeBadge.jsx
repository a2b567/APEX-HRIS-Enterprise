import React, { useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { encodeQRPayload } from '../../utils/qrUtils';
import { Download, Printer, Shield, Building2, Sparkles } from 'lucide-react';
import { useToast } from '../shared/Toast';

export const QRCodeBadge = ({ employee, branch, onRegenerate }) => {
  const qrRef = useRef(null);
  const { addToast } = useToast();

  if (!employee) return null;

  const payloadString = encodeQRPayload(employee);

  const handleDownloadPNG = () => {
    try {
      const canvas = qrRef.current?.querySelector('canvas');
      if (!canvas) return;

      const url = canvas.toDataURL('image/png');
      const a = document.createElement('a');
      a.href = url;
      a.download = `QR_Badge_${employee.id}_${employee.name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);

      addToast({
        title: 'QR Badge Downloaded',
        message: 'Saved high-resolution PNG QR token.',
        type: 'success',
      });
    } catch (e) {
      console.error(e);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col items-center max-w-sm mx-auto">
      {/* Printable ID Card Container */}
      <div
        id="qr-id-badge"
        className="w-full rounded-2xl bg-white border border-slate-200 shadow-lg overflow-hidden p-6 text-center relative"
      >
        {/* Top accent line */}
        <div className="absolute top-0 inset-x-0 h-1.5 bg-blue-600" />

        {/* Company Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2 text-left">
            <div className="h-7 w-7 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold text-xs">
              A
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-900 leading-tight">
                REDMART HRIS Enterprise
              </p>
              <p className="text-[10px] text-slate-400 font-medium">Digital ID & Attendance</p>
            </div>
          </div>
          <span className="font-mono text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200">
            {branch?.code || employee.branchId}
          </span>
        </div>

        {/* QR Code Canvas */}
        <div className="my-5 flex justify-center" ref={qrRef}>
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200">
            <QRCodeCanvas
              value={payloadString}
              size={180}
              level="H"
              includeMargin={false}
              bgColor="#f8fafc"
              fgColor="#0f172a"
            />
          </div>
        </div>

        {/* Employee Info */}
        <div className="space-y-1">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">{employee.name}</h3>
          <p className="text-xs font-semibold text-blue-600">{employee.position}</p>
          <p className="text-[11px] text-slate-500">{employee.department} Department</p>
          <p className="font-mono text-[11px] text-slate-600 font-semibold mt-1">ID: {employee.id}</p>
        </div>

        {/* Branch & Token Footer */}
        <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
          <span className="font-medium text-slate-600">{branch?.name || employee.branchId}</span>
          <span className="font-mono text-[10px] bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">Active</span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="no-print flex items-center gap-2.5 mt-4 w-full">
        <button
          onClick={handleDownloadPNG}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold border border-slate-200 transition shadow-sm"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Save PNG</span>
        </button>

        <button
          onClick={handlePrint}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold shadow-sm transition"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print Badge</span>
        </button>
      </div>
    </div>
  );
};

export default QRCodeBadge;

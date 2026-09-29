import React from 'react';
import Modal from './Modal';
import { ShieldCheck, Lock, FileText, CheckCircle2, AlertCircle } from 'lucide-react';

export const TermsModal = ({ isOpen, onClose, onAccept }) => {
  const handleAccept = () => {
    if (onAccept) onAccept();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Terms of Service & Data Privacy Policy"
      subtitle="Compliant with Republic Act No. 10173 (Philippine Data Privacy Act of 2012)"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs text-slate-600 max-h-[60vh] overflow-y-auto pr-2">
        {/* Security Banner */}
        <div className="p-3.5 rounded-2xl bg-blue-50 border border-blue-200 flex items-start gap-3">
          <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h4 className="font-bold text-slate-900 text-xs">AES-256 Encrypted & Data Protected System</h4>
            <p className="text-[11px] text-slate-600 mt-0.5">
              All employee records, daily time records (DTR), payroll computation matrices, and QR tokens are protected under AES-256 equivalent encryption at rest and in transit.
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <div className="space-y-1.5">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-blue-600" />
            1. Employee Consent for QR & DTR Attendance Logging
          </h4>
          <p className="leading-relaxed">
            By accessing or registering an account on the APEX HRIS Enterprise Platform, you grant consent to the company to process your full name, employee identification number, branch assignment, daily attendance timestamps, and verification document photos solely for payroll computation, timekeeping, and official workforce administration.
          </p>
        </div>

        {/* Section 2 */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <Lock className="w-4 h-4 text-emerald-600" />
            2. Philippine Data Privacy Act (R.A. 10173) Compliance
          </h4>
          <p className="leading-relaxed">
            All personal information and sensitive personal data collected are strictly governed by the National Privacy Commission guidelines. Data will not be shared with third parties, advertisers, or unauthorized personnel without explicit written authorization or legal mandate.
          </p>
        </div>

        {/* Section 3 */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-purple-600" />
            3. Dynamic QR Badge Security Policy
          </h4>
          <p className="leading-relaxed">
            Your QR Badge contains a unique, cryptographically signed token locked to your designated branch assignment. Re-sharing, copying, or falsifying QR code badges for unauthorized punch-in operations is strictly prohibited and constitutes grounds for disciplinary review.
          </p>
        </div>

        {/* Section 4 */}
        <div className="space-y-1.5 border-t border-slate-100 pt-3">
          <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-600" />
            4. System Audit Trail & Account Security
          </h4>
          <p className="leading-relaxed">
            All administrative actions, supervisor branch assignments, employee status toggles, and manual attendance adjustments are logged in an immutable system audit trail with IP timestamp verification.
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between pt-4 border-t border-slate-100 mt-4">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-medium">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>AES-256 Protected · R.A. 10173 Compliant</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition"
          >
            Close
          </button>
          <button
            onClick={handleAccept}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold shadow-sm transition"
          >
            I Accept Terms
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default TermsModal;

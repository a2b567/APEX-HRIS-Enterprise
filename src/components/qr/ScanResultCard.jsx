import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Building2, User } from 'lucide-react';
import { getStatusBadge } from '../../utils/formatters';

export const ScanResultCard = ({ result, onClose }) => {
  if (!result) return null;

  const isSuccess = result.success;
  const isWrongBranch = result.reason === 'WRONG_BRANCH';
  const isAlreadyCompleted = result.reason === 'ALREADY_COMPLETED';
  const isTimeIn = result.action === 'TIME_IN';
  const isLate = result.status === 'Late';

  let cardStyle = 'border-emerald-200 bg-emerald-50 text-emerald-900';
  let Icon = CheckCircle2;
  let iconColor = 'text-emerald-600 bg-emerald-100';
  let title = 'Time In Recorded Successfully';

  if (!isSuccess) {
    if (isWrongBranch) {
      cardStyle = 'border-rose-200 bg-rose-50 text-rose-900';
      Icon = XCircle;
      iconColor = 'text-rose-600 bg-rose-100';
      title = 'ACCESS DENIED: Wrong Branch';
    } else if (isAlreadyCompleted) {
      cardStyle = 'border-rose-300 bg-rose-50 text-rose-950 shadow-rose-100';
      Icon = XCircle;
      iconColor = 'text-rose-600 bg-rose-100 ring-2 ring-rose-200';
      title = '🚫 SCAN BLOCKED: Already Completed (1 In, 1 Out Only)';
    } else if (result.reason === 'EARLY_TIMEOUT_BLOCKED') {
      cardStyle = 'border-amber-300 bg-amber-50 text-amber-950 shadow-amber-100';
      Icon = Clock;
      iconColor = 'text-amber-600 bg-amber-100 ring-2 ring-amber-200';
      title = '⏳ BAWAL PA MAG-OUT: Hindi Pa Oras ng Dismissal';
    } else {
      cardStyle = 'border-amber-200 bg-amber-50 text-amber-900';
      Icon = AlertTriangle;
      iconColor = 'text-amber-600 bg-amber-100';
      title = 'Scan Error';
    }
  } else if (!isTimeIn) {
    cardStyle = 'border-rose-300 bg-rose-50 text-rose-950 shadow-rose-100';
    Icon = Clock;
    iconColor = 'text-rose-600 bg-rose-100 ring-2 ring-rose-200';
    title = '🔴 Time Out Recorded (OUT)';
  } else if (isLate) {
    cardStyle = 'border-amber-200 bg-amber-50 text-amber-900';
    Icon = AlertTriangle;
    iconColor = 'text-amber-600 bg-amber-100';
    title = 'Time In Recorded (LATE)';
  }

  return (
    <div
      className={`w-full rounded-2xl border p-5 shadow-sm animate-in zoom-in-95 duration-150 ${cardStyle}`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2.5 rounded-2xl ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <h4 className="text-base font-bold tracking-tight">{title}</h4>
          <p className="text-xs mt-0.5 opacity-90">{result.message}</p>

          {result.employee && (
            <div className="mt-3 p-3.5 rounded-xl bg-white/80 border border-slate-200/80 shadow-xs space-y-1 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{result.employee.name}</span>
                <span className="font-mono text-blue-600">{result.employee.id}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {result.employee.position} · {result.employee.department}
              </p>
              <div className="flex items-center justify-between text-[11px] text-slate-600 pt-1 border-t border-slate-100">
                <span>Branch: {result.employee.branchId}</span>
                {result.time && <span className="font-mono text-slate-900 font-bold">{result.time}</span>}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScanResultCard;

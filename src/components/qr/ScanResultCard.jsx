import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Clock, Building2, User } from 'lucide-react';
import { getStatusBadge, formatTime } from '../../utils/formatters';

export const ScanResultCard = ({ result, onClose }) => {
  if (!result) return null;

  const isSuccess = result.success;
  const isWrongBranch = result.reason === 'WRONG_BRANCH';
  const isAlreadyCompleted = result.reason === 'ALREADY_COMPLETED';
  const action = result.action || '';
  const isTimeIn = action.includes('IN');
  const isLate = result.status === 'Late';

  let cardStyle = 'border-emerald-200 bg-emerald-50 text-emerald-900';
  let Icon = CheckCircle2;
  let iconColor = 'text-emerald-600 bg-emerald-100';
  let title = result.stepLabel || (isTimeIn ? 'Time In Recorded' : 'Time Out Recorded');

  if (!isSuccess) {
    if (isWrongBranch) {
      cardStyle = 'border-rose-200 bg-rose-50 text-rose-900';
      Icon = XCircle;
      iconColor = 'text-rose-600 bg-rose-100';
      title = 'Access Denied: Wrong Branch';
    } else if (isAlreadyCompleted) {
      cardStyle = 'border-rose-300 bg-rose-50 text-rose-950 shadow-rose-100';
      Icon = XCircle;
      iconColor = 'text-rose-600 bg-rose-100 ring-2 ring-rose-200';
      title = 'Daily Scan Limit Reached (3 In, 3 Out Completed)';
    } else if (result.reason === 'DEBOUNCE') {
      cardStyle = 'border-amber-300 bg-amber-50 text-amber-950 shadow-amber-100';
      Icon = Clock;
      iconColor = 'text-amber-600 bg-amber-100 ring-2 ring-amber-200';
      title = 'Duplicate Scan Prevented';
    } else {
      cardStyle = 'border-amber-200 bg-amber-50 text-amber-900';
      Icon = AlertTriangle;
      iconColor = 'text-amber-600 bg-amber-100';
      title = 'Scan Verification Error';
    }
  } else if (!isTimeIn) {
    cardStyle = 'border-blue-200 bg-blue-50 text-blue-950 shadow-blue-100';
    Icon = Clock;
    iconColor = 'text-blue-600 bg-blue-100 ring-2 ring-blue-200';
    if (!result.stepLabel) title = 'Time Out Recorded Successfully';
  } else if (isLate) {
    cardStyle = 'border-amber-200 bg-amber-50 text-amber-900';
    Icon = AlertTriangle;
    iconColor = 'text-amber-600 bg-amber-100';
    if (!result.stepLabel) title = 'Time In Recorded (Late)';
  }

  const p = result.punches || {};

  return (
    <div
      className={`w-full rounded-2xl border p-5 shadow-sm animate-in zoom-in-95 duration-150 ${cardStyle}`}
    >
      <div className="flex items-start gap-3.5">
        <div className={`p-2.5 rounded-2xl ${iconColor}`}>
          <Icon className="w-6 h-6" />
        </div>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-base font-bold tracking-tight">{title}</h4>
            {result.shortLabel && (
              <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-white/80 border border-slate-200 font-mono">
                {result.shortLabel}
              </span>
            )}
          </div>
          <p className="text-xs mt-0.5 opacity-90">{result.message}</p>

          {result.employee && (
            <div className="mt-3 p-3.5 rounded-xl bg-white/90 border border-slate-200/80 shadow-xs space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-900">
                <span>{result.employee.name}</span>
                <span className="font-mono text-blue-600">{result.employee.id}</span>
              </div>
              <p className="text-[11px] text-slate-500">
                {result.employee.position} · {result.employee.department}
              </p>

              {/* 3 Sessions In/Out Tracker */}
              <div className="pt-2 border-t border-slate-100 grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                  <div className="font-bold text-slate-600">Session 1 (AM)</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {p.in1 ? formatTime(p.in1) : '—'} / {p.out1 ? formatTime(p.out1) : '—'}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                  <div className="font-bold text-slate-600">Session 2 (PM)</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {p.in2 ? formatTime(p.in2) : '—'} / {p.out2 ? formatTime(p.out2) : '—'}
                  </div>
                </div>
                <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-1.5">
                  <div className="font-bold text-slate-600">Session 3 (OT)</div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                    {p.in3 ? formatTime(p.in3) : '—'} / {p.out3 ? formatTime(p.out3) : '—'}
                  </div>
                </div>
              </div>

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

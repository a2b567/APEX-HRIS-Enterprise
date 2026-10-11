import React, { useMemo } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useData } from '../../context/DataContext';
import { useClock } from '../../hooks/useClock';
import {
  Calendar,
  Clock,
  Coffee,
  CheckCircle2,
  CalendarDays,
  ShieldCheck,
  Building2,
  Sparkles,
  Sun,
  Moon,
  Info,
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { key: 'Monday', label: 'Mon', fullName: 'Monday' },
  { key: 'Tuesday', label: 'Tue', fullName: 'Tuesday' },
  { key: 'Wednesday', label: 'Wed', fullName: 'Wednesday' },
  { key: 'Thursday', label: 'Thu', fullName: 'Thursday' },
  { key: 'Friday', label: 'Fri', fullName: 'Friday' },
  { key: 'Saturday', label: 'Sat', fullName: 'Saturday' },
  { key: 'Sunday', label: 'Sun', fullName: 'Sunday' },
];

export const MySchedule = () => {
  const { user } = useAuth();
  const { employees, branches, getEmployeeSchedule } = useData();
  const { formattedTime, formattedDate } = useClock();

  const employee = useMemo(() => {
    return employees.find((e) => e.userId === user?.id || e.id === user?.employeeId) || employees[0];
  }, [employees, user]);

  const branch = useMemo(() => {
    return branches.find((b) => b.id === employee?.branchId);
  }, [branches, employee?.branchId]);

  const schedule = useMemo(() => {
    if (!employee) {
      return {
        shiftName: 'Standard Day Shift',
        startTime: '08:00',
        endTime: '17:00',
        breakMinutes: 60,
        gracePeriodMinutes: 15,
        restDays: ['Sunday'],
      };
    }
    return getEmployeeSchedule(employee.id);
  }, [employee, getEmployeeSchedule]);

  // Determine current day of week
  const todayDayName = useMemo(() => {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date().getDay()];
  }, []);

  const isRestDayToday = (schedule.restDays || ['Sunday']).includes(todayDayName);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
              Shift Timetable & Rest Days
            </span>
            <span className="text-xs text-blue-600 font-mono font-semibold">{employee?.id}</span>
          </div>
          <h1 className="mt-1 text-2xl font-bold text-slate-900 tracking-tight">My Work Schedule</h1>
          <p className="text-xs text-slate-500">
            View your official working shift hours, break schedule, and designated weekly rest days.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="bg-white border border-slate-200 px-3.5 py-2 rounded-xl text-xs font-semibold text-slate-700 shadow-xs flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>{formattedTime}</span>
          </div>
        </div>
      </div>

      {/* Hero Banner: Today's Work Status */}
      <div className="rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-navy-900 p-6 text-white shadow-md relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-xs text-xs font-semibold text-blue-100 border border-white/20">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Today is {todayDayName} ({formattedDate})</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              {isRestDayToday ? 'Rest Day — Enjoy your time off!' : `Active Shift: ${schedule.shiftName}`}
            </h2>
            <p className="text-sm text-blue-100/90 max-w-xl">
              {isRestDayToday
                ? 'You are scheduled for your official weekly Rest Day today. No punch-in required unless assigned to Rest Day duty.'
                : `Your official working shift is from ${schedule.startTime} to ${schedule.endTime}. A ${schedule.gracePeriodMinutes || 15}-minute grace period applies to avoid tardiness.`}
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-4 border border-white/20 shrink-0 min-w-[200px] text-center">
            <span className="text-xs font-medium text-blue-200 uppercase tracking-wider block">Today's Shift Hours</span>
            <div className="text-2xl font-mono font-bold mt-1">
              {isRestDayToday ? 'REST DAY' : `${schedule.startTime} – ${schedule.endTime}`}
            </div>
            <span className="text-[11px] text-blue-200/80 block mt-1">
              {branch?.name || 'Assigned Branch'}
            </span>
          </div>
        </div>
      </div>

      {/* 7-Day Weekly Schedule Breakdown */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-slate-900">Weekly Schedule Roster</h3>
            <p className="text-xs text-slate-500">Scheduled shifts and rest days for the current cycle</p>
          </div>
          <span className="text-xs font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
            7 Days Scheduled
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
          {DAYS_OF_WEEK.map((d) => {
            const isToday = d.fullName === todayDayName;
            const isRest = (schedule.restDays || ['Sunday']).includes(d.fullName);

            return (
              <div
                key={d.key}
                className={`rounded-2xl p-4 border transition flex flex-col justify-between ${isToday
                  ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40'
                  : isRest
                    ? 'border-purple-200/80 bg-purple-50/30'
                    : 'border-slate-200/80 bg-slate-50/50 hover:bg-slate-50'
                  }`}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">{d.label}</span>
                    {isToday && (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-blue-600 text-white">
                        Today
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 font-medium">{d.fullName}</p>

                  <div className="mt-3">
                    {isRest ? (
                      <div className="py-2 px-2.5 rounded-xl bg-purple-100 text-purple-800 text-center font-bold text-xs border border-purple-200">
                        REST DAY
                      </div>
                    ) : (
                      <div className="py-2 px-2.5 rounded-xl bg-white text-slate-900 border border-slate-200 text-center font-mono font-bold text-xs shadow-2xs">
                        {schedule.startTime} - {schedule.endTime}
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-3 pt-2.5 border-t border-slate-200/60 text-[10px] text-slate-500 flex items-center justify-between">
                  <span>{isRest ? 'Off Duty' : '8.0 hrs work'}</span>
                  <span>{isRest ? '0 hrs' : '1 hr lunch'}</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Shift Rules & Policies Quick Reference */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Grace Period Policy</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              You are granted a {schedule.gracePeriodMinutes || 15}-minute grace period after scheduled shift start ({schedule.startTime}). Punching in after this period will be marked as Tardiness / Late.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Coffee className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Break Schedule</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Standard {schedule.breakMinutes || 60}-minute unpaid meal break is automatically factored into your net computed regular hours for full 8-hour shift compliance.
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-xs flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900">Branch Location</h4>
            <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
              Assigned to {branch?.name || 'Assigned Branch'}. Ensure attendance scans are executed at your designated branch kiosk terminal.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MySchedule;

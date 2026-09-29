import React from 'react';

export const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  accentColor = 'blue', // 'blue' | 'emerald' | 'amber' | 'rose' | 'purple' | 'indigo' | 'cyan'
  trend,
  trendLabel,
  onClick,
}) => {
  const colorMap = {
    blue: {
      iconBg: 'bg-blue-50 text-blue-600 border border-blue-100',
      borderGlow: 'hover:border-blue-300',
    },
    emerald: {
      iconBg: 'bg-emerald-50 text-emerald-600 border border-emerald-100',
      borderGlow: 'hover:border-emerald-300',
    },
    amber: {
      iconBg: 'bg-amber-50 text-amber-600 border border-amber-100',
      borderGlow: 'hover:border-amber-300',
    },
    rose: {
      iconBg: 'bg-rose-50 text-rose-600 border border-rose-100',
      borderGlow: 'hover:border-rose-300',
    },
    purple: {
      iconBg: 'bg-purple-50 text-purple-600 border border-purple-100',
      borderGlow: 'hover:border-purple-300',
    },
    indigo: {
      iconBg: 'bg-indigo-50 text-indigo-600 border border-indigo-100',
      borderGlow: 'hover:border-indigo-300',
    },
    cyan: {
      iconBg: 'bg-cyan-50 text-cyan-600 border border-cyan-100',
      borderGlow: 'hover:border-cyan-300',
    },
  };

  const scheme = colorMap[accentColor] || colorMap.blue;

  return (
    <div
      onClick={onClick}
      className={`group relative rounded-2xl bg-white border border-slate-200/90 p-5 shadow-card hover:shadow-card-hover transition-all duration-200 ${
        onClick ? 'cursor-pointer' : ''
      } ${scheme.borderGlow}`}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">{value}</p>
        </div>
        {Icon && (
          <div className={`rounded-2xl p-3 shadow-sm ${scheme.iconBg}`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={`font-bold px-1.5 py-0.5 rounded ${
                trend > 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
              }`}
            >
              {trend > 0 ? `+${trend}%` : `${trend}%`}
            </span>
          )}
          {subtitle && <span className="text-slate-500 font-medium">{subtitle}</span>}
          {trendLabel && <span className="text-slate-400">· {trendLabel}</span>}
        </div>
      )}
    </div>
  );
};

export default StatCard;

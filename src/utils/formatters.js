/**
 * Formatters for currency, dates, numbers, and Figma-styled display badges
 */

export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₱0.00';
  return new Intl.NumberFormat('en-PH', {
    style: 'currency',
    currency: 'PHP',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (dateString, formatStr = 'PPP') => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return dateString;
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateString;
  }
};

export const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  try {
    const [hours, minutes] = timeStr.split(':');
    const h = parseInt(hours, 10);
    const m = parseInt(minutes, 10);
    const ampm = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 || 12;
    const displayM = m < 10 ? `0${m}` : m;
    return `${displayH}:${displayM} ${ampm}`;
  } catch {
    return timeStr;
  }
};

export const formatHours = (hours) => {
  if (hours === undefined || hours === null || isNaN(hours)) return '0.0 hrs';
  return `${Number(hours).toFixed(1)} hrs`;
};

export const getRoleBadge = (role) => {
  switch (role) {
    case 'SUPER_ADMIN':
      return {
        label: 'Super Admin',
        badgeClass: 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold',
        dotClass: 'bg-purple-500',
        accentColor: '#9333ea',
      };
    case 'SUPERVISOR':
      return {
        label: 'Supervisor',
        badgeClass: 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold',
        dotClass: 'bg-blue-500',
        accentColor: '#2563eb',
      };
    case 'EMPLOYEE':
      return {
        label: 'Employee',
        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200 font-semibold',
        dotClass: 'bg-slate-500',
        accentColor: '#64748b',
      };
    default:
      return {
        label: role,
        badgeClass: 'bg-slate-100 text-slate-700 border border-slate-200',
        dotClass: 'bg-slate-400',
        accentColor: '#64748b',
      };
  }
};

export const getStatusBadge = (status) => {
  switch (status) {
    case 'Present':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
    case 'Late':
      return 'bg-amber-50 text-amber-700 border-amber-200 font-medium';
    case 'Absent':
      return 'bg-rose-50 text-rose-700 border-rose-200 font-medium';
    case 'On Leave':
      return 'bg-cyan-50 text-cyan-700 border-cyan-200 font-medium';
    case 'Active':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200 font-medium';
    case 'Inactive':
      return 'bg-slate-100 text-slate-600 border-slate-200 font-medium';
    default:
      return 'bg-slate-100 text-slate-700 border-slate-200';
  }
};

/**
 * DTR Calculation Engine
 * - Grace period: 15 minutes (08:00 -> up to 08:15 no late penalty, after 08:15 late from 08:00)
 * - Standard work hours: 8 hours
 * - Overtime: hours beyond 8 hours or work after scheduled end time (17:00)
 */

export const calculateTimeEntry = (timeIn, timeOut, breakMinutes = 60, shift = { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: 15 }) => {
  if (!timeIn || !timeOut) {
    return {
      regularHours: 0,
      overtimeHours: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      status: 'Absent',
    };
  }

  const [inH, inM] = timeIn.split(':').map(Number);
  const [outH, outM] = timeOut.split(':').map(Number);
  const [shiftStartH, shiftStartM] = shift.startTime.split(':').map(Number);
  const [shiftEndH, shiftEndM] = shift.endTime.split(':').map(Number);

  const inMinutes = inH * 60 + inM;
  const outMinutes = outH * 60 + outM;
  const shiftStartMinutes = shiftStartH * 60 + shiftStartM;
  const shiftEndMinutes = shiftEndH * 60 + shiftEndM;

  let totalWorkedMinutes = Math.max(0, outMinutes - inMinutes - breakMinutes);
  if (totalWorkedMinutes < 0) totalWorkedMinutes = 0;

  // Check Lateness
  let lateMinutes = 0;
  if (inMinutes > shiftStartMinutes + shift.gracePeriodMinutes) {
    // If past grace period, penalty is counted from actual shift start
    lateMinutes = inMinutes - shiftStartMinutes;
  }

  // Check Undertime
  let undertimeMinutes = 0;
  if (outMinutes < shiftEndMinutes) {
    undertimeMinutes = shiftEndMinutes - outMinutes;
  }

  // Check Overtime (after 17:00)
  let overtimeMinutes = 0;
  if (outMinutes > shiftEndMinutes) {
    overtimeMinutes = outMinutes - shiftEndMinutes;
  }

  const regularMinutes = Math.min(8 * 60, Math.max(0, totalWorkedMinutes - overtimeMinutes));
  const regularHours = Number((regularMinutes / 60).toFixed(2));
  const overtimeHours = Number((overtimeMinutes / 60).toFixed(2));

  let status = 'Present';
  if (lateMinutes > 0) {
    status = 'Late';
  }
  if (regularHours < 4 && regularHours > 0) {
    status = 'Half-day';
  }

  return {
    regularHours,
    overtimeHours,
    lateMinutes,
    undertimeMinutes,
    status,
  };
};

/**
 * DTR Calculation Engine
 * - Grace period: 15 minutes (08:00 -> up to 08:15 no late penalty, after 08:15 late from 08:00)
 * - Standard work hours: 8 hours
 * - Overtime: hours beyond 8 hours or work after scheduled end time (17:00)
 */

export const calculateTimeEntry = (
  timeIn,
  timeOut,
  breakMinutes = 60,
  shift = { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: 15 }
) => {
  if (!timeIn && !timeOut) {
    return {
      regularHours: 0,
      overtimeHours: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      status: 'Absent',
    };
  }

  const shiftStart = shift?.startTime || '08:00';
  const shiftEnd = shift?.endTime || '17:00';
  const grace = shift?.gracePeriodMinutes !== undefined ? shift.gracePeriodMinutes : 15;

  const [shiftStartH, shiftStartM] = shiftStart.split(':').map(Number);
  const [shiftEndH, shiftEndM] = shiftEnd.split(':').map(Number);
  const shiftStartMinutes = shiftStartH * 60 + shiftStartM;
  const shiftEndMinutes = shiftEndH * 60 + shiftEndM;

  let lateMinutes = 0;
  let inMinutes = 0;

  if (timeIn) {
    const [inH, inM] = timeIn.split(':').map(Number);
    inMinutes = inH * 60 + inM;
    if (inMinutes > shiftStartMinutes + grace) {
      lateMinutes = inMinutes - shiftStartMinutes;
    }
  }

  // When only Time In is logged (employee is currently punched in for the day)
  if (!timeOut) {
    return {
      regularHours: 0,
      overtimeHours: 0,
      lateMinutes,
      undertimeMinutes: 0,
      status: lateMinutes > 0 ? 'Late' : 'Present',
    };
  }

  const [outH, outM] = timeOut.split(':').map(Number);
  const outMinutes = outH * 60 + outM;

  let totalWorkedMinutes = Math.max(0, outMinutes - inMinutes - breakMinutes);
  if (totalWorkedMinutes < 0) totalWorkedMinutes = 0;

  // Check Undertime
  let undertimeMinutes = 0;
  if (outMinutes < shiftEndMinutes) {
    undertimeMinutes = shiftEndMinutes - outMinutes;
  }

  // Check Overtime (after scheduled shift end)
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

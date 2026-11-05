/**
 * DTR Calculation Engine
 * Supports 4-session In & Out (8 punches per day):
 * - Session 1: Morning In (in1) & Morning Break Out (out1)
 * - Session 2: Morning Break In (in2) & Lunch Break Out (out2)
 * - Session 3: Lunch Break In (in3) & Regular Shift Dismissal (out3)
 * - Session 4: Overtime In (in4) & Overtime Out (out4)
 *
 * Rules:
 * - Grace period: 15 minutes (08:00 -> up to 08:15 no late penalty, after 08:15 late from 08:00)
 * - Standard work hours: 8 hours
 * - Overtime: hours in Session 4 (OT) or work beyond 8 regular hours
 */

export const calculateMultiSessionTimeEntry = (
  record = {},
  shift = { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: 15 }
) => {
  const in1 = record.in1 || record.timeIn || null;
  const out1 = record.out1 || (record.in2 ? null : record.timeOut) || null;
  const in2 = record.in2 || null;
  const out2 = record.out2 || null;
  const in3 = record.in3 || null;
  const out3 = record.out3 || null;
  const in4 = record.in4 || null;
  const out4 = record.out4 || null;

  if (!in1 && !in2 && !in3 && !in4) {
    return {
      regularHours: 0,
      overtimeHours: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      status: 'Absent',
      totalWorkedMinutes: 0,
    };
  }

  const shiftStart = shift?.startTime || '08:00';
  const shiftEnd = shift?.endTime || '17:00';
  const grace = shift?.gracePeriodMinutes !== undefined ? shift.gracePeriodMinutes : 15;

  const [shiftStartH, shiftStartM] = shiftStart.split(':').map(Number);
  const [shiftEndH, shiftEndM] = shiftEnd.split(':').map(Number);
  const shiftStartMinutes = shiftStartH * 60 + shiftStartM;
  const shiftEndMinutes = shiftEndH * 60 + shiftEndM;

  // Tardiness checked on first punch-in against shift start + grace period
  let lateMinutes = 0;
  if (in1) {
    const [inH, inM] = in1.split(':').map(Number);
    const inMins = inH * 60 + inM;
    if (inMins > shiftStartMinutes + grace) {
      lateMinutes = inMins - shiftStartMinutes;
    }
  }

  const toMinutes = (timeStr) => {
    if (!timeStr) return null;
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const getSessionMinutes = (inStr, outStr) => {
    const inM = toMinutes(inStr);
    const outM = toMinutes(outStr);
    if (inM === null || outM === null) return 0;
    return Math.max(0, outM - inM);
  };

  const s1Minutes = getSessionMinutes(in1, out1);
  const s2Minutes = getSessionMinutes(in2, out2);
  const s3Minutes = getSessionMinutes(in3, out3);
  const s4Minutes = getSessionMinutes(in4, out4);

  // Compensable coffee/morning break (short rest periods <= 20 min under DOLE / Labor Code Art. 84)
  let compensableBreakM = 0;
  if (out1 && in2) {
    const gap = getSessionMinutes(out1, in2);
    if (gap > 0 && gap <= 20) {
      compensableBreakM = gap;
    }
  }

  let totalWorkedMinutes = 0;
  if (out1 && !in2 && !in3 && !in4) {
    // Single session fallback
    const breakMinutes = (s1Minutes > 300) ? (record.breakMinutes ?? 60) : 0;
    totalWorkedMinutes = Math.max(0, s1Minutes - breakMinutes);
  } else {
    // Multi-session
    totalWorkedMinutes = s1Minutes + s2Minutes + s3Minutes + compensableBreakM + s4Minutes;
  }

  // Calculate Overtime:
  // 1. Any minutes rendered in Session 4 (Overtime session)
  // 2. Any minutes in Session 3 rendered past shiftEnd (17:00)
  // 3. Regular hours exceeding 8 hours (480 mins)
  let overtimeMinutes = 0;

  if (s4Minutes > 0) {
    overtimeMinutes += s4Minutes;
  }

  const out3M = toMinutes(out3);
  if (out3M && out3M > shiftEndMinutes && !s4Minutes) {
    const extraM = Math.min(s3Minutes, out3M - shiftEndMinutes);
    overtimeMinutes += extraM;
  }

  const regularSessionsMinutes = s1Minutes + s2Minutes + s3Minutes + compensableBreakM;
  if (regularSessionsMinutes > 480) {
    const excess = regularSessionsMinutes - 480;
    if (excess > overtimeMinutes) {
      overtimeMinutes = excess;
    }
  }

  const regularMinutes = Math.min(480, Math.max(0, totalWorkedMinutes - overtimeMinutes));
  const regularHours = Number((regularMinutes / 60).toFixed(2));
  const overtimeHours = Number((overtimeMinutes / 60).toFixed(2));

  // Undertime calculation:
  // If the day's regular departure has been clocked out (out3, or out2/out1 if earlier finish)
  let undertimeMinutes = 0;
  const isFinalOutClocked = Boolean(out4 || out3 || (out2 && !in3) || (out1 && !in2));
  if (isFinalOutClocked && regularMinutes < 480) {
    const activeOut = out3 || out2 || out1;
    const activeOutM = toMinutes(activeOut);
    if (activeOutM && activeOutM < shiftEndMinutes) {
      undertimeMinutes = Math.min(shiftEndMinutes - activeOutM, 480 - regularMinutes);
    }
  }

  let status = 'Present';
  if (lateMinutes > 0) status = 'Late';
  if (regularHours < 4 && regularHours > 0 && isFinalOutClocked) status = 'Half-day';
  if (totalWorkedMinutes === 0 && (in1 || in2 || in3 || in4)) {
    status = lateMinutes > 0 ? 'Late' : 'Present';
  }

  return {
    regularHours,
    overtimeHours,
    lateMinutes,
    undertimeMinutes,
    status,
    totalWorkedMinutes,
    s1Minutes,
    s2Minutes,
    s3Minutes,
    s4Minutes,
  };
};

export const calculateTimeEntry = (
  timeInOrRecord,
  timeOut,
  breakMinutes = 60,
  shift = { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: 15 }
) => {
  if (timeInOrRecord && typeof timeInOrRecord === 'object') {
    return calculateMultiSessionTimeEntry(timeInOrRecord, timeOut || shift);
  }

  const timeIn = timeInOrRecord;
  if (!timeIn && !timeOut) {
    return {
      regularHours: 0,
      overtimeHours: 0,
      lateMinutes: 0,
      undertimeMinutes: 0,
      status: 'Absent',
    };
  }

  return calculateMultiSessionTimeEntry({ timeIn, timeOut, breakMinutes }, shift);
};



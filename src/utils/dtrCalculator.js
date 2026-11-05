/**
 * DTR Calculation Engine
 * Supports single time in/out as well as 3-session In & Out (6 punches per day):
 * - Session 1: Morning In (in1) & Lunch Out (out1)
 * - Session 2: Afternoon In (in2) & Shift Dismissal (out2)
 * - Session 3: Overtime In (in3) & Overtime Out (out3)
 *
 * Rules:
 * - Grace period: 15 minutes (08:00 -> up to 08:15 no late penalty, after 08:15 late from 08:00)
 * - Standard work hours: 8 hours
 * - Overtime: hours beyond 8 hours or work in Session 3 / past shift end
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

  if (!in1 && !in2 && !in3) {
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

  let totalWorkedMinutes = 0;
  if (out1 && !in2 && !in3) {
    // Single session fallback: if single continuous session > 5h, deduct standard 60m lunch break
    const breakMinutes = (s1Minutes > 300) ? (record.breakMinutes ?? 60) : 0;
    totalWorkedMinutes = Math.max(0, s1Minutes - breakMinutes);
  } else {
    // Multi-session: meal/break time between out1 and in2 is already excluded naturally
    totalWorkedMinutes = s1Minutes + s2Minutes + s3Minutes;
  }

  // Calculate Overtime:
  // 1. Any minutes rendered in Session 3 (Overtime session)
  // 2. Any minutes in Session 2 rendered past shiftEnd (17:00)
  // 3. Regular hours exceeding 8 hours (480 mins)
  let overtimeMinutes = 0;

  if (s3Minutes > 0) {
    overtimeMinutes += s3Minutes;
  }

  const out2M = toMinutes(out2);
  if (out2M && out2M > shiftEndMinutes && !s3Minutes) {
    const extraM = Math.min(s2Minutes, out2M - shiftEndMinutes);
    overtimeMinutes += extraM;
  }

  const regularSessionsMinutes = s1Minutes + s2Minutes;
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
  // If the day's regular departure has been clocked out (out2, or out1 without subsequent sessions)
  let undertimeMinutes = 0;
  const isFinalOutClocked = Boolean(out3 || out2 || (out1 && !in2));
  if (isFinalOutClocked && regularMinutes < 480) {
    const activeOut = out2 || out1;
    const activeOutM = toMinutes(activeOut);
    if (activeOutM && activeOutM < shiftEndMinutes) {
      undertimeMinutes = Math.min(shiftEndMinutes - activeOutM, 480 - regularMinutes);
    }
  }

  let status = 'Present';
  if (lateMinutes > 0) status = 'Late';
  if (regularHours < 4 && regularHours > 0 && isFinalOutClocked) status = 'Half-day';
  if (totalWorkedMinutes === 0 && (in1 || in2 || in3)) {
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
  };
};

export const calculateTimeEntry = (
  timeInOrRecord,
  timeOut,
  breakMinutes = 60,
  shift = { startTime: '08:00', endTime: '17:00', gracePeriodMinutes: 15 }
) => {
  // Check if first parameter is an object (record)
  if (timeInOrRecord && typeof timeInOrRecord === 'object') {
    return calculateMultiSessionTimeEntry(timeInOrRecord, timeOut || shift);
  }

  // Standard legacy signature: calculateTimeEntry(timeIn, timeOut, breakMinutes, shift)
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


/**
 * Philippine Labor Standard Payroll Calculator
 * Multi-Branch Architecture
 */

export const computeEmployeePayroll = (employee, attendanceLogs = [], cutoffType = '1-15', selectedMonth = new Date().toISOString().slice(0, 7), settings) => {
  const dailyRate = Number(employee.dailyRate) || 0;
  const hourlyRate = Number(employee.hourlyRate) || (dailyRate / 8);
  const otMultiplier = settings?.payrollRules?.overtimeMultiplier || 1.25;

  // Filter attendance logs for this employee within the cutoff period
  const [yearStr, monthStr] = selectedMonth.split('-');
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10); // 1-indexed

  const empLogs = attendanceLogs.filter((log) => {
    if (log.employeeId !== employee.id) return false;
    if (!log.date) return false;
    const [logYear, logMonth, logDay] = log.date.split('-').map(Number);
    if (logYear !== year || logMonth !== month) return false;

    if (cutoffType === '1-15') {
      return logDay >= 1 && logDay <= 15;
    } else {
      return logDay >= 16 && logDay <= 31;
    }
  });

  let daysWorked = 0;
  let totalRegularHours = 0;
  let totalOvertimeHours = 0;
  let totalLateMinutes = 0;
  let totalUndertimeMinutes = 0;
  let absentDays = 0;

  empLogs.forEach((log) => {
    if (log.status === 'Present' || log.status === 'Late') {
      daysWorked += 1;
      totalRegularHours += Number(log.regularHours) || 0;
      totalOvertimeHours += Number(log.overtimeHours) || 0;
      totalLateMinutes += Number(log.lateMinutes) || 0;
      totalUndertimeMinutes += Number(log.undertimeMinutes) || 0;
    } else if (log.status === 'Half-day') {
      daysWorked += 0.5;
      totalRegularHours += Number(log.regularHours) || 0;
      totalOvertimeHours += Number(log.overtimeHours) || 0;
      totalLateMinutes += Number(log.lateMinutes) || 0;
    } else if (log.status === 'Absent') {
      absentDays += 1;
    }
  });

  // Basic Pay
  const basicPay = daysWorked * dailyRate;

  // Overtime Pay
  const overtimePay = totalOvertimeHours * (hourlyRate * otMultiplier);

  // Late & Undertime Deduction
  const minuteRate = hourlyRate / 60;
  const lateDeduction = totalLateMinutes * minuteRate;
  const undertimeDeduction = totalUndertimeMinutes * minuteRate;
  const attendanceDeduction = lateDeduction + undertimeDeduction;

  // Allowance (e.g. 500 transportation/rice allowance per cutoff)
  const allowances = 500.00;

  // Gross Pay
  const grossPay = Math.max(0, basicPay + overtimePay - attendanceDeduction + allowances);

  // Statutory Deductions (Calculated per semi-monthly cutoff)
  // SSS Contribution (approx 4.5% employee share)
  const sssDeduction = Math.min(1125, Math.round(grossPay * 0.045));

  // PhilHealth (2.5% semi-monthly employee share)
  const philHealthDeduction = Math.round(grossPay * 0.025);

  // Pag-IBIG (₱100 per cutoff)
  const pagIbigDeduction = 100.00;

  // Withholding Tax (Estimated Train Law bracket)
  let withholdingTax = 0;
  const taxableIncome = grossPay - (sssDeduction + philHealthDeduction + pagIbigDeduction);
  if (taxableIncome > 10417) {
    withholdingTax = (taxableIncome - 10417) * 0.15;
  }

  const totalDeductions = sssDeduction + philHealthDeduction + pagIbigDeduction + withholdingTax;
  const netPay = Math.max(0, grossPay - totalDeductions);

  return {
    employeeId: employee.id,
    employeeName: employee.name,
    branchId: employee.branchId,
    position: employee.position,
    department: employee.department,
    dailyRate,
    hourlyRate,
    daysWorked,
    absentDays,
    totalRegularHours: Number(totalRegularHours.toFixed(1)),
    totalOvertimeHours: Number(totalOvertimeHours.toFixed(1)),
    totalLateMinutes,
    totalUndertimeMinutes,
    basicPay: Number(basicPay.toFixed(2)),
    overtimePay: Number(overtimePay.toFixed(2)),
    lateDeduction: Number(lateDeduction.toFixed(2)),
    undertimeDeduction: Number(undertimeDeduction.toFixed(2)),
    attendanceDeduction: Number(attendanceDeduction.toFixed(2)),
    allowances: Number(allowances.toFixed(2)),
    grossPay: Number(grossPay.toFixed(2)),
    sssDeduction: Number(sssDeduction.toFixed(2)),
    philHealthDeduction: Number(philHealthDeduction.toFixed(2)),
    pagIbigDeduction: Number(pagIbigDeduction.toFixed(2)),
    withholdingTax: Number(withholdingTax.toFixed(2)),
    totalDeductions: Number(totalDeductions.toFixed(2)),
    netPay: Number(netPay.toFixed(2)),
    cutoffType,
    selectedMonth,
  };
};

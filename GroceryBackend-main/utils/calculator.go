package utils

import (
	"math"
	"strconv"
	"strings"
	"time"
)

// ParseTimeToMinutes converts "HH:MM" (e.g. "08:30") to minutes since midnight
func ParseTimeToMinutes(timeStr string) int {
	parts := strings.Split(timeStr, ":")
	if len(parts) != 2 {
		return 0
	}
	h, _ := strconv.Atoi(parts[0])
	m, _ := strconv.Atoi(parts[1])
	return h*60 + m
}

// CalculateLateMinutes calculates minutes late relative to scheduled time in
func CalculateLateMinutes(scheduledIn string, actualIn time.Time) int {
	schedMin := ParseTimeToMinutes(scheduledIn)
	actualMin := actualIn.Hour()*60 + actualIn.Minute()

	if actualMin > schedMin {
		return actualMin - schedMin
	}
	return 0
}

// CalculateUndertimeMinutes calculates minutes departed early relative to scheduled time out
func CalculateUndertimeMinutes(scheduledOut string, actualOut time.Time) int {
	schedMin := ParseTimeToMinutes(scheduledOut)
	actualMin := actualOut.Hour()*60 + actualOut.Minute()

	if actualMin < schedMin {
		return schedMin - actualMin
	}
	return 0
}

// CalculateTotalHours returns total working hours minus break duration
func CalculateTotalHours(actualIn, actualOut time.Time, breakMinutes int) float64 {
	duration := actualOut.Sub(actualIn).Minutes()
	netMinutes := duration - float64(breakMinutes)
	if netMinutes < 0 {
		netMinutes = 0
	}
	hours := netMinutes / 60.0
	return math.Round(hours*100) / 100
}

// CalculateRegularHours returns min(total, scheduledHours)
func CalculateRegularHours(totalHours, scheduledHours float64) float64 {
	if totalHours > scheduledHours {
		return scheduledHours
	}
	return totalHours
}

// CalculateOvertimeHours returns max(0, total - scheduledHours)
func CalculateOvertimeHours(totalHours, scheduledHours float64) float64 {
	if totalHours > scheduledHours {
		diff := totalHours - scheduledHours
		return math.Round(diff*100) / 100
	}
	return 0
}

// CalculateAttendanceStatus determines status: Present | Late | Undertime | Half Day | Absent | Overtime | Rest Day | Leave
func CalculateAttendanceStatus(lateMinutes, undertimeMinutes int, totalHours, scheduledHours float64, isRestDay, onLeave bool) string {
	if onLeave {
		return "Leave"
	}
	if isRestDay {
		return "Rest Day"
	}
	if totalHours <= 0 {
		return "Absent"
	}
	if totalHours < (scheduledHours / 2.0) {
		return "Half Day"
	}
	if totalHours > scheduledHours {
		return "Overtime"
	}
	if lateMinutes > 0 && undertimeMinutes > 0 {
		return "Late & Undertime"
	}
	if lateMinutes > 0 {
		return "Late"
	}
	if undertimeMinutes > 0 {
		return "Undertime"
	}
	return "Present"
}

// CalculateDailyRate calculates daily rate based on monthly rate / working days
func CalculateDailyRate(monthlyRate float64, workingDays int) float64 {
	if workingDays <= 0 {
		workingDays = 26
	}
	return math.Round((monthlyRate/float64(workingDays))*100) / 100
}

// CalculateHourlyRate calculates hourly rate based on daily rate / 8
func CalculateHourlyRate(dailyRate float64) float64 {
	return math.Round((dailyRate/8.0)*100) / 100
}

// CalculateOvertimePay calculates overtime pay: hourly_rate * OT_hours * multiplier (default 1.25)
func CalculateOvertimePay(hourlyRate, otHours, multiplier float64) float64 {
	if multiplier <= 0 {
		multiplier = 1.25
	}
	return math.Round((hourlyRate*otHours*multiplier)*100) / 100
}

// CalculateLateDeduction calculates late deduction based on (daily_rate / 480) * late_minutes
func CalculateLateDeduction(dailyRate float64, lateMinutes int) float64 {
	minuteRate := dailyRate / 480.0
	return math.Round((minuteRate*float64(lateMinutes))*100) / 100
}

// CalculateUndertimeDeduction calculates undertime deduction
func CalculateUndertimeDeduction(dailyRate float64, undertimeMinutes int) float64 {
	minuteRate := dailyRate / 480.0
	return math.Round((minuteRate*float64(undertimeMinutes))*100) / 100
}

// CalculateAbsenceDeduction calculates absence deduction
func CalculateAbsenceDeduction(dailyRate, absentDays float64) float64 {
	return math.Round((dailyRate*absentDays)*100) / 100
}

// CalculateStatutoryDeduction computes SSS, PhilHealth, Pag-IBIG based on standard Philippine statutory rules
func CalculateStatutoryDeduction(monthlyRate float64) (sss float64, philhealth float64, pagibig float64) {
	// SSS Employee Share: ~4.5% capped at ~1350 PHP
	sss = math.Min(monthlyRate*0.045, 1350.0)

	// PhilHealth Employee Share: 2.5% (total 5% split equally with employer), capped
	philhealth = math.Min(monthlyRate*0.025, 2500.0)

	// Pag-IBIG Employee Share: fixed 200 or 2% capped at 200 PHP
	pagibig = 200.0
	if monthlyRate < 1500 {
		pagibig = monthlyRate * 0.01
	}

	sss = math.Round(sss*100) / 100
	philhealth = math.Round(philhealth*100) / 100
	pagibig = math.Round(pagibig*100) / 100
	return
}

// CalculateAttendanceDeduction sums late, undertime, and absence deductions
func CalculateAttendanceDeduction(late, undertime, absence float64) float64 {
	return math.Round((late+undertime+absence)*100) / 100
}

// CalculateTotalDeductions sums all statutory, attendance, and other deductions
func CalculateTotalDeductions(statutory, attendance, other float64) float64 {
	return math.Round((statutory+attendance+other)*100) / 100
}

// CalculateGrossPay returns BasicPay + OvertimePay + OtherEarnings
func CalculateGrossPay(basicPay, overtimePay, otherEarnings float64) float64 {
	return math.Round((basicPay+overtimePay+otherEarnings)*100) / 100
}

// CalculateNetPay returns GrossPay - TotalDeductions
func CalculateNetPay(grossPay, totalDeductions float64) float64 {
	net := grossPay - totalDeductions
	if net < 0 {
		net = 0
	}
	return math.Round(net*100) / 100
}

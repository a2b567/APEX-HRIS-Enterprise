package services

import (
	"errors"
	"fmt"
	"time"

	"grocery-backend/models"
	"grocery-backend/utils"

	"gorm.io/gorm"
)

type PayrollService struct {
	db             *gorm.DB
	payslipService *PayslipService
}

func NewPayrollService(db *gorm.DB, payslipService *PayslipService) *PayrollService {
	return &PayrollService{
		db:             db,
		payslipService: payslipService,
	}
}

type GeneratePayrollInput struct {
	BranchID    uint      `json:"branch_id"`
	PeriodStart time.Time `json:"period_start"`
	PeriodEnd   time.Time `json:"period_end"`
}

func (s *PayrollService) GeneratePayrollForBranch(input *GeneratePayrollInput, supervisorUserID uint, ipAddress, userAgent string) ([]models.Payroll, error) {
	if input.PeriodEnd.Before(input.PeriodStart) {
		return nil, errors.New("period_end must be after period_start")
	}

	// GetAllActiveEmployees(branch_id)
	var employees []models.Employee
	err := s.db.Preload("SalaryProfile").
		Where("branch_id = ? AND status = ?", input.BranchID, "ACTIVE").
		Find(&employees).Error
	if err != nil {
		return nil, err
	}

	if len(employees) == 0 {
		return nil, errors.New("no active employees found for this branch")
	}

	var generatedPayrolls []models.Payroll

	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		for _, emp := range employees {
			if emp.SalaryProfile == nil {
				continue // Skip employees without configured salary
			}

			// Attendance summary for the period
			var attendances []models.Attendance
			tx.Where("employee_id = ? AND date >= ? AND date <= ?", emp.ID, input.PeriodStart, input.PeriodEnd).
				Find(&attendances)

			var totalOTHours float64 = 0
			var totalLateMinutes int = 0
			var totalUndertimeMinutes int = 0
			var presentDays float64 = 0

			for _, att := range attendances {
				totalOTHours += att.OvertimeHours
				totalLateMinutes += att.LateMinutes
				totalUndertimeMinutes += att.UndertimeMinutes
				if att.Status == "Present" || att.Status == "Late" || att.Status == "Undertime" || att.Status == "Overtime" {
					presentDays += 1
				} else if att.Status == "Half Day" {
					presentDays += 0.5
				}
			}

			// Expected working days in a semi-monthly or monthly cut-off (default half month = 13 days)
			expectedDays := 13.0
			absentDays := expectedDays - presentDays
			if absentDays < 0 {
				absentDays = 0
			}

			// Semi-monthly basic pay (half of monthly rate)
			basicPay := emp.SalaryProfile.MonthlyRate / 2.0
			hourlyRate := emp.SalaryProfile.HourlyRate
			dailyRate := emp.SalaryProfile.DailyRate

			overtimePay := utils.CalculateOvertimePay(hourlyRate, totalOTHours, 1.25)
			otherEarnings := 0.0
			grossPay := utils.CalculateGrossPay(basicPay, overtimePay, otherEarnings)

			// Half-period statutory shares
			sss := emp.SalaryProfile.SSSContribution / 2.0
			philhealth := emp.SalaryProfile.PhilHealthContribution / 2.0
			pagibig := emp.SalaryProfile.PagIbigContribution / 2.0

			lateDeduction := utils.CalculateLateDeduction(dailyRate, totalLateMinutes)
			undertimeDeduction := utils.CalculateUndertimeDeduction(dailyRate, totalUndertimeMinutes)
			absenceDeduction := utils.CalculateAbsenceDeduction(dailyRate, absentDays)
			otherDeductions := 0.0

			statutoryTotal := sss + philhealth + pagibig
			attendanceTotal := utils.CalculateAttendanceDeduction(lateDeduction, undertimeDeduction, absenceDeduction)
			totalDeductions := utils.CalculateTotalDeductions(statutoryTotal, attendanceTotal, otherDeductions)
			netPay := utils.CalculateNetPay(grossPay, totalDeductions)

			payroll := models.Payroll{
				EmployeeID:         emp.ID,
				BranchID:           emp.BranchID,
				PeriodStart:        input.PeriodStart,
				PeriodEnd:          input.PeriodEnd,
				BasicPay:           basicPay,
				OvertimePay:        overtimePay,
				OtherEarnings:      otherEarnings,
				GrossPay:           grossPay,
				SSS:                sss,
				PhilHealth:         philhealth,
				PagIBIG:            pagibig,
				LateDeduction:      lateDeduction,
				UndertimeDeduction: undertimeDeduction,
				AbsenceDeduction:   absenceDeduction,
				OtherDeductions:    otherDeductions,
				TotalDeductions:    totalDeductions,
				NetPay:             netPay,
				Status:             "DRAFT",
			}

			if err := tx.Create(&payroll).Error; err != nil {
				return err
			}

			// Create Earnings records
			if overtimePay > 0 {
				tx.Create(&models.PayrollEarning{
					PayrollID: payroll.ID,
					Title:     "Overtime Pay",
					Amount:    overtimePay,
				})
			}

			// Create Deductions records
			if statutoryTotal > 0 {
				tx.Create(&models.PayrollDeduction{
					PayrollID: payroll.ID,
					Category:  "STATUTORY",
					Title:     "SSS Contribution",
					Amount:    sss,
				})
				tx.Create(&models.PayrollDeduction{
					PayrollID: payroll.ID,
					Category:  "STATUTORY",
					Title:     "PhilHealth Contribution",
					Amount:    philhealth,
				})
				tx.Create(&models.PayrollDeduction{
					PayrollID: payroll.ID,
					Category:  "STATUTORY",
					Title:     "Pag-IBIG Contribution",
					Amount:    pagibig,
				})
			}
			if attendanceTotal > 0 {
				tx.Create(&models.PayrollDeduction{
					PayrollID: payroll.ID,
					Category:  "ATTENDANCE",
					Title:     "Attendance Deductions (Late/Undertime/Absence)",
					Amount:    attendanceTotal,
				})
			}

			generatedPayrolls = append(generatedPayrolls, payroll)
		}

		// Create Audit Log
		audit := models.AuditLog{
			UserID:    supervisorUserID,
			Action:    "GENERATE_PAYROLL",
			Entity:    "payroll",
			EntityID:  input.BranchID,
			IPAddress: ipAddress,
			UserAgent: userAgent,
			Details:   fmt.Sprintf("Generated draft payrolls for branch %d (%d employees)", input.BranchID, len(generatedPayrolls)),
			Timestamp: time.Now(),
		}
		return tx.Create(&audit).Error
	})

	if txErr != nil {
		return nil, txErr
	}

	return generatedPayrolls, nil
}

func (s *PayrollService) FinalizePayroll(payrollID uint, supervisorUserID uint, ipAddress, userAgent string) (*models.Payslip, error) {
	var payroll models.Payroll
	if err := s.db.First(&payroll, payrollID).Error; err != nil {
		return nil, errors.New("payroll record not found")
	}

	// Validate status
	if payroll.Status != "DRAFT" && payroll.Status != "PENDING_REVIEW" {
		return nil, errors.New("payroll must be in DRAFT or PENDING_REVIEW status to finalize")
	}

	now := time.Now()
	var payslip *models.Payslip

	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		payroll.Status = "FINALIZED"
		payroll.FinalizedAt = &now
		if err := tx.Save(&payroll).Error; err != nil {
			return err
		}

		// Generate Payslip and PDF
		var err error
		payslip, err = s.payslipService.GeneratePayslip(payroll.ID)
		if err != nil {
			return err
		}

		audit := models.AuditLog{
			UserID:    supervisorUserID,
			Action:    "FINALIZE_PAYROLL",
			Entity:    "payroll",
			EntityID:  payroll.ID,
			IPAddress: ipAddress,
			UserAgent: userAgent,
			Details:   fmt.Sprintf("Finalized payroll ID %d and generated payslip %s", payroll.ID, payslip.PayslipNumber),
			Timestamp: now,
		}
		return tx.Create(&audit).Error
	})

	if txErr != nil {
		return nil, txErr
	}

	return payslip, nil
}

func (s *PayrollService) MarkPayrollPaid(payrollID uint, adminUserID uint, ipAddress, userAgent string) error {
	var payroll models.Payroll
	if err := s.db.First(&payroll, payrollID).Error; err != nil {
		return errors.New("payroll record not found")
	}

	now := time.Now()
	payroll.Status = "PAID"
	payroll.PaidAt = &now

	if err := s.db.Save(&payroll).Error; err != nil {
		return err
	}

	s.db.Create(&models.AuditLog{
		UserID:    adminUserID,
		Action:    "MARK_PAYROLL_PAID",
		Entity:    "payroll",
		EntityID:  payroll.ID,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Details:   fmt.Sprintf("Marked payroll ID %d as PAID", payroll.ID),
		Timestamp: now,
	})

	return nil
}

func (s *PayrollService) GetPayrollByID(id uint) (*models.Payroll, error) {
	var payroll models.Payroll
	err := s.db.Preload("Employee").
		Preload("Employee.Branch").
		Preload("Earnings").
		Preload("Deductions").
		Preload("Payslip").
		First(&payroll, id).Error
	if err != nil {
		return nil, err
	}
	return &payroll, nil
}

func (s *PayrollService) GetAllPayrolls(branchID *uint, employeeID *uint) ([]models.Payroll, error) {
	var payrolls []models.Payroll
	query := s.db.Preload("Employee").Preload("Employee.Branch").Preload("Payslip").Order("created_at DESC")

	if branchID != nil && *branchID > 0 {
		query = query.Where("branch_id = ?", *branchID)
	}
	if employeeID != nil && *employeeID > 0 {
		query = query.Where("employee_id = ?", *employeeID)
	}

	err := query.Find(&payrolls).Error
	return payrolls, err
}

package services

import (
	"errors"
	"fmt"
	"time"

	"grocery-backend/models"
	"grocery-backend/utils"

	"gorm.io/gorm"
)

type AttendanceService struct {
	db        *gorm.DB
	qrService *QRService
}

func NewAttendanceService(db *gorm.DB, qrService *QRService) *AttendanceService {
	return &AttendanceService{
		db:        db,
		qrService: qrService,
	}
}

type TimeInResult struct {
	AttendanceID uint       `json:"attendance_id"`
	EmployeeName string     `json:"employee_name"`
	EmployeeCode string     `json:"employee_code"`
	TimeIn       *time.Time `json:"time_in"`
	Status       string     `json:"status"`
	LateMinutes  int        `json:"late_minutes"`
}

type TimeOutResult struct {
	AttendanceID     uint       `json:"attendance_id"`
	EmployeeName     string     `json:"employee_name"`
	EmployeeCode     string     `json:"employee_code"`
	TimeIn           *time.Time `json:"time_in"`
	TimeOut          *time.Time `json:"time_out"`
	TotalHours       float64    `json:"total_hours"`
	RegularHours     float64    `json:"regular_hours"`
	OvertimeHours    float64    `json:"overtime_hours"`
	UndertimeMinutes int        `json:"undertime_minutes"`
	Status           string     `json:"status"`
}

func (s *AttendanceService) RecordTimeIn(qrToken string, supervisorUserID uint, supervisorBranchID uint, userRole string, ipAddress, userAgent string) (*TimeInResult, error) {
	// FindEmployeeByQR
	emp, _, err := s.qrService.FindEmployeeByQR(qrToken)
	if err != nil {
		return nil, err
	}

	// ValidateEmployeeStatus
	if emp.Status != "ACTIVE" {
		return nil, errors.New("employee is not active")
	}

	// ValidateEmployeeBranch (unless SUPER_ADMIN)
	if userRole != "SUPER_ADMIN" && emp.BranchID != supervisorBranchID {
		return nil, errors.New("employee does not belong to your assigned branch")
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// CheckExistingTimeIn
	var existing models.Attendance
	err = s.db.Where("employee_id = ? AND date = ?", emp.ID, today).First(&existing).Error
	if err == nil && existing.TimeIn != nil {
		return nil, errors.New("employee has already timed in for today")
	}

	// GetEmployeeSchedule
	dayOfWeek := int(now.Weekday())
	var schedule models.EmployeeSchedule
	err = s.db.Where("employee_id = ? AND day_of_week = ?", emp.ID, dayOfWeek).First(&schedule).Error
	schedIn := "08:00"
	isRestDay := false
	if err == nil {
		schedIn = schedule.ScheduledIn
		isRestDay = schedule.IsRestDay
	}

	// CalculateLateMinutes
	lateMinutes := utils.CalculateLateMinutes(schedIn, now)

	// CalculateAttendanceStatus
	status := "Present"
	if lateMinutes > 0 {
		status = "Late"
	}
	if isRestDay {
		status = "Rest Day Overtime"
	}

	var attendance models.Attendance
	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		attendance = models.Attendance{
			EmployeeID:  emp.ID,
			BranchID:    emp.BranchID,
			Date:        today,
			TimeIn:      &now,
			LateMinutes: lateMinutes,
			Status:      status,
		}
		if err := tx.Create(&attendance).Error; err != nil {
			return err
		}

		// Attendance log
		logEntry := models.AttendanceLog{
			AttendanceID: attendance.ID,
			ActionType:   "SCAN_TIME_IN",
			Timestamp:    now,
			ScannedBy:    supervisorUserID,
			Notes:        fmt.Sprintf("Time-in recorded at %s", now.Format("15:04:05")),
		}
		if err := tx.Create(&logEntry).Error; err != nil {
			return err
		}

		// Audit log
		audit := models.AuditLog{
			UserID:    supervisorUserID,
			Action:    "SCAN_TIME_IN",
			Entity:    "attendance",
			EntityID:  attendance.ID,
			IPAddress: ipAddress,
			UserAgent: userAgent,
			Details:   fmt.Sprintf("Recorded time in for employee %s (%s)", emp.FirstName+" "+emp.LastName, emp.EmployeeCode),
			Timestamp: now,
		}
		return tx.Create(&audit).Error
	})

	if txErr != nil {
		return nil, txErr
	}

	return &TimeInResult{
		AttendanceID: attendance.ID,
		EmployeeName: emp.FirstName + " " + emp.LastName,
		EmployeeCode: emp.EmployeeCode,
		TimeIn:       &now,
		Status:       status,
		LateMinutes:  lateMinutes,
	}, nil
}

func (s *AttendanceService) RecordTimeOut(qrToken string, supervisorUserID uint, supervisorBranchID uint, userRole string, ipAddress, userAgent string) (*TimeOutResult, error) {
	emp, _, err := s.qrService.FindEmployeeByQR(qrToken)
	if err != nil {
		return nil, err
	}

	if userRole != "SUPER_ADMIN" && emp.BranchID != supervisorBranchID {
		return nil, errors.New("employee does not belong to your assigned branch")
	}

	now := time.Now()
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, now.Location())

	// FindTodayAttendance
	var attendance models.Attendance
	err = s.db.Where("employee_id = ? AND date = ?", emp.ID, today).First(&attendance).Error
	if err != nil {
		return nil, errors.New("no time-in record found for today")
	}

	// CheckExistingTimeOut
	if attendance.TimeOut != nil {
		return nil, errors.New("employee has already timed out for today")
	}

	// GetEmployeeSchedule
	dayOfWeek := int(now.Weekday())
	var schedule models.EmployeeSchedule
	err = s.db.Where("employee_id = ? AND day_of_week = ?", emp.ID, dayOfWeek).First(&schedule).Error
	schedOut := "17:00"
	breakMinutes := 60
	scheduledHours := 8.0
	isRestDay := false
	if err == nil {
		schedOut = schedule.ScheduledOut
		breakMinutes = schedule.BreakMinutes
		isRestDay = schedule.IsRestDay
	}

	// Calculate values
	undertimeMinutes := utils.CalculateUndertimeMinutes(schedOut, now)
	totalHours := utils.CalculateTotalHours(*attendance.TimeIn, now, breakMinutes)
	regularHours := utils.CalculateRegularHours(totalHours, scheduledHours)
	overtimeHours := utils.CalculateOvertimeHours(totalHours, scheduledHours)
	status := utils.CalculateAttendanceStatus(attendance.LateMinutes, undertimeMinutes, totalHours, scheduledHours, isRestDay, false)

	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		updates := map[string]interface{}{
			"time_out":          now,
			"undertime_minutes": undertimeMinutes,
			"total_hours":       totalHours,
			"regular_hours":     regularHours,
			"overtime_hours":    overtimeHours,
			"status":            status,
		}
		if err := tx.Model(&attendance).Updates(updates).Error; err != nil {
			return err
		}

		logEntry := models.AttendanceLog{
			AttendanceID: attendance.ID,
			ActionType:   "SCAN_TIME_OUT",
			Timestamp:    now,
			ScannedBy:    supervisorUserID,
			Notes:        fmt.Sprintf("Time-out recorded at %s. Total hours: %.2f", now.Format("15:04:05"), totalHours),
		}
		if err := tx.Create(&logEntry).Error; err != nil {
			return err
		}

		audit := models.AuditLog{
			UserID:    supervisorUserID,
			Action:    "SCAN_TIME_OUT",
			Entity:    "attendance",
			EntityID:  attendance.ID,
			IPAddress: ipAddress,
			UserAgent: userAgent,
			Details:   fmt.Sprintf("Recorded time out for employee %s (%s)", emp.FirstName+" "+emp.LastName, emp.EmployeeCode),
			Timestamp: now,
		}
		return tx.Create(&audit).Error
	})

	if txErr != nil {
		return nil, txErr
	}

	return &TimeOutResult{
		AttendanceID:     attendance.ID,
		EmployeeName:     emp.FirstName + " " + emp.LastName,
		EmployeeCode:     emp.EmployeeCode,
		TimeIn:           attendance.TimeIn,
		TimeOut:          &now,
		TotalHours:       totalHours,
		RegularHours:     regularHours,
		OvertimeHours:    overtimeHours,
		UndertimeMinutes: undertimeMinutes,
		Status:           status,
	}, nil
}

func (s *AttendanceService) GetAttendanceList(branchID *uint, date *time.Time, employeeID *uint) ([]models.Attendance, error) {
	var records []models.Attendance
	query := s.db.Preload("Employee").Preload("Employee.Branch").Preload("Logs").Order("date DESC, created_at DESC")

	if branchID != nil && *branchID > 0 {
		query = query.Where("branch_id = ?", *branchID)
	}
	if date != nil {
		query = query.Where("date = ?", *date)
	}
	if employeeID != nil && *employeeID > 0 {
		query = query.Where("employee_id = ?", *employeeID)
	}

	err := query.Find(&records).Error
	return records, err
}

func (s *AttendanceService) GetAttendanceByID(id uint) (*models.Attendance, error) {
	var rec models.Attendance
	err := s.db.Preload("Employee").Preload("Employee.Branch").Preload("Logs").First(&rec, id).Error
	if err != nil {
		return nil, err
	}
	return &rec, nil
}

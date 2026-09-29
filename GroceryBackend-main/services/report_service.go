package services

import (
	"time"

	"grocery-backend/models"

	"gorm.io/gorm"
)

type ReportService struct {
	db *gorm.DB
}

func NewReportService(db *gorm.DB) *ReportService {
	return &ReportService{db: db}
}

type AttendanceReportItem struct {
	BranchName     string  `json:"branch_name"`
	TotalScans     int64   `json:"total_scans"`
	PresentCount   int64   `json:"present_count"`
	LateCount      int64   `json:"late_count"`
	TotalHours     float64 `json:"total_hours"`
	TotalOvertime  float64 `json:"total_overtime"`
}

type PayrollReportItem struct {
	BranchName      string  `json:"branch_name"`
	TotalEmployees  int64   `json:"total_employees"`
	TotalGrossPay   float64 `json:"total_gross_pay"`
	TotalDeductions float64 `json:"total_deductions"`
	TotalNetPay     float64 `json:"total_net_pay"`
}

func (s *ReportService) GetAttendanceReport(branchID *uint, startDate, endDate time.Time) ([]models.Attendance, error) {
	var records []models.Attendance
	query := s.db.Preload("Employee").Preload("Employee.Branch").
		Where("date >= ? AND date <= ?", startDate, endDate).
		Order("date ASC")

	if branchID != nil && *branchID > 0 {
		query = query.Where("branch_id = ?", *branchID)
	}

	err := query.Find(&records).Error
	return records, err
}

func (s *ReportService) GetPayrollReport(branchID *uint, startDate, endDate time.Time) ([]models.Payroll, error) {
	var payrolls []models.Payroll
	query := s.db.Preload("Employee").Preload("Employee.Branch").
		Where("period_start >= ? AND period_end <= ?", startDate, endDate).
		Order("period_start ASC")

	if branchID != nil && *branchID > 0 {
		query = query.Where("branch_id = ?", *branchID)
	}

	err := query.Find(&payrolls).Error
	return payrolls, err
}

func (s *ReportService) GetAuditLogs(action, entity string, userID *uint, limit, offset int) ([]models.AuditLog, int64, error) {
	var logs []models.AuditLog
	var total int64

	query := s.db.Model(&models.AuditLog{}).Preload("User").Preload("User.Role")
	if action != "" {
		query = query.Where("action = ?", action)
	}
	if entity != "" {
		query = query.Where("entity = ?", entity)
	}
	if userID != nil && *userID > 0 {
		query = query.Where("user_id = ?", *userID)
	}

	query.Count(&total)

	if limit <= 0 {
		limit = 50
	}
	err := query.Order("timestamp DESC").Limit(limit).Offset(offset).Find(&logs).Error
	return logs, total, err
}

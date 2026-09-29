package services

import (
	"errors"
	"time"

	"grocery-backend/models"
	"grocery-backend/utils"

	"gorm.io/gorm"
)

type SalaryService struct {
	db *gorm.DB
}

func NewSalaryService(db *gorm.DB) *SalaryService {
	return &SalaryService{db: db}
}

type SalaryProfileInput struct {
	EmployeeID          uint    `json:"employee_id"`
	MonthlyRate         float64 `json:"monthly_rate"`
	WorkingDaysPerMonth int     `json:"working_days_per_month"`
	TaxExempt           bool    `json:"tax_exempt"`
}

func (s *SalaryService) CreateSalaryProfile(input *SalaryProfileInput) (*models.SalaryProfile, error) {
	if input.MonthlyRate <= 0 {
		return nil, errors.New("monthly rate must be greater than zero")
	}
	if input.WorkingDaysPerMonth <= 0 {
		input.WorkingDaysPerMonth = 26
	}

	dailyRate := utils.CalculateDailyRate(input.MonthlyRate, input.WorkingDaysPerMonth)
	hourlyRate := utils.CalculateHourlyRate(dailyRate)
	sss, philhealth, pagibig := utils.CalculateStatutoryDeduction(input.MonthlyRate)

	profile := models.SalaryProfile{
		EmployeeID:             input.EmployeeID,
		MonthlyRate:            input.MonthlyRate,
		DailyRate:              dailyRate,
		HourlyRate:             hourlyRate,
		WorkingDaysPerMonth:    input.WorkingDaysPerMonth,
		SSSContribution:        sss,
		PhilHealthContribution: philhealth,
		PagIbigContribution:   pagibig,
		TaxExempt:              input.TaxExempt,
		EffectiveDate:          time.Now(),
	}

	if err := s.db.Create(&profile).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (s *SalaryService) UpdateSalaryProfile(id uint, input *SalaryProfileInput) (*models.SalaryProfile, error) {
	var profile models.SalaryProfile
	if err := s.db.First(&profile, id).Error; err != nil {
		return nil, err
	}

	if input.WorkingDaysPerMonth <= 0 {
		input.WorkingDaysPerMonth = profile.WorkingDaysPerMonth
	}
	dailyRate := utils.CalculateDailyRate(input.MonthlyRate, input.WorkingDaysPerMonth)
	hourlyRate := utils.CalculateHourlyRate(dailyRate)
	sss, philhealth, pagibig := utils.CalculateStatutoryDeduction(input.MonthlyRate)

	updates := map[string]interface{}{
		"monthly_rate":             input.MonthlyRate,
		"daily_rate":               dailyRate,
		"hourly_rate":              hourlyRate,
		"working_days_per_month":   input.WorkingDaysPerMonth,
		"sss_contribution":         sss,
		"philhealth_contribution":  philhealth,
		"pagibig_contribution":    pagibig,
		"tax_exempt":              input.TaxExempt,
	}

	if err := s.db.Model(&profile).Updates(updates).Error; err != nil {
		return nil, err
	}
	return &profile, nil
}

func (s *SalaryService) GetSalaryProfile(employeeID uint) (*models.SalaryProfile, error) {
	var profile models.SalaryProfile
	err := s.db.Preload("Employee").Where("employee_id = ?", employeeID).First(&profile).Error
	if err != nil {
		return nil, err
	}
	return &profile, nil
}

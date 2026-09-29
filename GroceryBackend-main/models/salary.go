package models

import "time"

type SalaryProfile struct {
	ID                      uint      `gorm:"primaryKey" json:"id"`
	EmployeeID              uint      `gorm:"unique;not null;index" json:"employee_id"`
	Employee                *Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	MonthlyRate             float64   `gorm:"type:decimal(12,2);not null" json:"monthly_rate"`
	DailyRate               float64   `gorm:"type:decimal(12,2);not null" json:"daily_rate"`
	HourlyRate              float64   `gorm:"type:decimal(12,2);not null" json:"hourly_rate"`
	WorkingDaysPerMonth     int       `gorm:"default:26" json:"working_days_per_month"`
	SSSContribution         float64   `gorm:"type:decimal(10,2);default:0" json:"sss_contribution"`
	PhilHealthContribution  float64   `gorm:"type:decimal(10,2);default:0" json:"philhealth_contribution"`
	PagIbigContribution    float64   `gorm:"type:decimal(10,2);default:0" json:"pagibig_contribution"`
	TaxExempt               bool      `gorm:"default:false" json:"tax_exempt"`
	EffectiveDate           time.Time `json:"effective_date"`
	CreatedAt               time.Time `json:"created_at"`
	UpdatedAt               time.Time `json:"updated_at"`
}

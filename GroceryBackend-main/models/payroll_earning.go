package models

import "time"

type PayrollEarning struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PayrollID uint      `gorm:"not null;index" json:"payroll_id"`
	Payroll   *Payroll  `gorm:"foreignKey:PayrollID" json:"payroll,omitempty"`
	Title     string    `gorm:"not null" json:"title"` // Overtime, Holiday Pay, Allowance, Bonus
	Amount    float64   `gorm:"type:decimal(12,2);not null" json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}

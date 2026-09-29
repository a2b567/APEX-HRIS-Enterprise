package models

import "time"

type PayrollDeduction struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	PayrollID uint      `gorm:"not null;index" json:"payroll_id"`
	Payroll   *Payroll  `gorm:"foreignKey:PayrollID" json:"payroll,omitempty"`
	Category  string    `gorm:"not null" json:"category"` // STATUTORY, ATTENDANCE, OTHER, CASH_ADVANCE, LOAN
	Title     string    `gorm:"not null" json:"title"`
	Amount    float64   `gorm:"type:decimal(12,2);not null" json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}

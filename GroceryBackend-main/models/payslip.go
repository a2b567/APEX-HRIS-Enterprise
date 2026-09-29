package models

import "time"

type Payslip struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	PayrollID     uint      `gorm:"unique;not null;index" json:"payroll_id"`
	Payroll       *Payroll  `gorm:"foreignKey:PayrollID" json:"payroll,omitempty"`
	PayslipNumber string    `gorm:"unique;not null;index" json:"payslip_number"`
	PDFPath       string    `json:"pdf_path"`
	GeneratedAt   time.Time `json:"generated_at"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

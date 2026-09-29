package models

import "time"

type Payroll struct {
	ID                  uint               `gorm:"primaryKey" json:"id"`
	EmployeeID          uint               `gorm:"not null;index" json:"employee_id"`
	Employee            *Employee          `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	BranchID            uint               `gorm:"not null;index" json:"branch_id"`
	Branch              *Branch            `gorm:"foreignKey:BranchID" json:"branch,omitempty"`
	PeriodStart         time.Time          `gorm:"type:date;not null" json:"period_start"`
	PeriodEnd           time.Time          `gorm:"type:date;not null" json:"period_end"`
	BasicPay            float64            `gorm:"type:decimal(12,2);default:0" json:"basic_pay"`
	OvertimePay         float64            `gorm:"type:decimal(12,2);default:0" json:"overtime_pay"`
	OtherEarnings       float64            `gorm:"type:decimal(12,2);default:0" json:"other_earnings"`
	GrossPay            float64            `gorm:"type:decimal(12,2);default:0" json:"gross_pay"`
	SSS                 float64            `gorm:"type:decimal(12,2);default:0" json:"sss"`
	PhilHealth          float64            `gorm:"type:decimal(12,2);default:0" json:"philhealth"`
	PagIBIG             float64            `gorm:"type:decimal(12,2);default:0" json:"pagibig"`
	LateDeduction       float64            `gorm:"type:decimal(12,2);default:0" json:"late_deduction"`
	UndertimeDeduction  float64            `gorm:"type:decimal(12,2);default:0" json:"undertime_deduction"`
	AbsenceDeduction    float64            `gorm:"type:decimal(12,2);default:0" json:"absence_deduction"`
	OtherDeductions     float64            `gorm:"type:decimal(12,2);default:0" json:"other_deductions"`
	TotalDeductions     float64            `gorm:"type:decimal(12,2);default:0" json:"total_deductions"`
	NetPay              float64            `gorm:"type:decimal(12,2);default:0" json:"net_pay"`
	Status              string             `gorm:"type:varchar(20);default:'DRAFT'" json:"status"` // DRAFT, PENDING_REVIEW, FINALIZED, PAID
	FinalizedAt         *time.Time         `json:"finalized_at,omitempty"`
	PaidAt              *time.Time         `json:"paid_at,omitempty"`
	CreatedAt           time.Time          `json:"created_at"`
	UpdatedAt           time.Time          `json:"updated_at"`
	Earnings            []PayrollEarning   `gorm:"foreignKey:PayrollID" json:"earnings,omitempty"`
	Deductions          []PayrollDeduction `gorm:"foreignKey:PayrollID" json:"deductions,omitempty"`
	Payslip             *Payslip           `gorm:"foreignKey:PayrollID" json:"payslip,omitempty"`
}

package models

import "time"

type Employee struct {
	ID            uint               `gorm:"primaryKey" json:"id"`
	UserID        uint               `gorm:"unique;not null;index" json:"user_id"`
	User          User               `gorm:"foreignKey:UserID;constraint:OnDelete:CASCADE" json:"user"`
	EmployeeCode  string             `gorm:"unique;not null;index" json:"employee_code"` // EMP-2026-0001
	BranchID      uint               `gorm:"not null;index" json:"branch_id"`
	Branch        Branch             `gorm:"foreignKey:BranchID" json:"branch"`
	FirstName     string             `gorm:"not null" json:"first_name"`
	LastName      string             `gorm:"not null" json:"last_name"`
	Email         string             `json:"email"`
	Phone         string             `json:"phone"`
	Position      string             `json:"position"`
	Department    string             `json:"department"`
	HireDate      time.Time          `json:"hire_date"`
	Status        string             `gorm:"type:varchar(20);default:'ACTIVE'" json:"status"` // ACTIVE, INACTIVE, TERMINATED
	CreatedAt     time.Time          `json:"created_at"`
	UpdatedAt     time.Time          `json:"updated_at"`
	QRCode        *EmployeeQRCode    `gorm:"foreignKey:EmployeeID" json:"qr_code,omitempty"`
	Schedules     []EmployeeSchedule `gorm:"foreignKey:EmployeeID" json:"schedules,omitempty"`
	Attendances   []Attendance       `gorm:"foreignKey:EmployeeID" json:"attendances,omitempty"`
	SalaryProfile *SalaryProfile     `gorm:"foreignKey:EmployeeID" json:"salary_profile,omitempty"`
	Payrolls      []Payroll          `gorm:"foreignKey:EmployeeID" json:"payrolls,omitempty"`
	LeaveRequests []LeaveRequest     `gorm:"foreignKey:EmployeeID" json:"leave_requests,omitempty"`
}

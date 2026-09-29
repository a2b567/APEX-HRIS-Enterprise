package models

import "time"

type LeaveRequest struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	EmployeeID  uint      `gorm:"not null;index" json:"employee_id"`
	Employee    *Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	LeaveType   string    `gorm:"not null" json:"leave_type"` // SICK, VACATION, EMERGENCY
	StartDate   time.Time `gorm:"type:date;not null" json:"start_date"`
	EndDate     time.Time `gorm:"type:date;not null" json:"end_date"`
	Reason      string    `json:"reason"`
	Status      string    `gorm:"type:varchar(20);default:'PENDING'" json:"status"` // PENDING, APPROVED, REJECTED
	ApprovedBy  *uint     `json:"approved_by,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
}

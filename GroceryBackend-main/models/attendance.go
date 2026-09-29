package models

import "time"

type Attendance struct {
	ID               uint            `gorm:"primaryKey" json:"id"`
	EmployeeID       uint            `gorm:"not null;index" json:"employee_id"`
	Employee         *Employee       `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	BranchID         uint            `gorm:"not null;index" json:"branch_id"`
	Branch           *Branch         `gorm:"foreignKey:BranchID" json:"branch,omitempty"`
	Date             time.Time       `gorm:"type:date;not null;index" json:"date"`
	TimeIn           *time.Time      `json:"time_in"`
	TimeOut          *time.Time      `json:"time_out"`
	LateMinutes      int             `gorm:"default:0" json:"late_minutes"`
	UndertimeMinutes int             `gorm:"default:0" json:"undertime_minutes"`
	TotalHours       float64         `gorm:"type:decimal(5,2);default:0" json:"total_hours"`
	RegularHours     float64         `gorm:"type:decimal(5,2);default:0" json:"regular_hours"`
	OvertimeHours    float64         `gorm:"type:decimal(5,2);default:0" json:"overtime_hours"`
	Status           string          `gorm:"type:varchar(30);default:'Present'" json:"status"` // Present | Late | Undertime | Half Day | Absent | Overtime | Rest Day | Leave
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
	Logs             []AttendanceLog `gorm:"foreignKey:AttendanceID" json:"logs,omitempty"`
}

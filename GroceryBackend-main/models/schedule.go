package models

import "time"

type EmployeeSchedule struct {
	ID            uint      `gorm:"primaryKey" json:"id"`
	EmployeeID    uint      `gorm:"not null;index" json:"employee_id"`
	Employee      *Employee `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	DayOfWeek     int       `gorm:"not null" json:"day_of_week"` // 0=Sunday, 1=Monday, ..., 6=Saturday
	ScheduledIn   string    `gorm:"type:varchar(5);not null" json:"scheduled_in"`  // "08:00"
	ScheduledOut  string    `gorm:"type:varchar(5);not null" json:"scheduled_out"` // "17:00"
	BreakMinutes  int       `gorm:"default:60" json:"break_minutes"`
	IsRestDay     bool      `gorm:"default:false" json:"is_rest_day"`
	EffectiveDate time.Time `json:"effective_date"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

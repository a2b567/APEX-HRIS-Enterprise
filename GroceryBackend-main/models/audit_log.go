package models

import "time"

type AuditLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	UserID    uint      `gorm:"not null;index" json:"user_id"`
	User      *User     `gorm:"foreignKey:UserID" json:"user,omitempty"`
	Action    string    `gorm:"not null;index" json:"action"` // LOGIN, CREATE_EMPLOYEE, SCAN_TIME_IN, SCAN_TIME_OUT, FINALIZE_PAYROLL, etc.
	Entity    string    `gorm:"not null" json:"entity"`
	EntityID  uint      `json:"entity_id"`
	IPAddress string    `json:"ip_address"`
	UserAgent string    `json:"user_agent"`
	Details   string    `gorm:"type:text" json:"details"`
	Timestamp time.Time `gorm:"not null;index" json:"timestamp"`
	CreatedAt time.Time `json:"created_at"`
}

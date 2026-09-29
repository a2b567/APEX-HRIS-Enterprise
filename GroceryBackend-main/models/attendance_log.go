package models

import "time"

type AttendanceLog struct {
	ID           uint        `gorm:"primaryKey" json:"id"`
	AttendanceID uint        `gorm:"not null;index" json:"attendance_id"`
	Attendance   *Attendance `gorm:"foreignKey:AttendanceID" json:"attendance,omitempty"`
	ActionType   string      `gorm:"not null" json:"action_type"` // SCAN_TIME_IN, SCAN_TIME_OUT, MANUAL_ADJUSTMENT
	Timestamp    time.Time   `gorm:"not null" json:"timestamp"`
	ScannedBy    uint        `gorm:"not null;index" json:"scanned_by"` // Supervisor user ID
	Notes        string      `json:"notes"`
	CreatedAt    time.Time   `json:"created_at"`
}

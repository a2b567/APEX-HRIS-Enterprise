package models

import "time"

type EmployeeQRCode struct {
	ID          uint       `gorm:"primaryKey" json:"id"`
	EmployeeID  uint       `gorm:"unique;not null;index" json:"employee_id"`
	Employee    *Employee  `gorm:"foreignKey:EmployeeID" json:"employee,omitempty"`
	QRToken     string     `gorm:"unique;not null;index" json:"qr_token"` // EMP-QR-<uuid>
	IsActive    bool       `gorm:"default:true" json:"is_active"`
	GeneratedAt time.Time  `json:"generated_at"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

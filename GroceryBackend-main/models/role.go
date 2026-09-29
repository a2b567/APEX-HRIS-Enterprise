package models

import "time"

type Role struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	Name        string    `gorm:"unique;not null" json:"name"` // SUPER_ADMIN, SUPERVISOR, EMPLOYEE
	Description string    `json:"description"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Users       []User    `gorm:"foreignKey:RoleID" json:"users,omitempty"`
}

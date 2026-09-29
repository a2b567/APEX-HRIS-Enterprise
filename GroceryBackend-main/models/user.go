package models

import "time"

type User struct {
	ID           uint       `gorm:"primaryKey" json:"id"`
	Username     string     `gorm:"unique;not null;index" json:"username"`
	PasswordHash string     `gorm:"not null" json:"-"`
	RoleID       uint       `gorm:"not null;index" json:"role_id"`
	Role         Role       `gorm:"foreignKey:RoleID" json:"role"`
	Status       string     `gorm:"type:varchar(20);default:'ACTIVE'" json:"status"` // ACTIVE, INACTIVE
	LastLogin    *time.Time `json:"last_login"`
	CreatedAt    time.Time  `json:"created_at"`
	UpdatedAt    time.Time  `json:"updated_at"`
	Employee     *Employee  `gorm:"foreignKey:UserID" json:"employee,omitempty"`
}

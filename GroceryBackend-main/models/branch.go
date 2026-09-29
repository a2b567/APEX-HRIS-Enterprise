package models

import "time"

type Branch struct {
	ID         uint       `gorm:"primaryKey" json:"id"`
	BranchCode string     `gorm:"unique;not null" json:"branch_code"`
	BranchName string     `gorm:"not null" json:"branch_name"`
	Address    string     `json:"address"`
	Phone      string     `json:"phone"`
	IsActive   bool       `gorm:"default:true" json:"is_active"`
	CreatedAt  time.Time  `json:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at"`
	Employees  []Employee `gorm:"foreignKey:BranchID" json:"employees,omitempty"`
}

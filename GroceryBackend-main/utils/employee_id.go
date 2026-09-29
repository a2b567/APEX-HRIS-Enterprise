package utils

import (
	"fmt"
	"strconv"
	"strings"
	"time"

	"grocery-backend/models"

	"gorm.io/gorm"
)

// FormatEmployeeID formats year and counter as EMP-YYYY-XXXX (e.g. EMP-2026-0001)
func FormatEmployeeID(year, n int) string {
	return fmt.Sprintf("EMP-%04d-%04d", year, n)
}

// GetNextEmployeeNumber finds the next incremental integer for employee code in the given year
func GetNextEmployeeNumber(db *gorm.DB, year int) (int, error) {
	prefix := fmt.Sprintf("EMP-%04d-%%", year)
	var latest models.Employee
	err := db.Where("employee_code LIKE ?", prefix).Order("employee_code DESC").First(&latest).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			return 1, nil
		}
		return 0, err
	}

	parts := strings.Split(latest.EmployeeCode, "-")
	if len(parts) == 3 {
		if num, err := strconv.Atoi(parts[2]); err == nil {
			return num + 1, nil
		}
	}

	return 1, nil
}

// CheckEmployeeIDExists returns true if the employee code already exists in the database
func CheckEmployeeIDExists(db *gorm.DB, code string) bool {
	var count int64
	db.Model(&models.Employee{}).Where("employee_code = ?", code).Count(&count)
	return count > 0
}

// GenerateEmployeeID orchestrates the complete employee code generation flow with collision avoidance
func GenerateEmployeeID(db *gorm.DB) (string, error) {
	year := time.Now().Year()
	nextNum, err := GetNextEmployeeNumber(db, year)
	if err != nil {
		return "", err
	}

	for i := 0; i < 10; i++ {
		code := FormatEmployeeID(year, nextNum+i)
		if !CheckEmployeeIDExists(db, code) {
			return code, nil
		}
	}

	return "", fmt.Errorf("could not generate unique employee ID after 10 attempts")
}

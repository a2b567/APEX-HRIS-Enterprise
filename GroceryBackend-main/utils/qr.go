package utils

import (
	"fmt"
	"strings"

	"grocery-backend/models"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// ValidateQRTokenFormat checks if the token has the expected EMP-QR- format
func ValidateQRTokenFormat(token string) bool {
	if !strings.HasPrefix(token, "EMP-QR-") {
		return false
	}
	rawUUID := strings.TrimPrefix(token, "EMP-QR-")
	_, err := uuid.Parse(rawUUID)
	return err == nil
}

// CheckQRTokenExists returns true if the token already exists in employee_qr_codes
func CheckQRTokenExists(db *gorm.DB, token string) bool {
	var count int64
	db.Model(&models.EmployeeQRCode{}).Where("qr_token = ?", token).Count(&count)
	return count > 0
}

// GenerateQRToken generates a collision-free EMP-QR-<UUIDv4> token string
func GenerateQRToken(db *gorm.DB) (string, error) {
	for attempts := 0; attempts < 10; attempts++ {
		u := uuid.New().String()
		token := fmt.Sprintf("EMP-QR-%s", u)
		if !CheckQRTokenExists(db, token) {
			return token, nil
		}
	}
	return "", fmt.Errorf("failed to generate unique QR token after 10 attempts")
}

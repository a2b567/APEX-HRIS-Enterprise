package services

import (
	"errors"
	"time"

	"grocery-backend/models"
	"grocery-backend/utils"

	"gorm.io/gorm"
)

type QRService struct {
	db *gorm.DB
}

func NewQRService(db *gorm.DB) *QRService {
	return &QRService{db: db}
}

func (s *QRService) ValidateQRToken(qrToken string) error {
	if !utils.ValidateQRTokenFormat(qrToken) {
		return errors.New("invalid QR token format")
	}
	return nil
}

func (s *QRService) FindEmployeeByQR(qrToken string) (*models.Employee, *models.EmployeeQRCode, error) {
	if err := s.ValidateQRToken(qrToken); err != nil {
		return nil, nil, err
	}

	var qr models.EmployeeQRCode
	err := s.db.Where("qr_token = ? AND is_active = ?", qrToken, true).First(&qr).Error
	if err != nil {
		return nil, nil, errors.New("active QR code not found")
	}

	var emp models.Employee
	err = s.db.Preload("Branch").Preload("User").First(&emp, qr.EmployeeID).Error
	if err != nil {
		return nil, nil, errors.New("employee associated with this QR code not found")
	}

	return &emp, &qr, nil
}

func (s *QRService) GetEmployeeQRCode(employeeID uint) (*models.EmployeeQRCode, error) {
	var qr models.EmployeeQRCode
	err := s.db.Where("employee_id = ? AND is_active = ?", employeeID, true).First(&qr).Error
	if err != nil {
		return nil, err
	}
	return &qr, nil
}

func (s *QRService) RegenerateQRCode(employeeID uint) (*models.EmployeeQRCode, error) {
	newToken, err := utils.GenerateQRToken(s.db)
	if err != nil {
		return nil, err
	}

	var qr models.EmployeeQRCode
	err = s.db.Transaction(func(tx *gorm.DB) error {
		// Deactivate old QR codes
		if err := tx.Model(&models.EmployeeQRCode{}).Where("employee_id = ?", employeeID).Update("is_active", false).Error; err != nil {
			return err
		}

		qr = models.EmployeeQRCode{
			EmployeeID:  employeeID,
			QRToken:     newToken,
			IsActive:    true,
			GeneratedAt: time.Now(),
		}
		return tx.Create(&qr).Error
	})

	if err != nil {
		return nil, err
	}
	return &qr, nil
}

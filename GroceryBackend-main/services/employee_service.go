package services

import (
	"errors"
	"time"

	"grocery-backend/models"
	"grocery-backend/utils"

	"gorm.io/gorm"
)

type EmployeeService struct {
	db *gorm.DB
}

func NewEmployeeService(db *gorm.DB) *EmployeeService {
	return &EmployeeService{db: db}
}

type EmployeeRegisterResponse struct {
	EmployeeID   uint      `json:"employee_id"`
	EmployeeCode string    `json:"employee_code"`
	Username     string    `json:"username"`
	FirstName    string    `json:"first_name"`
	LastName     string    `json:"last_name"`
	Email        string    `json:"email"`
	Position     string    `json:"position"`
	Department   string    `json:"department"`
	BranchID     uint      `json:"branch_id"`
	QRToken      string    `json:"qr_token"`
	CreatedAt    time.Time `json:"created_at"`
}

func (s *EmployeeService) RegisterEmployee(req *utils.EmployeeRequest, supervisorUserID uint, ipAddress, userAgent string) (*EmployeeRegisterResponse, error) {
	if err := utils.ValidateEmployeeInput(req); err != nil {
		return nil, err
	}

	// CheckUsernameExists
	var existingUser models.User
	if err := s.db.Where("username = ?", req.Username).First(&existingUser).Error; err == nil {
		return nil, errors.New("username already exists")
	}

	// ValidateBranch
	var branch models.Branch
	if err := s.db.Where("id = ? AND is_active = ?", req.BranchID, true).First(&branch).Error; err != nil {
		return nil, errors.New("specified branch does not exist or is inactive")
	}

	// GenerateEmployeeID -> "EMP-2026-0001"
	empCode, err := utils.GenerateEmployeeID(s.db)
	if err != nil {
		return nil, err
	}

	// GenerateQRToken -> "EMP-QR-<uuid>"
	qrToken, err := utils.GenerateQRToken(s.db)
	if err != nil {
		return nil, err
	}

	// HashPassword
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return nil, err
	}

	// Retrieve EMPLOYEE Role ID
	var empRole models.Role
	if err := s.db.Where("name = ?", "EMPLOYEE").First(&empRole).Error; err != nil {
		return nil, errors.New("default employee role not found in system")
	}

	var createdEmployee models.Employee
	var createdQR models.EmployeeQRCode

	// BEGIN TRANSACTION
	txErr := s.db.Transaction(func(tx *gorm.DB) error {
		// CreateUser()
		user := models.User{
			Username:     req.Username,
			PasswordHash: hashedPassword,
			RoleID:       empRole.ID,
			Status:       "ACTIVE",
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		// CreateEmployee()
		createdEmployee = models.Employee{
			UserID:       user.ID,
			EmployeeCode: empCode,
			BranchID:     req.BranchID,
			FirstName:    req.FirstName,
			LastName:     req.LastName,
			Email:        req.Email,
			Phone:        req.Phone,
			Position:     req.Position,
			Department:   req.Department,
			HireDate:     time.Now(),
			Status:       "ACTIVE",
		}
		if err := tx.Create(&createdEmployee).Error; err != nil {
			return err
		}

		// CreateEmployeeQRCode()
		createdQR = models.EmployeeQRCode{
			EmployeeID:  createdEmployee.ID,
			QRToken:     qrToken,
			IsActive:    true,
			GeneratedAt: time.Now(),
		}
		if err := tx.Create(&createdQR).Error; err != nil {
			return err
		}

		// Create default SalaryProfile if provided
		if req.MonthlyRate > 0 {
			dailyRate := utils.CalculateDailyRate(req.MonthlyRate, 26)
			hourlyRate := utils.CalculateHourlyRate(dailyRate)
			sss, philhealth, pagibig := utils.CalculateStatutoryDeduction(req.MonthlyRate)

			salary := models.SalaryProfile{
				EmployeeID:             createdEmployee.ID,
				MonthlyRate:            req.MonthlyRate,
				DailyRate:              dailyRate,
				HourlyRate:             hourlyRate,
				WorkingDaysPerMonth:    26,
				SSSContribution:        sss,
				PhilHealthContribution: philhealth,
				PagIbigContribution:   pagibig,
				EffectiveDate:          time.Now(),
			}
			if err := tx.Create(&salary).Error; err != nil {
				return err
			}
		}

		// CreateAuditLog(CREATE_EMPLOYEE)
		audit := models.AuditLog{
			UserID:    supervisorUserID,
			Action:    "CREATE_EMPLOYEE",
			Entity:    "employees",
			EntityID:  createdEmployee.ID,
			IPAddress: ipAddress,
			UserAgent: userAgent,
			Details:   "Created new employee " + empCode,
			Timestamp: time.Now(),
		}
		return tx.Create(&audit).Error
	})

	if txErr != nil {
		return nil, txErr
	}

	return &EmployeeRegisterResponse{
		EmployeeID:   createdEmployee.ID,
		EmployeeCode: createdEmployee.EmployeeCode,
		Username:     req.Username,
		FirstName:    createdEmployee.FirstName,
		LastName:     createdEmployee.LastName,
		Email:        createdEmployee.Email,
		Position:     createdEmployee.Position,
		Department:   createdEmployee.Department,
		BranchID:     createdEmployee.BranchID,
		QRToken:      qrToken,
		CreatedAt:    createdEmployee.CreatedAt,
	}, nil
}

func (s *EmployeeService) GetEmployee(id uint) (*models.Employee, error) {
	var emp models.Employee
	err := s.db.Preload("Branch").Preload("User").Preload("QRCode").Preload("SalaryProfile").First(&emp, id).Error
	if err != nil {
		return nil, err
	}
	return &emp, nil
}

func (s *EmployeeService) GetAllEmployees(branchID *uint) ([]models.Employee, error) {
	var employees []models.Employee
	query := s.db.Preload("Branch").Preload("User").Preload("QRCode").Preload("SalaryProfile")
	if branchID != nil && *branchID > 0 {
		query = query.Where("branch_id = ?", *branchID)
	}
	err := query.Find(&employees).Error
	return employees, err
}

func (s *EmployeeService) UpdateEmployee(id uint, updates map[string]interface{}) (*models.Employee, error) {
	var emp models.Employee
	if err := s.db.First(&emp, id).Error; err != nil {
		return nil, err
	}
	if err := s.db.Model(&emp).Updates(updates).Error; err != nil {
		return nil, err
	}
	return &emp, nil
}

func (s *EmployeeService) DeactivateEmployee(id uint) error {
	return s.db.Model(&models.Employee{}).Where("id = ?", id).Update("status", "INACTIVE").Error
}

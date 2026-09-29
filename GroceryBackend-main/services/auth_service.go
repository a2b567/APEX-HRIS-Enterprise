package services

import (
	"errors"
	"time"

	"grocery-backend/models"
	"grocery-backend/utils"

	"gorm.io/gorm"
)

type AuthService struct {
	db *gorm.DB
}

func NewAuthService(db *gorm.DB) *AuthService {
	return &AuthService{db: db}
}

type LoginResult struct {
	Token    string       `json:"token"`
	User     *models.User `json:"user"`
	Role     string       `json:"role"`
	BranchID uint         `json:"branch_id"`
}

func (s *AuthService) Login(req *utils.LoginRequest, ipAddress, userAgent string) (*LoginResult, error) {
	if err := utils.ValidateLoginInput(req); err != nil {
		return nil, err
	}

	var user models.User
	err := s.db.Preload("Role").Preload("Employee").Where("username = ?", req.Username).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, errors.New("invalid credentials")
		}
		return nil, err
	}

	// CheckUserStatus
	if user.Status != "ACTIVE" {
		return nil, errors.New("account is inactive or suspended")
	}

	// ComparePassword
	if !utils.ComparePassword(user.PasswordHash, req.Password) {
		return nil, errors.New("invalid credentials")
	}

	// Get role, branch, employee ID
	roleName := user.Role.Name
	var branchID uint = 0
	var employeeID uint = 0

	if user.Employee != nil {
		branchID = user.Employee.BranchID
		employeeID = user.Employee.ID
	}

	// GenerateJWT
	token, err := utils.GenerateJWT(user.ID, roleName, branchID, employeeID)
	if err != nil {
		return nil, errors.New("failed to generate authentication token")
	}

	// UpdateLastLogin
	now := time.Now()
	user.LastLogin = &now
	s.db.Model(&user).Update("last_login", now)

	// CreateAuditLog(LOGIN)
	s.db.Create(&models.AuditLog{
		UserID:    user.ID,
		Action:    "LOGIN",
		Entity:    "users",
		EntityID:  user.ID,
		IPAddress: ipAddress,
		UserAgent: userAgent,
		Details:   "User logged in successfully",
		Timestamp: now,
	})

	return &LoginResult{
		Token:    token,
		User:     &user,
		Role:     roleName,
		BranchID: branchID,
	}, nil
}

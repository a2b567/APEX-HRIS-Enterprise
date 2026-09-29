package utils

import (
	"errors"
	"strings"

	"github.com/gofiber/fiber/v2"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type EmployeeRequest struct {
	Username    string  `json:"username"`
	Password    string  `json:"password"`
	FirstName   string  `json:"first_name"`
	LastName    string  `json:"last_name"`
	Email       string  `json:"email"`
	Phone       string  `json:"phone"`
	Position    string  `json:"position"`
	Department  string  `json:"department"`
	BranchID    uint    `json:"branch_id"`
	MonthlyRate float64 `json:"monthly_rate"`
}

type TimeInRequest struct {
	QRToken string `json:"qr_token"`
}

type TimeOutRequest struct {
	QRToken string `json:"qr_token"`
}

func ParseLoginRequest(c *fiber.Ctx) (*LoginRequest, error) {
	req := new(LoginRequest)
	if err := c.BodyParser(req); err != nil {
		return nil, errors.New("invalid request payload")
	}
	return req, nil
}

func ValidateLoginInput(req *LoginRequest) error {
	if strings.TrimSpace(req.Username) == "" {
		return errors.New("username is required")
	}
	if strings.TrimSpace(req.Password) == "" {
		return errors.New("password is required")
	}
	return nil
}

func ParseEmployeeRequest(c *fiber.Ctx) (*EmployeeRequest, error) {
	req := new(EmployeeRequest)
	if err := c.BodyParser(req); err != nil {
		return nil, errors.New("invalid employee request payload")
	}
	return req, nil
}

func ValidateEmployeeInput(req *EmployeeRequest) error {
	if strings.TrimSpace(req.Username) == "" {
		return errors.New("username is required")
	}
	if len(req.Password) < 6 {
		return errors.New("password must be at least 6 characters")
	}
	if strings.TrimSpace(req.FirstName) == "" {
		return errors.New("first_name is required")
	}
	if strings.TrimSpace(req.LastName) == "" {
		return errors.New("last_name is required")
	}
	return nil
}

func ParseTimeInRequest(c *fiber.Ctx) (*TimeInRequest, error) {
	req := new(TimeInRequest)
	if err := c.BodyParser(req); err != nil {
		return nil, errors.New("invalid time-in request payload")
	}
	if strings.TrimSpace(req.QRToken) == "" {
		return nil, errors.New("qr_token is required")
	}
	return req, nil
}

func ParseTimeOutRequest(c *fiber.Ctx) (*TimeOutRequest, error) {
	req := new(TimeOutRequest)
	if err := c.BodyParser(req); err != nil {
		return nil, errors.New("invalid time-out request payload")
	}
	if strings.TrimSpace(req.QRToken) == "" {
		return nil, errors.New("qr_token is required")
	}
	return req, nil
}

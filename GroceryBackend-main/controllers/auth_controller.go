package controllers

import (
	"grocery-backend/services"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type AuthController struct {
	authService *services.AuthService
}

func NewAuthController(authService *services.AuthService) *AuthController {
	return &AuthController{authService: authService}
}

// Login handles POST /api/auth/login
func (ctrl *AuthController) Login(c *fiber.Ctx) error {
	req, err := utils.ParseLoginRequest(c)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	result, err := ctrl.authService.Login(req, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return utils.Unauthorized(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Login successful", result)
}

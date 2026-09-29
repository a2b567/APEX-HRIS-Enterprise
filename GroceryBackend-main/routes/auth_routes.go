package routes

import (
	"grocery-backend/controllers"

	"github.com/gofiber/fiber/v2"
)

func SetupAuthRoutes(router fiber.Router, authController *controllers.AuthController) {
	auth := router.Group("/auth")
	auth.Post("/login", authController.Login)
}

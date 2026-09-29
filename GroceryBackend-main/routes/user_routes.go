package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupUserRoutes(router fiber.Router, userController *controllers.UserController) {
	users := router.Group("/users", middleware.AuthMiddleware(), middleware.RoleMiddleware("SUPER_ADMIN"))
	users.Get("/", userController.GetAllUsers)
	users.Post("/supervisor", userController.CreateSupervisor)
}

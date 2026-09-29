package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupSalaryRoutes(router fiber.Router, salaryController *controllers.SalaryController) {
	salary := router.Group("/salary", middleware.AuthMiddleware())

	// View salary profile (SUPER_ADMIN, SUPERVISOR, EMPLOYEE)
	salary.Get("/:employeeId",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR", "EMPLOYEE"),
		salaryController.GetSalaryProfile,
	)

	// Create salary profile (SUPERVISOR, SUPER_ADMIN)
	salary.Post("/",
		middleware.RoleMiddleware("SUPERVISOR", "SUPER_ADMIN"),
		salaryController.CreateSalaryProfile,
	)

	// Update salary profile (SUPERVISOR, SUPER_ADMIN)
	salary.Put("/:id",
		middleware.RoleMiddleware("SUPERVISOR", "SUPER_ADMIN"),
		salaryController.UpdateSalaryProfile,
	)
}

package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupEmployeeRoutes(router fiber.Router, employeeController *controllers.EmployeeController) {
	employees := router.Group("/employees", middleware.AuthMiddleware())

	// List employees (SUPER_ADMIN, SUPERVISOR) - branch authorization enforced by BranchMiddleware
	employees.Get("/",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR"),
		middleware.BranchMiddleware(),
		employeeController.GetAllEmployees,
	)

	// Create employee (SUPERVISOR)
	employees.Post("/",
		middleware.RoleMiddleware("SUPERVISOR"),
		middleware.BranchMiddleware(),
		employeeController.RegisterEmployee,
	)

	// Get single employee (SUPER_ADMIN, SUPERVISOR, EMPLOYEE)
	employees.Get("/:id",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR", "EMPLOYEE"),
		employeeController.GetEmployee,
	)

	// Update employee (SUPER_ADMIN, SUPERVISOR)
	employees.Put("/:id",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR"),
		middleware.BranchMiddleware(),
		employeeController.UpdateEmployee,
	)

	// Deactivate employee (SUPER_ADMIN, SUPERVISOR)
	employees.Delete("/:id",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR"),
		middleware.BranchMiddleware(),
		employeeController.DeactivateEmployee,
	)

	// Get QR Code (SUPER_ADMIN, SUPERVISOR, EMPLOYEE)
	employees.Get("/:id/qr",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR", "EMPLOYEE"),
		employeeController.GetEmployeeQR,
	)
}

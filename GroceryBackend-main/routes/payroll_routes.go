package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupPayrollRoutes(router fiber.Router, payrollController *controllers.PayrollController) {
	payroll := router.Group("/payroll", middleware.AuthMiddleware())

	// View all payrolls (SUPER_ADMIN, SUPERVISOR)
	payroll.Get("/",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR"),
		middleware.BranchMiddleware(),
		payrollController.GetAllPayrolls,
	)

	// Generate payroll (SUPERVISOR)
	payroll.Post("/",
		middleware.RoleMiddleware("SUPERVISOR"),
		middleware.BranchMiddleware(),
		payrollController.GeneratePayroll,
	)

	// Get payroll by ID (SUPER_ADMIN, SUPERVISOR, EMPLOYEE)
	payroll.Get("/:id",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR", "EMPLOYEE"),
		payrollController.GetPayrollByID,
	)

	// Finalize payroll (SUPERVISOR)
	payroll.Put("/:id/finalize",
		middleware.RoleMiddleware("SUPERVISOR"),
		middleware.BranchMiddleware(),
		payrollController.FinalizePayroll,
	)

	// Mark payroll as paid (SUPER_ADMIN)
	payroll.Put("/:id/paid",
		middleware.RoleMiddleware("SUPER_ADMIN"),
		payrollController.MarkPaid,
	)
}

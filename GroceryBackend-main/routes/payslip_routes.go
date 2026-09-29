package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupPayslipRoutes(router fiber.Router, payslipController *controllers.PayslipController) {
	payslips := router.Group("/payslips", middleware.AuthMiddleware())

	// View all payslips (SUPER_ADMIN, SUPERVISOR, EMPLOYEE - filtered to own if EMPLOYEE)
	payslips.Get("/",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR", "EMPLOYEE"),
		payslipController.GetAllPayslips,
	)

	// Get single payslip (SUPER_ADMIN, SUPERVISOR, EMPLOYEE - own)
	payslips.Get("/:id",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR", "EMPLOYEE"),
		payslipController.GetPayslipByID,
	)

	// Download PDF (SUPER_ADMIN, SUPERVISOR, EMPLOYEE - own)
	payslips.Get("/:id/pdf",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR", "EMPLOYEE"),
		payslipController.DownloadPayslipPDF,
	)
}

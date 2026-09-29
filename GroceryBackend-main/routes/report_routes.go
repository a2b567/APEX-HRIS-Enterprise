package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupReportRoutes(router fiber.Router, reportController *controllers.ReportController, auditController *controllers.AuditController) {
	reports := router.Group("/reports", middleware.AuthMiddleware(), middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR"))
	reports.Get("/attendance", middleware.BranchMiddleware(), reportController.GetAttendanceReport)
	reports.Get("/payroll", middleware.BranchMiddleware(), reportController.GetPayrollReport)

	// Audit logs are restricted to SUPER_ADMIN only
	audit := router.Group("/audit-logs", middleware.AuthMiddleware(), middleware.RoleMiddleware("SUPER_ADMIN"))
	audit.Get("/", auditController.GetAuditLogs)
}

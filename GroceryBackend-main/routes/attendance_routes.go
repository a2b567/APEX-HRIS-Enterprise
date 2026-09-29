package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupAttendanceRoutes(router fiber.Router, attendanceController *controllers.AttendanceController) {
	attendance := router.Group("/attendance", middleware.AuthMiddleware())

	// Time In / Out (SUPERVISOR, SUPER_ADMIN)
	attendance.Post("/time-in",
		middleware.RoleMiddleware("SUPERVISOR", "SUPER_ADMIN"),
		attendanceController.TimeIn,
	)

	attendance.Post("/time-out",
		middleware.RoleMiddleware("SUPERVISOR", "SUPER_ADMIN"),
		attendanceController.TimeOut,
	)

	// List attendance records (SUPER_ADMIN, SUPERVISOR)
	attendance.Get("/",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR"),
		middleware.BranchMiddleware(),
		attendanceController.GetAttendanceList,
	)

	// Get attendance record by ID (SUPER_ADMIN, SUPERVISOR, EMPLOYEE)
	attendance.Get("/:id",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR", "EMPLOYEE"),
		attendanceController.GetAttendanceByID,
	)
}

package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupScheduleRoutes(router fiber.Router, scheduleController *controllers.ScheduleController) {
	schedules := router.Group("/schedules", middleware.AuthMiddleware())

	// View employee schedule (SUPER_ADMIN, SUPERVISOR)
	schedules.Get("/:employeeId",
		middleware.RoleMiddleware("SUPER_ADMIN", "SUPERVISOR"),
		scheduleController.GetEmployeeSchedule,
	)

	// Create employee schedule (SUPERVISOR, SUPER_ADMIN)
	schedules.Post("/",
		middleware.RoleMiddleware("SUPERVISOR", "SUPER_ADMIN"),
		scheduleController.CreateSchedule,
	)

	// Update employee schedule (SUPERVISOR, SUPER_ADMIN)
	schedules.Put("/:id",
		middleware.RoleMiddleware("SUPERVISOR", "SUPER_ADMIN"),
		scheduleController.UpdateSchedule,
	)
}

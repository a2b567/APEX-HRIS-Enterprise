package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupBranchRoutes(router fiber.Router, branchController *controllers.BranchController) {
	branches := router.Group("/branches", middleware.AuthMiddleware(), middleware.RoleMiddleware("SUPER_ADMIN"))
	branches.Get("/", branchController.GetAllBranches)
	branches.Post("/", branchController.CreateBranch)
	branches.Put("/:id", branchController.UpdateBranch)
}

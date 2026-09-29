package middleware

import (
	"strconv"

	"grocery-backend/connection"
	"grocery-backend/models"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

// BranchMiddleware enforces branch ownership for non-super-admin users
func BranchMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		roleVal := c.Locals("role")
		if roleVal == nil {
			return utils.Unauthorized(c, "Authentication required")
		}

		userRole := roleVal.(string)
		// SUPER_ADMIN has unrestricted branch access across the system
		if userRole == "SUPER_ADMIN" {
			return c.Next()
		}

		userIDVal := c.Locals("user_id")
		if userIDVal == nil {
			return utils.Unauthorized(c, "Invalid user identification")
		}
		userID := userIDVal.(uint)

		// Get supervisor's actual branch from the database
		var emp models.Employee
		err := connection.DB.Where("user_id = ?", userID).First(&emp).Error
		if err != nil {
			return utils.Forbidden(c, "User is not assigned to an active branch")
		}

		actualBranchID := emp.BranchID
		c.Locals("authorized_branch_id", actualBranchID)

		// Check if branch_id was provided as query param or route param
		requestedBranchStr := c.Query("branch_id")
		if requestedBranchStr == "" {
			requestedBranchStr = c.Params("branch_id")
		}

		if requestedBranchStr != "" {
			requestedBranchID, err := strconv.ParseUint(requestedBranchStr, 10, 32)
			if err == nil && uint(requestedBranchID) != actualBranchID {
				return utils.Forbidden(c, "Access denied: cannot access resources from another branch")
			}
		}

		return c.Next()
	}
}

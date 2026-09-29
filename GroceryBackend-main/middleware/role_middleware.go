package middleware

import (
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

// RoleMiddleware checks whether the authenticated user's role matches any of the allowed roles
func RoleMiddleware(allowedRoles ...string) fiber.Handler {
	return func(c *fiber.Ctx) error {
		roleVal := c.Locals("role")
		if roleVal == nil {
			return utils.Unauthorized(c, "Authentication required")
		}

		userRole, ok := roleVal.(string)
		if !ok {
			return utils.Forbidden(c, "Invalid user role format")
		}

		for _, allowed := range allowedRoles {
			if userRole == allowed {
				return c.Next()
			}
		}

		return utils.Forbidden(c, "You do not have permission to perform this action")
	}
}

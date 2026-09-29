package middleware

import (
	"strings"

	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

// AuthMiddleware validates JWT in Authorization header and populates context locals
func AuthMiddleware() fiber.Handler {
	return func(c *fiber.Ctx) error {
		authHeader := c.Get("Authorization")
		if authHeader == "" {
			return utils.Unauthorized(c, "Authorization header is missing")
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			return utils.Unauthorized(c, "Invalid Authorization header format. Expected 'Bearer <token>'")
		}

		claims, err := utils.ValidateJWT(parts[1])
		if err != nil {
			return utils.Unauthorized(c, "Invalid or expired token")
		}

		// Store user claims in context
		c.Locals("user_id", claims.UserID)
		c.Locals("role", claims.Role)
		c.Locals("branch_id", claims.BranchID)
		c.Locals("employee_id", claims.EmployeeID)
		c.Locals("claims", claims)

		return c.Next()
	}
}

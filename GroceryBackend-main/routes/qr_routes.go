package routes

import (
	"grocery-backend/controllers"
	"grocery-backend/middleware"

	"github.com/gofiber/fiber/v2"
)

func SetupQRRoutes(router fiber.Router, qrController *controllers.QRController) {
	qr := router.Group("/qr", middleware.AuthMiddleware(), middleware.RoleMiddleware("SUPERVISOR", "SUPER_ADMIN"))
	qr.Post("/scan", qrController.ScanQR)
}

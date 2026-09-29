package controllers

import (
	"grocery-backend/services"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type QRController struct {
	qrService *services.QRService
}

func NewQRController(qrService *services.QRService) *QRController {
	return &QRController{qrService: qrService}
}

type QRScanRequest struct {
	QRToken string `json:"qr_token"`
}

// ScanQR handles POST /api/qr/scan
func (ctrl *QRController) ScanQR(c *fiber.Ctx) error {
	var req QRScanRequest
	if err := c.BodyParser(&req); err != nil || req.QRToken == "" {
		return utils.BadRequest(c, "qr_token is required")
	}

	emp, qr, err := ctrl.qrService.FindEmployeeByQR(req.QRToken)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "QR validated successfully", fiber.Map{
		"employee_id":   emp.ID,
		"employee_code": emp.EmployeeCode,
		"full_name":     emp.FirstName + " " + emp.LastName,
		"branch_id":     emp.BranchID,
		"branch_name":   emp.Branch.BranchName,
		"status":        emp.Status,
		"qr_is_active":  qr.IsActive,
	})
}

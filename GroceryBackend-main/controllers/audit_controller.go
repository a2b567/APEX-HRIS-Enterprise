package controllers

import (
	"strconv"

	"grocery-backend/services"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type AuditController struct {
	reportService *services.ReportService
}

func NewAuditController(reportService *services.ReportService) *AuditController {
	return &AuditController{reportService: reportService}
}

// GetAuditLogs handles GET /api/audit-logs
func (ctrl *AuditController) GetAuditLogs(c *fiber.Ctx) error {
	action := c.Query("action")
	entity := c.Query("entity")

	var userIDPtr *uint
	if userStr := c.Query("user_id"); userStr != "" {
		if uID, err := strconv.ParseUint(userStr, 10, 32); err == nil {
			u := uint(uID)
			userIDPtr = &u
		}
	}

	limit := 50
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 {
			limit = l
		}
	}

	offset := 0
	if offsetStr := c.Query("offset"); offsetStr != "" {
		if o, err := strconv.Atoi(offsetStr); err == nil && o >= 0 {
			offset = o
		}
	}

	logs, total, err := ctrl.reportService.GetAuditLogs(action, entity, userIDPtr, limit, offset)
	if err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Audit logs retrieved", fiber.Map{
		"total":  total,
		"limit":  limit,
		"offset": offset,
		"logs":   logs,
	})
}

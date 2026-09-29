package controllers

import (
	"strconv"
	"time"

	"grocery-backend/services"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type ReportController struct {
	reportService *services.ReportService
}

func NewReportController(reportService *services.ReportService) *ReportController {
	return &ReportController{reportService: reportService}
}

// GetAttendanceReport handles GET /api/reports/attendance
func (ctrl *ReportController) GetAttendanceReport(c *fiber.Ctx) error {
	var branchIDPtr *uint
	if branchIDVal := c.Locals("authorized_branch_id"); branchIDVal != nil {
		bID := branchIDVal.(uint)
		branchIDPtr = &bID
	} else if branchStr := c.Query("branch_id"); branchStr != "" {
		if bID, err := strconv.ParseUint(branchStr, 10, 32); err == nil {
			u := uint(bID)
			branchIDPtr = &u
		}
	}

	startDate := time.Now().AddDate(0, -1, 0)
	endDate := time.Now()

	if startStr := c.Query("start_date"); startStr != "" {
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			startDate = t
		}
	}
	if endStr := c.Query("end_date"); endStr != "" {
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			endDate = t
		}
	}

	report, err := ctrl.reportService.GetAttendanceReport(branchIDPtr, startDate, endDate)
	if err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Attendance report generated", report)
}

// GetPayrollReport handles GET /api/reports/payroll
func (ctrl *ReportController) GetPayrollReport(c *fiber.Ctx) error {
	var branchIDPtr *uint
	if branchIDVal := c.Locals("authorized_branch_id"); branchIDVal != nil {
		bID := branchIDVal.(uint)
		branchIDPtr = &bID
	} else if branchStr := c.Query("branch_id"); branchStr != "" {
		if bID, err := strconv.ParseUint(branchStr, 10, 32); err == nil {
			u := uint(bID)
			branchIDPtr = &u
		}
	}

	startDate := time.Now().AddDate(0, -1, 0)
	endDate := time.Now()

	if startStr := c.Query("start_date"); startStr != "" {
		if t, err := time.Parse("2006-01-02", startStr); err == nil {
			startDate = t
		}
	}
	if endStr := c.Query("end_date"); endStr != "" {
		if t, err := time.Parse("2006-01-02", endStr); err == nil {
			endDate = t
		}
	}

	report, err := ctrl.reportService.GetPayrollReport(branchIDPtr, startDate, endDate)
	if err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Payroll report generated", report)
}

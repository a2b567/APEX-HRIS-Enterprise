package controllers

import (
	"strconv"
	"time"

	"grocery-backend/services"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type AttendanceController struct {
	attendanceService *services.AttendanceService
}

func NewAttendanceController(attendanceService *services.AttendanceService) *AttendanceController {
	return &AttendanceController{attendanceService: attendanceService}
}

// TimeIn handles POST /api/attendance/time-in
func (ctrl *AttendanceController) TimeIn(c *fiber.Ctx) error {
	req, err := utils.ParseTimeInRequest(c)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)
	branchID := c.Locals("branch_id").(uint)

	result, err := ctrl.attendanceService.RecordTimeIn(req.QRToken, userID, branchID, role, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Time in recorded successfully", result)
}

// TimeOut handles POST /api/attendance/time-out
func (ctrl *AttendanceController) TimeOut(c *fiber.Ctx) error {
	req, err := utils.ParseTimeOutRequest(c)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	userID := c.Locals("user_id").(uint)
	role := c.Locals("role").(string)
	branchID := c.Locals("branch_id").(uint)

	result, err := ctrl.attendanceService.RecordTimeOut(req.QRToken, userID, branchID, role, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Time out recorded successfully", result)
}

// GetAttendanceList handles GET /api/attendance
func (ctrl *AttendanceController) GetAttendanceList(c *fiber.Ctx) error {
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

	var datePtr *time.Time
	if dateStr := c.Query("date"); dateStr != "" {
		if t, err := time.Parse("2006-01-02", dateStr); err == nil {
			datePtr = &t
		}
	}

	records, err := ctrl.attendanceService.GetAttendanceList(branchIDPtr, datePtr, nil)
	if err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Attendance records retrieved", records)
}

// GetAttendanceByID handles GET /api/attendance/:id
func (ctrl *AttendanceController) GetAttendanceByID(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid attendance ID")
	}

	rec, err := ctrl.attendanceService.GetAttendanceByID(uint(id))
	if err != nil {
		return utils.NotFound(c, "Attendance record not found")
	}

	role := c.Locals("role").(string)
	empIDVal := c.Locals("employee_id")
	if role == "EMPLOYEE" {
		if empIDVal == nil || empIDVal.(uint) != rec.EmployeeID {
			return utils.Forbidden(c, "You may only access your own attendance record")
		}
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Attendance record retrieved", rec)
}

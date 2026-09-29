package controllers

import (
	"strconv"
	"time"

	"grocery-backend/connection"
	"grocery-backend/models"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type ScheduleController struct{}

func NewScheduleController() *ScheduleController {
	return &ScheduleController{}
}

// GetEmployeeSchedule handles GET /api/schedules/:employeeId
func (ctrl *ScheduleController) GetEmployeeSchedule(c *fiber.Ctx) error {
	empIDParam := c.Params("employeeId")
	empID, err := strconv.ParseUint(empIDParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid employee ID")
	}

	var schedules []models.EmployeeSchedule
	err = connection.DB.Where("employee_id = ?", empID).Order("day_of_week ASC").Find(&schedules).Error
	if err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Employee schedules retrieved", schedules)
}

type ScheduleInput struct {
	EmployeeID   uint   `json:"employee_id"`
	DayOfWeek    int    `json:"day_of_week"`
	ScheduledIn  string `json:"scheduled_in"`
	ScheduledOut string `json:"scheduled_out"`
	BreakMinutes int    `json:"break_minutes"`
	IsRestDay    bool   `json:"is_rest_day"`
}

// CreateSchedule handles POST /api/schedules
func (ctrl *ScheduleController) CreateSchedule(c *fiber.Ctx) error {
	var input ScheduleInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "Invalid request payload")
	}

	if input.ScheduledIn == "" {
		input.ScheduledIn = "08:00"
	}
	if input.ScheduledOut == "" {
		input.ScheduledOut = "17:00"
	}
	if input.BreakMinutes <= 0 {
		input.BreakMinutes = 60
	}

	sched := models.EmployeeSchedule{
		EmployeeID:    input.EmployeeID,
		DayOfWeek:     input.DayOfWeek,
		ScheduledIn:   input.ScheduledIn,
		ScheduledOut:  input.ScheduledOut,
		BreakMinutes:  input.BreakMinutes,
		IsRestDay:     input.IsRestDay,
		EffectiveDate: time.Now(),
	}

	if err := connection.DB.Create(&sched).Error; err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Schedule created successfully", sched)
}

// UpdateSchedule handles PUT /api/schedules/:id
func (ctrl *ScheduleController) UpdateSchedule(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid schedule ID")
	}

	var sched models.EmployeeSchedule
	if err := connection.DB.First(&sched, id).Error; err != nil {
		return utils.NotFound(c, "Schedule not found")
	}

	var input ScheduleInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "Invalid payload")
	}

	updates := map[string]interface{}{}
	if input.ScheduledIn != "" {
		updates["scheduled_in"] = input.ScheduledIn
	}
	if input.ScheduledOut != "" {
		updates["scheduled_out"] = input.ScheduledOut
	}
	if input.BreakMinutes > 0 {
		updates["break_minutes"] = input.BreakMinutes
	}
	updates["is_rest_day"] = input.IsRestDay

	if err := connection.DB.Model(&sched).Updates(updates).Error; err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Schedule updated successfully", sched)
}

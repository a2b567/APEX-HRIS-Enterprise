package controllers

import (
	"strconv"

	"grocery-backend/services"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type SalaryController struct {
	salaryService *services.SalaryService
}

func NewSalaryController(salaryService *services.SalaryService) *SalaryController {
	return &SalaryController{salaryService: salaryService}
}

// GetSalaryProfile handles GET /api/salary/:employeeId
func (ctrl *SalaryController) GetSalaryProfile(c *fiber.Ctx) error {
	empIDParam := c.Params("employeeId")
	empID, err := strconv.ParseUint(empIDParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid employee ID")
	}

	role := c.Locals("role").(string)
	empIDVal := c.Locals("employee_id")
	if role == "EMPLOYEE" {
		if empIDVal == nil || empIDVal.(uint) != uint(empID) {
			return utils.Forbidden(c, "You may only access your own salary profile")
		}
	}

	profile, err := ctrl.salaryService.GetSalaryProfile(uint(empID))
	if err != nil {
		return utils.NotFound(c, "Salary profile not found")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Salary profile retrieved", profile)
}

// CreateSalaryProfile handles POST /api/salary
func (ctrl *SalaryController) CreateSalaryProfile(c *fiber.Ctx) error {
	var input services.SalaryProfileInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "Invalid request payload")
	}

	profile, err := ctrl.salaryService.CreateSalaryProfile(&input)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Salary profile created", profile)
}

// UpdateSalaryProfile handles PUT /api/salary/:id
func (ctrl *SalaryController) UpdateSalaryProfile(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid salary profile ID")
	}

	var input services.SalaryProfileInput
	if err := c.BodyParser(&input); err != nil {
		return utils.BadRequest(c, "Invalid request payload")
	}

	profile, err := ctrl.salaryService.UpdateSalaryProfile(uint(id), &input)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Salary profile updated", profile)
}

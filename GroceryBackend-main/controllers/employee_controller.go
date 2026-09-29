package controllers

import (
	"strconv"

	"grocery-backend/services"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type EmployeeController struct {
	employeeService *services.EmployeeService
	qrService       *services.QRService
}

func NewEmployeeController(employeeService *services.EmployeeService, qrService *services.QRService) *EmployeeController {
	return &EmployeeController{
		employeeService: employeeService,
		qrService:       qrService,
	}
}

// RegisterEmployee handles POST /api/employees
func (ctrl *EmployeeController) RegisterEmployee(c *fiber.Ctx) error {
	req, err := utils.ParseEmployeeRequest(c)
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	role := c.Locals("role").(string)
	if role != "SUPER_ADMIN" {
		// Enforce supervisor's branch
		if branchIDVal := c.Locals("authorized_branch_id"); branchIDVal != nil {
			req.BranchID = branchIDVal.(uint)
		} else if branchIDVal := c.Locals("branch_id"); branchIDVal != nil {
			req.BranchID = branchIDVal.(uint)
		}
	}

	userID := c.Locals("user_id").(uint)
	result, err := ctrl.employeeService.RegisterEmployee(req, userID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Employee registered successfully", result)
}

// GetAllEmployees handles GET /api/employees
func (ctrl *EmployeeController) GetAllEmployees(c *fiber.Ctx) error {
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

	employees, err := ctrl.employeeService.GetAllEmployees(branchIDPtr)
	if err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Employees retrieved successfully", employees)
}

// GetEmployee handles GET /api/employees/:id
func (ctrl *EmployeeController) GetEmployee(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid employee ID")
	}

	role := c.Locals("role").(string)
	empIDVal := c.Locals("employee_id")
	if role == "EMPLOYEE" {
		if empIDVal == nil || empIDVal.(uint) != uint(id) {
			return utils.Forbidden(c, "You may only access your own employee profile")
		}
	}

	emp, err := ctrl.employeeService.GetEmployee(uint(id))
	if err != nil {
		return utils.NotFound(c, "Employee not found")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Employee retrieved successfully", emp)
}

// UpdateEmployee handles PUT /api/employees/:id
func (ctrl *EmployeeController) UpdateEmployee(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid employee ID")
	}

	var updates map[string]interface{}
	if err := c.BodyParser(&updates); err != nil {
		return utils.BadRequest(c, "Invalid payload")
	}

	// Remove forbidden fields from updates
	delete(updates, "id")
	delete(updates, "employee_code")
	delete(updates, "user_id")

	emp, err := ctrl.employeeService.UpdateEmployee(uint(id), updates)
	if err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Employee updated successfully", emp)
}

// DeactivateEmployee handles DELETE /api/employees/:id
func (ctrl *EmployeeController) DeactivateEmployee(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid employee ID")
	}

	if err := ctrl.employeeService.DeactivateEmployee(uint(id)); err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Employee deactivated successfully", nil)
}

// GetEmployeeQR handles GET /api/employees/:id/qr
func (ctrl *EmployeeController) GetEmployeeQR(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid employee ID")
	}

	role := c.Locals("role").(string)
	empIDVal := c.Locals("employee_id")
	if role == "EMPLOYEE" {
		if empIDVal == nil || empIDVal.(uint) != uint(id) {
			return utils.Forbidden(c, "You may only access your own QR code")
		}
	}

	qr, err := ctrl.qrService.GetEmployeeQRCode(uint(id))
	if err != nil {
		return utils.NotFound(c, "Active QR code not found for this employee")
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "QR code retrieved successfully", qr)
}

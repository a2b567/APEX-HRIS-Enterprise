package controllers

import (
	"strconv"
	"time"

	"grocery-backend/services"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type PayrollController struct {
	payrollService *services.PayrollService
}

func NewPayrollController(payrollService *services.PayrollService) *PayrollController {
	return &PayrollController{payrollService: payrollService}
}

type GeneratePayrollBody struct {
	BranchID    uint   `json:"branch_id"`
	PeriodStart string `json:"period_start"`
	PeriodEnd   string `json:"period_end"`
}

// GeneratePayroll handles POST /api/payroll
func (ctrl *PayrollController) GeneratePayroll(c *fiber.Ctx) error {
	var body GeneratePayrollBody
	if err := c.BodyParser(&body); err != nil {
		return utils.BadRequest(c, "Invalid request payload")
	}

	role := c.Locals("role").(string)
	if role != "SUPER_ADMIN" {
		if branchIDVal := c.Locals("authorized_branch_id"); branchIDVal != nil {
			body.BranchID = branchIDVal.(uint)
		} else if branchIDVal := c.Locals("branch_id"); branchIDVal != nil {
			body.BranchID = branchIDVal.(uint)
		}
	}

	start, err := time.Parse("2006-01-02", body.PeriodStart)
	if err != nil {
		return utils.BadRequest(c, "Invalid period_start format (expected YYYY-MM-DD)")
	}
	end, err := time.Parse("2006-01-02", body.PeriodEnd)
	if err != nil {
		return utils.BadRequest(c, "Invalid period_end format (expected YYYY-MM-DD)")
	}

	input := services.GeneratePayrollInput{
		BranchID:    body.BranchID,
		PeriodStart: start,
		PeriodEnd:   end,
	}

	userID := c.Locals("user_id").(uint)
	payrolls, err := ctrl.payrollService.GeneratePayrollForBranch(&input, userID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusCreated, "Draft payroll generated", payrolls)
}

// GetAllPayrolls handles GET /api/payroll
func (ctrl *PayrollController) GetAllPayrolls(c *fiber.Ctx) error {
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

	var empIDPtr *uint
	if empStr := c.Query("employee_id"); empStr != "" {
		if eID, err := strconv.ParseUint(empStr, 10, 32); err == nil {
			u := uint(eID)
			empIDPtr = &u
		}
	}

	payrolls, err := ctrl.payrollService.GetAllPayrolls(branchIDPtr, empIDPtr)
	if err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Payrolls retrieved", payrolls)
}

// GetPayrollByID handles GET /api/payroll/:id
func (ctrl *PayrollController) GetPayrollByID(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid payroll ID")
	}

	payroll, err := ctrl.payrollService.GetPayrollByID(uint(id))
	if err != nil {
		return utils.NotFound(c, "Payroll not found")
	}

	role := c.Locals("role").(string)
	empIDVal := c.Locals("employee_id")
	if role == "EMPLOYEE" {
		if empIDVal == nil || empIDVal.(uint) != payroll.EmployeeID {
			return utils.Forbidden(c, "You may only access your own payroll record")
		}
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Payroll retrieved", payroll)
}

// FinalizePayroll handles PUT /api/payroll/:id/finalize
func (ctrl *PayrollController) FinalizePayroll(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid payroll ID")
	}

	userID := c.Locals("user_id").(uint)
	payslip, err := ctrl.payrollService.FinalizePayroll(uint(id), userID, c.IP(), c.Get("User-Agent"))
	if err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Payroll finalized and payslip generated", payslip)
}

// MarkPaid handles PUT /api/payroll/:id/paid
func (ctrl *PayrollController) MarkPaid(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid payroll ID")
	}

	adminID := c.Locals("user_id").(uint)
	if err := ctrl.payrollService.MarkPayrollPaid(uint(id), adminID, c.IP(), c.Get("User-Agent")); err != nil {
		return utils.BadRequest(c, err.Error())
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Payroll marked as PAID", nil)
}

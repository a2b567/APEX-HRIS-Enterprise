package controllers

import (
	"os"
	"strconv"

	"grocery-backend/services"
	"grocery-backend/utils"

	"github.com/gofiber/fiber/v2"
)

type PayslipController struct {
	payslipService *services.PayslipService
}

func NewPayslipController(payslipService *services.PayslipService) *PayslipController {
	return &PayslipController{payslipService: payslipService}
}

// GetAllPayslips handles GET /api/payslips
func (ctrl *PayslipController) GetAllPayslips(c *fiber.Ctx) error {
	role := c.Locals("role").(string)
	empIDVal := c.Locals("employee_id")

	var empIDPtr *uint
	if role == "EMPLOYEE" {
		if empIDVal != nil {
			id := empIDVal.(uint)
			empIDPtr = &id
		}
	} else if empStr := c.Query("employee_id"); empStr != "" {
		if id, err := strconv.ParseUint(empStr, 10, 32); err == nil {
			u := uint(id)
			empIDPtr = &u
		}
	}

	payslips, err := ctrl.payslipService.GetAllPayslips(empIDPtr)
	if err != nil {
		return utils.HandleError(c, err)
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Payslips retrieved", payslips)
}

// GetPayslipByID handles GET /api/payslips/:id
func (ctrl *PayslipController) GetPayslipByID(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid payslip ID")
	}

	payslip, err := ctrl.payslipService.GetPayslip(uint(id))
	if err != nil {
		return utils.NotFound(c, "Payslip not found")
	}

	role := c.Locals("role").(string)
	empIDVal := c.Locals("employee_id")
	if role == "EMPLOYEE" {
		if empIDVal == nil || empIDVal.(uint) != payslip.Payroll.EmployeeID {
			return utils.Forbidden(c, "You may only access your own payslip")
		}
	}

	return utils.SuccessResponse(c, fiber.StatusOK, "Payslip retrieved", payslip)
}

// DownloadPayslipPDF handles GET /api/payslips/:id/pdf
func (ctrl *PayslipController) DownloadPayslipPDF(c *fiber.Ctx) error {
	idParam := c.Params("id")
	id, err := strconv.ParseUint(idParam, 10, 32)
	if err != nil {
		return utils.BadRequest(c, "Invalid payslip ID")
	}

	payslip, err := ctrl.payslipService.GetPayslip(uint(id))
	if err != nil {
		return utils.NotFound(c, "Payslip not found")
	}

	role := c.Locals("role").(string)
	empIDVal := c.Locals("employee_id")
	if role == "EMPLOYEE" {
		if empIDVal == nil || empIDVal.(uint) != payslip.Payroll.EmployeeID {
			return utils.Forbidden(c, "You may only access your own payslip PDF")
		}
	}

	if _, err := os.Stat(payslip.PDFPath); os.IsNotExist(err) {
		// Attempt to regenerate PDF if file is missing
		pdfPath, regErr := ctrl.payslipService.GeneratePayslipPDF(payslip.PayrollID)
		if regErr != nil {
			return utils.NotFound(c, "Payslip PDF file not found and could not be generated")
		}
		payslip.PDFPath = pdfPath
	}

	return c.Download(payslip.PDFPath)
}

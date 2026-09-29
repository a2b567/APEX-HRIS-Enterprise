package services

import (
	"fmt"
	"os"
	"time"

	"grocery-backend/models"

	"github.com/jung-kurt/gofpdf"
	"gorm.io/gorm"
)

type PayslipService struct {
	db *gorm.DB
}

func NewPayslipService(db *gorm.DB) *PayslipService {
	return &PayslipService{db: db}
}

func (s *PayslipService) BuildPayslipData(payrollID uint) (*models.Payroll, error) {
	var payroll models.Payroll
	err := s.db.Preload("Employee").
		Preload("Employee.Branch").
		Preload("Earnings").
		Preload("Deductions").
		First(&payroll, payrollID).Error
	if err != nil {
		return nil, err
	}
	return &payroll, nil
}

func (s *PayslipService) SavePayslip(payrollID uint, pdfPath string) (*models.Payslip, error) {
	payslipNumber := fmt.Sprintf("PS-%d-%d", time.Now().Year(), payrollID)

	var payslip models.Payslip
	err := s.db.Where("payroll_id = ?", payrollID).First(&payslip).Error
	if err == nil {
		// Update existing
		payslip.PDFPath = pdfPath
		payslip.GeneratedAt = time.Now()
		s.db.Save(&payslip)
		return &payslip, nil
	}

	payslip = models.Payslip{
		PayrollID:     payrollID,
		PayslipNumber: payslipNumber,
		PDFPath:       pdfPath,
		GeneratedAt:   time.Now(),
	}

	if err := s.db.Create(&payslip).Error; err != nil {
		return nil, err
	}
	return &payslip, nil
}

func (s *PayslipService) GeneratePayslipPDF(payrollID uint) (string, error) {
	payroll, err := s.BuildPayslipData(payrollID)
	if err != nil {
		return "", err
	}

	storageDir := "./storage/payslips"
	if envStorage := os.Getenv("STORAGE_PATH"); envStorage != "" {
		storageDir = envStorage + "/payslips"
	}
	if err := os.MkdirAll(storageDir, 0755); err != nil {
		return "", err
	}

	filePath := fmt.Sprintf("%s/payslip_%d.pdf", storageDir, payrollID)

	pdf := gofpdf.New("P", "mm", "A4", "")
	pdf.AddPage()
	pdf.SetFont("Arial", "B", 18)
	pdf.Cell(190, 10, "GROCERY BACKEND - OFFICIAL PAYSLIP")
	pdf.Ln(12)

	pdf.SetFont("Arial", "", 11)
	empName := fmt.Sprintf("%s %s", payroll.Employee.FirstName, payroll.Employee.LastName)
	branchName := payroll.Employee.Branch.BranchName
	pdf.Cell(95, 7, fmt.Sprintf("Employee: %s (%s)", empName, payroll.Employee.EmployeeCode))
	pdf.Cell(95, 7, fmt.Sprintf("Branch: %s", branchName))
	pdf.Ln(7)
	pdf.Cell(95, 7, fmt.Sprintf("Period: %s to %s", payroll.PeriodStart.Format("2006-01-02"), payroll.PeriodEnd.Format("2006-01-02")))
	pdf.Cell(95, 7, fmt.Sprintf("Date Generated: %s", time.Now().Format("2006-01-02 15:04")))
	pdf.Ln(12)

	// Earnings Section
	pdf.SetFont("Arial", "B", 13)
	pdf.Cell(190, 8, "EARNINGS")
	pdf.Ln(8)
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(140, 6, "Basic Pay")
	pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.BasicPay))
	pdf.Ln(6)
	pdf.Cell(140, 6, "Overtime Pay")
	pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.OvertimePay))
	pdf.Ln(6)
	if payroll.OtherEarnings > 0 {
		pdf.Cell(140, 6, "Other Earnings")
		pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.OtherEarnings))
		pdf.Ln(6)
	}
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(140, 7, "GROSS PAY")
	pdf.Cell(50, 7, fmt.Sprintf("PHP %.2f", payroll.GrossPay))
	pdf.Ln(10)

	// Deductions Section
	pdf.SetFont("Arial", "B", 13)
	pdf.Cell(190, 8, "DEDUCTIONS")
	pdf.Ln(8)
	pdf.SetFont("Arial", "", 10)
	pdf.Cell(140, 6, "SSS Contribution")
	pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.SSS))
	pdf.Ln(6)
	pdf.Cell(140, 6, "PhilHealth Contribution")
	pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.PhilHealth))
	pdf.Ln(6)
	pdf.Cell(140, 6, "Pag-IBIG Contribution")
	pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.PagIBIG))
	pdf.Ln(6)
	if payroll.LateDeduction > 0 {
		pdf.Cell(140, 6, "Late Deduction")
		pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.LateDeduction))
		pdf.Ln(6)
	}
	if payroll.UndertimeDeduction > 0 {
		pdf.Cell(140, 6, "Undertime Deduction")
		pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.UndertimeDeduction))
		pdf.Ln(6)
	}
	if payroll.AbsenceDeduction > 0 {
		pdf.Cell(140, 6, "Absence Deduction")
		pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.AbsenceDeduction))
		pdf.Ln(6)
	}
	if payroll.OtherDeductions > 0 {
		pdf.Cell(140, 6, "Other Deductions")
		pdf.Cell(50, 6, fmt.Sprintf("PHP %.2f", payroll.OtherDeductions))
		pdf.Ln(6)
	}
	pdf.SetFont("Arial", "B", 11)
	pdf.Cell(140, 7, "TOTAL DEDUCTIONS")
	pdf.Cell(50, 7, fmt.Sprintf("PHP %.2f", payroll.TotalDeductions))
	pdf.Ln(12)

	// Net Pay Summary
	pdf.SetFont("Arial", "B", 14)
	pdf.Cell(140, 9, "NET TAKE-HOME PAY")
	pdf.Cell(50, 9, fmt.Sprintf("PHP %.2f", payroll.NetPay))
	pdf.Ln(15)

	pdf.SetFont("Arial", "I", 9)
	pdf.Cell(190, 5, "This document is computer-generated. No signature required.")

	if err := pdf.OutputFileAndClose(filePath); err != nil {
		return "", err
	}

	return filePath, nil
}

func (s *PayslipService) GeneratePayslip(payrollID uint) (*models.Payslip, error) {
	pdfPath, err := s.GeneratePayslipPDF(payrollID)
	if err != nil {
		return nil, err
	}
	return s.SavePayslip(payrollID, pdfPath)
}

func (s *PayslipService) GetPayslip(id uint) (*models.Payslip, error) {
	var payslip models.Payslip
	err := s.db.Preload("Payroll").
		Preload("Payroll.Employee").
		Preload("Payroll.Employee.Branch").
		Preload("Payroll.Earnings").
		Preload("Payroll.Deductions").
		First(&payslip, id).Error
	if err != nil {
		return nil, err
	}
	return &payslip, nil
}

func (s *PayslipService) GetPayslipByPayroll(payrollID uint) (*models.Payslip, error) {
	var payslip models.Payslip
	err := s.db.Preload("Payroll").
		Preload("Payroll.Employee").
		Preload("Payroll.Employee.Branch").
		Preload("Payroll.Earnings").
		Preload("Payroll.Deductions").
		Where("payroll_id = ?", payrollID).First(&payslip).Error
	if err != nil {
		return nil, err
	}
	return &payslip, nil
}

func (s *PayslipService) GetAllPayslips(employeeID *uint) ([]models.Payslip, error) {
	var payslips []models.Payslip
	query := s.db.Preload("Payroll").Preload("Payroll.Employee").Preload("Payroll.Employee.Branch")
	if employeeID != nil && *employeeID > 0 {
		query = query.Joins("JOIN payrolls ON payrolls.id = payslips.payroll_id").Where("payrolls.employee_id = ?", *employeeID)
	}
	err := query.Find(&payslips).Error
	return payslips, err
}

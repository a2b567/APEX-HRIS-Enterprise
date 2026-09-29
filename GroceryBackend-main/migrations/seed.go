package migrations

import (
	"log"
	"time"

	"grocery-backend/models"
	"grocery-backend/utils"

	"gorm.io/gorm"
)

// RunSeeders seeds default roles, branches, and administrative accounts
func RunSeeders(db *gorm.DB) error {
	if db == nil {
		return nil
	}

	log.Println("Running database seeders...")

	// 1. Seed Roles
	roles := []models.Role{
		{ID: 1, Name: "SUPER_ADMIN", Description: "System Administrator with full permissions"},
		{ID: 2, Name: "SUPERVISOR", Description: "Branch Supervisor with branch-scoped management"},
		{ID: 3, Name: "EMPLOYEE", Description: "Grocery Staff / Cashier / Inventory Staff"},
	}

	for _, role := range roles {
		var count int64
		db.Model(&models.Role{}).Where("name = ?", role.Name).Count(&count)
		if count == 0 {
			if err := db.Create(&role).Error; err != nil {
				log.Printf("Failed to seed role %s: %v", role.Name, err)
			}
		}
	}

	// 2. Seed Default Branches
	branches := []models.Branch{
		{
			ID:         1,
			BranchCode: "BRANCH-001",
			BranchName: "Main Branch - Makati Hub",
			Address:    "Ayala Avenue, Makati City",
			Phone:      "+63 2 8123 4567",
			IsActive:   true,
		},
		{
			ID:         2,
			BranchCode: "BRANCH-002",
			BranchName: "North Branch - QC Express",
			Address:    "EDSA Cubao, Quezon City",
			Phone:      "+63 2 8234 5678",
			IsActive:   true,
		},
		{
			ID:         3,
			BranchCode: "BRANCH-003",
			BranchName: "South Branch - Alabang Mart",
			Address:    "Filinvest City, Alabang, Muntinlupa",
			Phone:      "+63 2 8345 6789",
			IsActive:   true,
		},
	}

	for _, branch := range branches {
		var count int64
		db.Model(&models.Branch{}).Where("branch_code = ?", branch.BranchCode).Count(&count)
		if count == 0 {
			if err := db.Create(&branch).Error; err != nil {
				log.Printf("Failed to seed branch %s: %v", branch.BranchCode, err)
			}
		}
	}

	// 3. Seed Super Admin User
	var adminCount int64
	db.Model(&models.User{}).Where("username = ?", "admin").Count(&adminCount)
	if adminCount == 0 {
		hashedPassword, _ := utils.HashPassword("Admin@123")
		adminUser := models.User{
			Username:     "admin",
			PasswordHash: hashedPassword,
			RoleID:       1, // SUPER_ADMIN
			Status:       "ACTIVE",
		}
		if err := db.Create(&adminUser).Error; err != nil {
			log.Printf("Failed to seed super admin: %v", err)
		} else {
			log.Println("Default Super Admin created (username: admin / pass: Admin@123)")
		}
	}

	// 4. Seed Supervisor User
	var supCount int64
	db.Model(&models.User{}).Where("username = ?", "supervisor1").Count(&supCount)
	if supCount == 0 {
		hashedPassword, _ := utils.HashPassword("Sup@123")
		supUser := models.User{
			Username:     "supervisor1",
			PasswordHash: hashedPassword,
			RoleID:       2, // SUPERVISOR
			Status:       "ACTIVE",
		}
		if err := db.Create(&supUser).Error; err != nil {
			log.Printf("Failed to seed supervisor: %v", err)
		}
	}

	// 5. Seed Demo Employee & Salary Profile if branch 1 exists
	var empCount int64
	db.Model(&models.Employee{}).Where("employee_code = ?", "EMP-2026-0001").Count(&empCount)
	if empCount == 0 {
		empHash, _ := utils.HashPassword("Emp@123")
		empUser := models.User{
			Username:     "employee1",
			PasswordHash: empHash,
			RoleID:       3, // EMPLOYEE
			Status:       "ACTIVE",
		}
		if err := db.Create(&empUser).Error; err == nil {
			demoEmp := models.Employee{
				UserID:       empUser.ID,
				EmployeeCode: "EMP-2026-0001",
				BranchID:     1,
				FirstName:    "Juan",
				LastName:     "Dela Cruz",
				Email:        "juan.delacruz@grocerymart.com",
				Phone:        "+63 917 123 4567",
				Position:     "Cashier Senior",
				Department:   "Front End Operations",
				HireDate:     time.Now().AddDate(-1, 0, 0),
				Status:       "ACTIVE",
			}
			if err := db.Create(&demoEmp).Error; err == nil {
				// Create salary profile
				salaryProfile := models.SalaryProfile{
					EmployeeID:             demoEmp.ID,
					HourlyRate:             75.00,
					DailyRate:              600.00,
					MonthlyRate:            15600.00,
					WorkingDaysPerMonth:    26,
					SSSContribution:        585.00,
					PhilHealthContribution: 250.00,
					PagIbigContribution:    100.00,
					EffectiveDate:          time.Now(),
				}
				db.Create(&salaryProfile)
			}
		}
	}

	log.Println("Seeders executed successfully.")
	return nil
}

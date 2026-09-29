package connection

import (
	"log"
	"time"

	"grocery-backend/config"
	"grocery-backend/models"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

// ConnectDB establishes a connection to PostgreSQL and auto-migrates all tables
func ConnectDB(cfg *config.DatabaseConfig) (*gorm.DB, error) {
	dsn := cfg.GetDSN()
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})
	if err != nil {
		return nil, err
	}

	sqlDB, err := db.DB()
	if err != nil {
		return nil, err
	}

	sqlDB.SetMaxIdleConns(10)
	sqlDB.SetMaxOpenConns(100)
	sqlDB.SetConnMaxLifetime(time.Hour)

	DB = db
	log.Println("Connected to PostgreSQL database successfully.")

	// Auto-migrate tables in dependency order
	err = AutoMigrate(db)
	if err != nil {
		log.Printf("Warning: AutoMigrate error: %v", err)
	}

	return db, nil
}

// AutoMigrate migrates all schema tables
func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(
		&models.Role{},
		&models.User{},
		&models.Branch{},
		&models.Employee{},
		&models.EmployeeQRCode{},
		&models.EmployeeSchedule{},
		&models.Attendance{},
		&models.AttendanceLog{},
		&models.SalaryProfile{},
		&models.Payroll{},
		&models.PayrollEarning{},
		&models.PayrollDeduction{},
		&models.Payslip{},
		&models.LeaveRequest{},
		&models.AuditLog{},
	)
}

package main

import (
	"log"
	"os"

	"grocery-backend/config"
	"grocery-backend/connection"
	"grocery-backend/controllers"
	"grocery-backend/migrations"
	"grocery-backend/routes"
	"grocery-backend/services"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	// 1. Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("Notice: .env file not found or failed to load, falling back to system environment variables")
	}

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	appName := os.Getenv("APP_NAME")
	if appName == "" {
		appName = "Grocery Backend API"
	}

	// 2. Connect to PostgreSQL database and auto-migrate
	dbConfig := config.LoadDatabaseConfig()
	db, err := connection.ConnectDB(dbConfig)
	if err != nil {
		log.Printf("⚠️ Warning: Could not connect to PostgreSQL (%v). Please verify DB credentials in .env.", err)
	} else {
		// Run initial database seeders (Roles, Branches, Super Admin)
		if err := migrations.RunSeeders(db); err != nil {
			log.Printf("Warning during seeding: %v", err)
		}
	}

	// 3. Initialize Services
	authService := services.NewAuthService(db)
	qrService := services.NewQRService(db)
	employeeService := services.NewEmployeeService(db)
	attendanceService := services.NewAttendanceService(db, qrService)
	salaryService := services.NewSalaryService(db)
	payslipService := services.NewPayslipService(db)
	payrollService := services.NewPayrollService(db, payslipService)
	reportService := services.NewReportService(db)

	// 4. Initialize Controllers
	authController := controllers.NewAuthController(authService)
	userController := controllers.NewUserController()
	branchController := controllers.NewBranchController()
	employeeController := controllers.NewEmployeeController(employeeService, qrService)
	qrController := controllers.NewQRController(qrService)
	attendanceController := controllers.NewAttendanceController(attendanceService)
	scheduleController := controllers.NewScheduleController()
	salaryController := controllers.NewSalaryController(salaryService)
	payrollController := controllers.NewPayrollController(payrollService)
	payslipController := controllers.NewPayslipController(payslipService)
	reportController := controllers.NewReportController(reportService)
	auditController := controllers.NewAuditController(reportService)

	// 5. Initialize Fiber App
	app := fiber.New(fiber.Config{
		AppName: appName,
	})

	// Global Middlewares
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New(cors.Config{
		AllowOrigins: "*",
		AllowHeaders: "Origin, Content-Type, Accept, Authorization",
		AllowMethods: "GET, POST, PUT, DELETE, OPTIONS",
	}))

	// Static route for generated files (e.g. payslip PDFs)
	storagePath := os.Getenv("STORAGE_PATH")
	if storagePath == "" {
		storagePath = "./storage"
	}
	app.Static("/storage", storagePath)

	// Root & Health Checks
	app.Get("/", func(c *fiber.Ctx) error {
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"status":  "success",
			"app":     appName,
			"message": "Welcome to Grocery Backend API (Go + Fiber + PostgreSQL)",
		})
	})

	app.Get("/health", func(c *fiber.Ctx) error {
		dbStatus := "connected"
		if db == nil {
			dbStatus = "disconnected"
		}
		return c.Status(fiber.StatusOK).JSON(fiber.Map{
			"status":   "healthy",
			"database": dbStatus,
			"service":  appName,
		})
	})

	// 6. Register API Routes
	api := app.Group("/api")
	routes.SetupAuthRoutes(api, authController)
	routes.SetupUserRoutes(api, userController)
	routes.SetupBranchRoutes(api, branchController)
	routes.SetupEmployeeRoutes(api, employeeController)
	routes.SetupQRRoutes(api, qrController)
	routes.SetupAttendanceRoutes(api, attendanceController)
	routes.SetupScheduleRoutes(api, scheduleController)
	routes.SetupSalaryRoutes(api, salaryController)
	routes.SetupPayrollRoutes(api, payrollController)
	routes.SetupPayslipRoutes(api, payslipController)
	routes.SetupReportRoutes(api, reportController, auditController)

	// 7. Start HTTP Server
	log.Printf("Starting %s server on port %s...", appName, port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatalf("Server stopped with error: %v", err)
	}
}

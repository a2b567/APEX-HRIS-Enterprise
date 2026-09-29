# Grocery Backend (Go Fiber + GORM + PostgreSQL)

Production-ready backend architecture for grocery employee attendance, QR scanner timekeeping, scheduling, payroll calculation, payslip PDF generation, and role-based access control (RBAC).

---

## 🏗️ Architecture Layers
```
HTTP Request
    ↓
Router (routes/)
    ↓
Middleware (middleware/)  ← JWT → Role → Branch Authorization
    ↓
Controller (controllers/) ← Thin: parse, delegate, respond
    ↓
Service (services/)       ← Business process orchestration
    ↓
Helper Functions (utils/) ← Validation, Calculation, Generation
    ↓
GORM                      ← Object Relational Mapping
    ↓
PostgreSQL
```

---

## 📁 Project Structure
```
GroceryBackend/
├── main.go
├── config/
│   └── database.go
├── connection/
│   └── postgres.go
├── models/
│   ├── user.go
│   ├── role.go
│   ├── branch.go
│   ├── employee.go
│   ├── employee_qr.go
│   ├── schedule.go
│   ├── attendance.go
│   ├── attendance_log.go
│   ├── salary.go
│   ├── payroll.go
│   ├── payroll_earning.go
│   ├── payroll_deduction.go
│   ├── payslip.go
│   ├── leave.go
│   └── audit_log.go
├── controllers/
│   ├── auth_controller.go
│   ├── user_controller.go
│   ├── branch_controller.go
│   ├── employee_controller.go
│   ├── qr_controller.go
│   ├── attendance_controller.go
│   ├── schedule_controller.go
│   ├── salary_controller.go
│   ├── payroll_controller.go
│   ├── payslip_controller.go
│   ├── report_controller.go
│   └── audit_controller.go
├── services/
│   ├── auth_service.go
│   ├── employee_service.go
│   ├── qr_service.go
│   ├── attendance_service.go
│   ├── salary_service.go
│   ├── payroll_service.go
│   ├── payslip_service.go
│   └── report_service.go
├── routes/
│   ├── auth_routes.go
│   ├── user_routes.go
│   ├── branch_routes.go
│   ├── employee_routes.go
│   ├── qr_routes.go
│   ├── attendance_routes.go
│   ├── schedule_routes.go
│   ├── salary_routes.go
│   ├── payroll_routes.go
│   ├── payslip_routes.go
│   └── report_routes.go
├── middleware/
│   ├── auth_middleware.go
│   ├── role_middleware.go
│   └── branch_middleware.go
├── utils/
│   ├── jwt.go
│   ├── password.go
│   ├── employee_id.go
│   ├── qr.go
│   ├── response.go
│   ├── validator.go
│   └── calculator.go
├── migrations/
│   └── seed.go
├── storage/
│   └── payslips/
├── .env
├── .env.example
├── .gitignore
├── go.mod
└── go.sum
```

---

## 🚀 Getting Started

### 1. Configure Database (.env)
Edit `.env` to match your local or cloud PostgreSQL instance:
```env
PORT=8080
APP_ENV=development
APP_NAME=GroceryBackend

DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=grocery_db
DB_SSLMODE=disable
DB_TIMEZONE=Asia/Manila

JWT_SECRET=super-secret-grocery-backend-jwt-key-2026
JWT_EXPIRATION_HOURS=24
JWT_ISSUER=grocery-attendance-api
```

### 2. Run Database Migration & Server
```bash
go run main.go
```
* **Auto-Migration**: Schema tables will automatically be created on boot.
* **Database Seeders**: Default roles (`SUPER_ADMIN`, `SUPERVISOR`, `EMPLOYEE`), initial branches, and the default superadmin (`admin` / `admin123`) will be seeded automatically.

---

## 📡 API Endpoint Reference

| Method | Endpoint | Allowed Roles | Description |
|---|---|---|---|
| **POST** | `/api/auth/login` | Public | Login with username & password, returns JWT token |
| **GET** | `/api/branches` | `SUPER_ADMIN` | List all grocery branches |
| **POST** | `/api/branches` | `SUPER_ADMIN` | Create new branch |
| **PUT** | `/api/branches/:id` | `SUPER_ADMIN` | Update branch |
| **GET** | `/api/users` | `SUPER_ADMIN` | List all user accounts |
| **POST** | `/api/users/supervisor` | `SUPER_ADMIN` | Create supervisor account |
| **GET** | `/api/employees` | `SUPER_ADMIN`, `SUPERVISOR` | List employees (scoped to branch for supervisor) |
| **POST** | `/api/employees` | `SUPERVISOR` | Register new employee (auto EMP-ID & QR token) |
| **GET** | `/api/employees/:id` | `SUPER_ADMIN`, `SUPERVISOR`, `EMPLOYEE` | Get employee details (scoped) |
| **PUT** | `/api/employees/:id` | `SUPER_ADMIN`, `SUPERVISOR` | Update employee |
| **DELETE**| `/api/employees/:id` | `SUPER_ADMIN`, `SUPERVISOR` | Deactivate employee |
| **GET** | `/api/employees/:id/qr` | `SUPER_ADMIN`, `SUPERVISOR`, `EMPLOYEE` | View employee QR code details |
| **POST** | `/api/qr/scan` | `SUPERVISOR` | Validate QR scan token |
| **POST** | `/api/attendance/time-in` | `SUPERVISOR` | Scan QR for Time-In with late calculation |
| **POST** | `/api/attendance/time-out`| `SUPERVISOR` | Scan QR for Time-Out with total/OT/undertime calculation |
| **GET** | `/api/attendance` | `SUPER_ADMIN`, `SUPERVISOR` | List attendance logs |
| **GET** | `/api/attendance/:id` | `SUPER_ADMIN`, `SUPERVISOR`, `EMPLOYEE` | View single attendance record |
| **GET** | `/api/schedules/:employeeId` | `SUPER_ADMIN`, `SUPERVISOR` | View employee weekly schedule |
| **POST** | `/api/schedules` | `SUPERVISOR` | Create employee shift schedule |
| **PUT** | `/api/schedules/:id` | `SUPERVISOR` | Update employee shift schedule |
| **GET** | `/api/salary/:employeeId` | `SUPER_ADMIN`, `SUPERVISOR`, `EMPLOYEE` | Get salary rates & statutory deductions |
| **POST** | `/api/salary` | `SUPERVISOR` | Set employee salary profile |
| **PUT** | `/api/salary/:id` | `SUPERVISOR` | Update employee salary profile |
| **GET** | `/api/payroll` | `SUPER_ADMIN`, `SUPERVISOR` | List payroll runs |
| **POST** | `/api/payroll` | `SUPERVISOR` | Generate draft payroll run for branch |
| **GET** | `/api/payroll/:id` | `SUPER_ADMIN`, `SUPERVISOR`, `EMPLOYEE` | View payroll details |
| **PUT** | `/api/payroll/:id/finalize` | `SUPERVISOR` | Finalize payroll & generate official PDF payslip |
| **PUT** | `/api/payroll/:id/paid` | `SUPER_ADMIN` | Mark finalized payroll as PAID |
| **GET** | `/api/payslips` | `SUPER_ADMIN`, `SUPERVISOR`, `EMPLOYEE` | List generated payslips |
| **GET** | `/api/payslips/:id` | `SUPER_ADMIN`, `SUPERVISOR`, `EMPLOYEE` | View payslip breakdown |
| **GET** | `/api/payslips/:id/pdf` | `SUPER_ADMIN`, `SUPERVISOR`, `EMPLOYEE` | Download official PDF payslip file |
| **GET** | `/api/reports/attendance` | `SUPER_ADMIN`, `SUPERVISOR` | Attendance analytics & date filtering |
| **GET** | `/api/reports/payroll` | `SUPER_ADMIN`, `SUPERVISOR` | Payroll costs report |
| **GET** | `/api/audit-logs` | `SUPER_ADMIN` | System-wide audit trail |

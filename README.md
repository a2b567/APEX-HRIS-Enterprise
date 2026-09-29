# 🏢 APEX HRIS Enterprise
### Multi-Branch Human Resource Information System, QR Attendance & Automated Payroll Platform (React.js + Vite + Tailwind CSS)

---

## 📌 System Architecture & Hierarchy

```
                    SUPER ADMIN (1 account)
                          │
        ┌─────────┬───────┼───────┬─────────┐
        ▼         ▼       ▼       ▼         ▼
    Branch 1  Branch 2  Branch 3  Branch 4  Branch 5
   (BRANCH-001) (BRANCH-002) (BRANCH-003) (BRANCH-004) (BRANCH-005)
        │         │       │       │         │
   Supervisor Supervisor Supervisor Supervisor Supervisor
   (Sup 1)    (Sup 2)    (Sup 3)    (Sup 4)    (Sup 5)
        │         │       │       │         │
    Employees Employees Employees Employees Employees
```

### Strict Architectural Invariants
- **Exactly 1 Super Admin**: Full enterprise governance across all 5 branches, supervisors, staff, and payroll.
- **Exactly 5 Branches**: Fixed branch codes (`BRANCH-001` to `BRANCH-005`).
- **Exactly 1 Active Supervisor per Branch**: Enforced in UI state validation and assignment logic.
- **Multiple Employees per Branch**: Filtered and isolated by branch scope.

---

## 🔑 Demo Login Credentials & Kiosk Terminal

| Role | Username | Password | Scope / Assigned Branch |
|---|---|---|---|
| **Super Admin** | `superadmin` | `Admin@123` | **Global Scope** (All 5 Branches, Consolidated Payroll) |
| **Supervisor 1** | `supervisor1` | `Sup@123` | `BRANCH-001` (Metro Manila Main Branch) |
| **Supervisor 2** | `supervisor2` | `Sup@123` | `BRANCH-002` (Cebu Central Hub) |
| **Supervisor 3** | `supervisor3` | `Sup@123` | `BRANCH-003` (Davao Regional Commerce) |
| **Supervisor 4** | `supervisor4` | `Sup@123` | `BRANCH-004` (Pampanga North Operations) |
| **Supervisor 5** | `supervisor5` | `Sup@123` | `BRANCH-005` (Iloilo Western Hub) |
| **Employee 1** | `juan.dc` | `Emp@123` | Branch 1 Staff Self-Service (`EMP-001-01`) |
| **Employee 2** | `rafael.cebu` | `Emp@123` | Branch 2 Staff Self-Service (`EMP-002-01`) |
| **Entrance Kiosk** | — | — | Direct URL: `/kiosk` (Full-screen continuous scanner) |

---

## 📱 QR Code Attendance Engine

### 1. 🏷️ QR Badge Generation (`qrcode.react`)
- Each employee has a unique **security QR token** (`EMP-001-01-BRANCH-001-a3f9c2d1`).
- Generates official employee digital ID cards.
- **Save PNG** & **Print Badge** actions.
- Bulk badge sheets for printing company employee ID cards.

### 2. 📷 Camera Scanner & Audio Feedback (`html5-qrcode` + Web Audio API)
- **Supervisor Scanner (`/supervisor/scan`)** & **Kiosk Terminal (`/kiosk`)**.
- Opens device camera or accepts manual Employee ID fallback.
- Auto-detects **Time In** (checks 15m grace period vs 08:00 AM shift) vs **Time Out** (computes hours worked, OT, and undertime).
- Audio chime feedback:
  - 🔔 Double chime for on-time Time In / Time Out
  - ⚠️ Amber chime for late arrival
  - ❌ Error buzzer for rejected access / wrong branch

### 3. 🛡️ Strict Branch Isolation on Scan
- When a Supervisor or Kiosk scans an employee badge:
  - If `employee.branchId !== scannerBranchId`, the scan is **rejected**:  
    `"Access Denied: This employee belongs to Branch X, not Branch Y."`
  - *(Note: Frontend simulates this; Go Fiber backend will enforce via JWT & middleware)*.

### 4. 🏷️ DTR Tagging & Filtering
- All attendance records are tagged `method: 'QR'` or `method: 'MANUAL'`.
- DTR table has QR badge indicators and filterable methods (`All / Recorded via QR / Manual`).

---

## 💰 Philippine Labor Standard Payroll Engine

- **Semi-Monthly Cutoffs**: `1st–15th` and `16th–End of Month`.
- **Auto-Computation**:
  - `Basic Pay = Days Worked × Daily Rate`
  - `Overtime Pay = OT Hours × (Hourly Rate × 1.25)`
  - `Late/Undertime Deduction = (Hourly Rate / 60) × Late Minutes`
  - `Gross Pay = Basic Pay + OT Pay - Deductions + Allowances`
  - `Statutory Deductions`: SSS (4.5% share), PhilHealth (2.5% share), Pag-IBIG (₱100/cutoff), Withholding Tax.
  - `Net Take-Home Pay = Gross Pay - Total Deductions`
- **Official Printable Payslips**: Formatted with company header, itemized earnings, statutory deduction breakdowns, and net pay.

---

## 🚀 Running Locally

```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev server
npm run dev

# 3. Open in browser:
# http://localhost:5173
```

---

## 🛡️ Note for Go Fiber Backend Implementation

When connecting this frontend to Go Fiber:
1. `GET /api/v1/dtr`: Middleware extracts `branch_id` from JWT. Supervisors query `WHERE branch_id = ?`. Super Admins query unrestricted.
2. `POST /api/v1/attendance/qr-scan`: Backend validates QR token signature, checks `employee.branch_id == supervisor.branch_id`, and writes atomic Time In/Out record.

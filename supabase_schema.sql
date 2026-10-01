-- ==============================================================================
-- REDMART Enterprise — Supabase Real-Time Cloud Database Schema
-- Run this in Supabase SQL Editor (https://supabase.com/dashboard/project/_/sql)
-- ==============================================================================

-- 1. Branches Table
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    code TEXT,
    name TEXT NOT NULL,
    location TEXT,
    contact_number TEXT,
    email TEXT,
    supervisor_id BIGINT,
    status TEXT DEFAULT 'Active',
    established_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Users & Supervisors Table
CREATE TABLE IF NOT EXISTS public.users (
    id BIGSERIAL PRIMARY KEY,
    role TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    position TEXT,
    branch_id TEXT,
    employee_id TEXT,
    phone TEXT,
    avatar TEXT,
    status TEXT DEFAULT 'Active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Employees Directory Table
CREATE TABLE IF NOT EXISTS public.employees (
    id TEXT PRIMARY KEY,
    user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    position TEXT DEFAULT 'Staff Member',
    department TEXT DEFAULT 'Operations',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    daily_rate NUMERIC DEFAULT 750,
    hourly_rate NUMERIC DEFAULT 93.75,
    status TEXT DEFAULT 'Active',
    hire_date DATE DEFAULT CURRENT_DATE,
    qr_token TEXT,
    qr_issued_at DATE DEFAULT CURRENT_DATE,
    qr_status TEXT DEFAULT 'active',
    id_type TEXT DEFAULT 'PhilID / National ID',
    id_document_url TEXT,
    id_document_name TEXT,
    id_verification_status TEXT DEFAULT 'Verified',
    id_verified_at DATE DEFAULT CURRENT_DATE,
    id_verified_by TEXT DEFAULT 'System Administrator',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Attendance & DTR Scans Table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    employee_name TEXT,
    branch_id TEXT,
    date DATE NOT NULL,
    time_in TEXT,
    time_out TEXT,
    break_minutes INT DEFAULT 60,
    regular_hours NUMERIC DEFAULT 0,
    overtime_hours NUMERIC DEFAULT 0,
    late_minutes INT DEFAULT 0,
    undertime_minutes INT DEFAULT 0,
    status TEXT DEFAULT 'Present',
    method TEXT DEFAULT 'QR',
    remarks TEXT,
    is_manual BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Disbursements / Payroll Records Table
CREATE TABLE IF NOT EXISTS public.disbursements (
    id TEXT PRIMARY KEY,
    employee_id TEXT NOT NULL,
    month_year TEXT NOT NULL,
    cutoff_type TEXT NOT NULL,
    record JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Enable Row Level Security (RLS) & Allow Full Read/Write for Authenticated/Anon API
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read-write on branches" ON public.branches;
DROP POLICY IF EXISTS "Allow public read-write on users" ON public.users;
DROP POLICY IF EXISTS "Allow public read-write on employees" ON public.employees;
DROP POLICY IF EXISTS "Allow public read-write on attendance_logs" ON public.attendance_logs;
DROP POLICY IF EXISTS "Allow public read-write on disbursements" ON public.disbursements;

CREATE POLICY "Allow public read-write on branches" ON public.branches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on employees" ON public.employees FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on attendance_logs" ON public.attendance_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow public read-write on disbursements" ON public.disbursements FOR ALL USING (true) WITH CHECK (true);

-- 7. Enable Realtime Publications (so all devices receive updates instantly)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'branches') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.branches;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'users') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.users;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'employees') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.employees;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'attendance_logs') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_logs;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'disbursements') THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.disbursements;
  END IF;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- 8. Seed Initial Default Data
INSERT INTO public.branches (id, code, name, location, contact_number, email, supervisor_id, status)
VALUES 
('BRANCH-001', 'B001', 'Headquarters Main Branch', 'Corporate Center, Ayala Ave, Makati City', '+63 (02) 8888-0101', 'makati.hq@redmart.enterprise', 101, 'Active'),
('BRANCH-002', 'B002', 'BGC Innovation Hub', 'High Street South, BGC, Taguig', '+63 (02) 8888-0102', 'bgc.hub@redmart.enterprise', 102, 'Active'),
('BRANCH-003', 'B003', 'Cebu IT Park Regional Hub', 'Asia Town IT Park, Lahug, Cebu City', '+63 (32) 412-8803', 'cebu.hub@redmart.enterprise', 103, 'Active'),
('BRANCH-004', 'B004', 'Davao Regional Center', 'Abreeza Corporate Center, Bajada, Davao City', '+63 (82) 298-8804', 'davao.hub@redmart.enterprise', 104, 'Active'),
('BRANCH-005', 'B005', 'Ortigas Commercial Center', 'ADB Avenue, Ortigas Center, Pasig City', '+63 (02) 8888-0105', 'ortigas.hub@redmart.enterprise', 105, 'Active')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.users (id, role, username, password, name, email, position, branch_id, status)
VALUES
(1, 'SUPER_ADMIN', 'admin', 'hashed_Admin@123', 'System Administrator', 'admin@redmart.enterprise', 'Chief Administrator', NULL, 'Active'),
(101, 'SUPERVISOR', 'aron', 'hashed_Supervisor@123', 'Aron Chester M. Sangcap', 'aron.sangcap@redmart.enterprise', 'Branch Operations Supervisor', 'BRANCH-001', 'Active'),
(102, 'SUPERVISOR', 'marco', 'hashed_Supervisor@123', 'Marco F. Baluncio', 'marco@gmail.com', 'Branch Operations Supervisor', 'BRANCH-002', 'Active'),
(103, 'SUPERVISOR', 'sup.cebu', 'hashed_Supervisor@123', 'Elena Villanueva', 'elena.villanueva@redmart.enterprise', 'Branch Operations Supervisor', 'BRANCH-003', 'Active'),
(104, 'SUPERVISOR', 'sup.davao', 'hashed_Supervisor@123', 'Mark Torres', 'mark.torres@redmart.enterprise', 'Branch Operations Supervisor', 'BRANCH-004', 'Active'),
(105, 'SUPERVISOR', 'sup.ortigas', 'hashed_Supervisor@123', 'Patricia Lim', 'patricia.lim@redmart.enterprise', 'Branch Operations Supervisor', 'BRANCH-005', 'Active'),
(2, 'EMPLOYEE', 'juan.cruz', 'hashed_EMP-001-01', 'Juan Cruz', 'juan.cruz@redmart.enterprise', 'Software Engineer', 'BRANCH-001', 'Active')
ON CONFLICT (username) DO NOTHING;

INSERT INTO public.employees (id, user_id, name, email, position, department, branch_id, daily_rate, hourly_rate, qr_token, status)
VALUES
('EMP-001-01', 2, 'Juan Cruz', 'juan.cruz@redmart.enterprise', 'Software Engineer', 'Technology', 'BRANCH-001', 1000, 125, 'REDMART-EMP-001-01-BRANCH-001-SECURE', 'Active')
ON CONFLICT (id) DO NOTHING;

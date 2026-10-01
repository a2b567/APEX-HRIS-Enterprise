import { createClient } from '@supabase/supabase-js';

// ── Supabase Cloud Configuration ──────────────────────────────────────────────
const SUPABASE_URL = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) || 'https://ehpxangzzxenuytyryeq.supabase.co';
const SUPABASE_ANON_KEY = (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) || 'sb_publishable_5TbbZnEmSRJuVmuPq2k9HA_aVeAEE4o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

export const isSupabaseConfigured = () => {
  return Boolean(
    SUPABASE_URL &&
    SUPABASE_ANON_KEY &&
    SUPABASE_ANON_KEY !== 'public-anon-key-placeholder'
  );
};

// ── Helper: Upsert a user record to Supabase ─────────────────────────────────
export const syncUserToSupabase = async (userObj) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('users')
      .upsert(
        {
          id: userObj.id,
          role: userObj.role || 'EMPLOYEE',
          username: userObj.username,
          password: userObj.password || 'hashed_Emp@123',
          name: userObj.name,
          email: userObj.email || null,
          position: userObj.position || null,
          branch_id: userObj.branchId || null,
          employee_id: userObj.employeeId || null,
          phone: userObj.phone || null,
          status: userObj.status || 'Active',
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'username' }
      )
      .select()
      .single();
    if (error) {
      console.warn('[Supabase] syncUserToSupabase error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] syncUserToSupabase exception:', err);
    return null;
  }
};

// ── Helper: Fetch all users from Supabase ────────────────────────────────────
export const fetchUsersFromSupabase = async () => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) {
      console.warn('[Supabase] fetchUsersFromSupabase error:', error.message);
      return [];
    }
    return (data || []).map((u) => ({
      id: Number(u.id),
      username: u.username,
      password: u.password,
      name: u.name,
      email: u.email,
      role: u.role,
      position: u.position,
      branchId: u.branch_id,
      employeeId: u.employee_id,
      phone: u.phone,
      status: u.status,
    }));
  } catch (err) {
    console.warn('[Supabase] fetchUsersFromSupabase exception:', err);
    return [];
  }
};

// ── Helper: Upsert employee to Supabase ──────────────────────────────────────
export const syncEmployeeToSupabase = async (emp) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('employees')
      .upsert(
        {
          id: emp.id,
          user_id: emp.userId || null,
          name: emp.name,
          email: emp.email || null,
          phone: emp.phone || null,
          position: emp.position || 'Staff Member',
          department: emp.department || 'Operations',
          branch_id: emp.branchId || null,
          daily_rate: Number(emp.dailyRate) || 750,
          hourly_rate: Number(emp.hourlyRate) || 93.75,
          status: emp.status || 'Active',
          hire_date: emp.hireDate || new Date().toISOString().split('T')[0],
          qr_token: emp.qrToken || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();
    if (error) {
      console.warn('[Supabase] syncEmployeeToSupabase error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] syncEmployeeToSupabase exception:', err);
    return null;
  }
};

// ── Helper: Fetch all employees from Supabase ────────────────────────────────
export const fetchEmployeesFromSupabase = async (branchId = null) => {
  if (!isSupabaseConfigured()) return [];
  try {
    let query = supabase.from('employees').select('*').order('created_at', { ascending: true });
    if (branchId) query = query.eq('branch_id', branchId);
    const { data, error } = await query;
    if (error) {
      console.warn('[Supabase] fetchEmployeesFromSupabase error:', error.message);
      return [];
    }
    return (data || []).map((e) => ({
      id: e.id,
      userId: e.user_id,
      name: e.name,
      email: e.email,
      phone: e.phone,
      department: e.department,
      position: e.position,
      branchId: e.branch_id,
      dailyRate: Number(e.daily_rate) || 750,
      hourlyRate: Number(e.hourly_rate) || 93.75,
      status: e.status,
      hireDate: e.hire_date,
      qrToken: e.qr_token,
    }));
  } catch (err) {
    console.warn('[Supabase] fetchEmployeesFromSupabase exception:', err);
    return [];
  }
};

// ── Helper: Log attendance to Supabase ───────────────────────────────────────
export const logAttendanceToSupabase = async (log) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase
      .from('attendance_logs')
      .upsert(
        {
          id: log.id,
          employee_id: log.employeeId,
          employee_name: log.employeeName || null,
          branch_id: log.branchId || null,
          date: log.date,
          time_in: log.timeIn || null,
          time_out: log.timeOut || null,
          break_minutes: Number(log.breakMinutes) || 60,
          regular_hours: Number(log.regularHours) || 0,
          overtime_hours: Number(log.overtimeHours) || 0,
          late_minutes: Number(log.lateMinutes) || 0,
          undertime_minutes: Number(log.undertimeMinutes) || 0,
          status: log.status || 'Present',
          method: log.method || 'QR',
          remarks: log.remarks || null,
          is_manual: Boolean(log.isManual),
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();
    if (error) {
      console.warn('[Supabase] logAttendanceToSupabase error:', error.message);
      return null;
    }
    return data;
  } catch (err) {
    console.warn('[Supabase] logAttendanceToSupabase exception:', err);
    return null;
  }
};

export const deleteUserFromSupabase = async (userId) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) console.warn('[Supabase] deleteUserFromSupabase error:', error.message);
  } catch (err) {
    console.warn('[Supabase] deleteUserFromSupabase exception:', err);
  }
};

export const deleteEmployeeFromSupabase = async (empId) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('employees').delete().eq('id', empId);
    if (error) console.warn('[Supabase] deleteEmployeeFromSupabase error:', error.message);
  } catch (err) {
    console.warn('[Supabase] deleteEmployeeFromSupabase exception:', err);
  }
};

export const deleteBranchFromSupabase = async (branchId) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { error } = await supabase.from('branches').delete().eq('id', branchId);
    if (error) console.warn('[Supabase] deleteBranchFromSupabase error:', error.message);
  } catch (err) {
    console.warn('[Supabase] deleteBranchFromSupabase exception:', err);
  }
};

export default supabase;

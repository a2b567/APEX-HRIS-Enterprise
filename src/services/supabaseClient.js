import { createClient } from '@supabase/supabase-js';

// ── Supabase Cloud Configuration ──────────────────────────────────────────────
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://ehpxangzzxenuytyryeq.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_5TbbZnEmSRJuVmuPq2k9HA_aVeAEE4o';

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
          username: userObj.username,
          name: userObj.name,
          email: userObj.email || null,
          role: userObj.role,
          branch_id: userObj.branchId || null,
          employee_id: userObj.employeeId || null,
          password_hash: userObj.password || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
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
    // Map from DB shape → app shape
    return (data || []).map((u) => ({
      id: u.id,
      username: u.username,
      name: u.name,
      email: u.email,
      role: u.role,
      branchId: u.branch_id,
      employeeId: u.employee_id,
      password: u.password_hash,
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
          employee_code: emp.employeeId || emp.employee_code,
          first_name: emp.firstName || emp.first_name,
          last_name: emp.lastName || emp.last_name,
          name: emp.name,
          email: emp.email || null,
          department: emp.department || null,
          position: emp.position || null,
          branch_id: emp.branchId || emp.branch_id || null,
          status: emp.status || 'ACTIVE',
          daily_rate: emp.dailyRate || emp.daily_rate || 0,
          hire_date: emp.hireDate || emp.hire_date || null,
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
      employeeId: e.employee_code,
      firstName: e.first_name,
      lastName: e.last_name,
      name: e.name || `${e.first_name} ${e.last_name}`,
      email: e.email,
      department: e.department,
      position: e.position,
      branchId: e.branch_id,
      status: e.status,
      dailyRate: e.daily_rate,
      hireDate: e.hire_date,
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
          branch_id: log.branchId,
          log_type: log.type || log.log_type,
          log_date: log.date || log.log_date,
          log_time: log.time || log.log_time,
          notes: log.notes || null,
          created_at: log.createdAt || new Date().toISOString(),
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

export default supabase;

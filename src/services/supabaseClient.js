import { createClient } from '@supabase/supabase-js';

// ── Supabase Cloud Configuration ──────────────────────────────────────────────
const SUPABASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_URL) ||
  'https://ehpxangzzxenuytyryeq.supabase.co';
const SUPABASE_ANON_KEY =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_SUPABASE_ANON_KEY) ||
  'sb_publishable_5TbbZnEmSRJuVmuPq2k9HA_aVeAEE4o';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
  realtime: { params: { eventsPerSecond: 10 } },
});

export const isSupabaseConfigured = () =>
  Boolean(SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'public-anon-key-placeholder');

// ── Cross-device Broadcast Channel ───────────────────────────────────────────
// When Device 1 writes data → calls broadcastDataChanged() → Device 2 gets notified instantly
// Uses Supabase Broadcast (no DB config needed, works out-of-the-box with anon key)
const BROADCAST_CHANNEL_NAME = 'apex-hris-data-sync';

let _broadcastChannel = null;
const getBroadcastChannel = () => {
  if (!_broadcastChannel) {
    _broadcastChannel = supabase.channel(BROADCAST_CHANNEL_NAME);
  }
  return _broadcastChannel;
};

export const broadcastDataChanged = (table = 'all') => {
  if (!isSupabaseConfigured()) return;
  try {
    getBroadcastChannel().send({
      type: 'broadcast',
      event: 'data-changed',
      payload: { table, ts: Date.now() },
    });
  } catch (_) {}
};

export const subscribeToDataChanges = (callback) => {
  if (!isSupabaseConfigured()) return null;
  const channel = supabase
    .channel(BROADCAST_CHANNEL_NAME)
    .on('broadcast', { event: 'data-changed' }, (payload) => {
      console.log('[Realtime] Broadcast received — re-fetching data...', payload?.payload?.table);
      callback();
    })
    .subscribe((status) => {
      console.log('[Realtime] Broadcast channel status:', status);
    });
  return channel;
};

// ── Legacy no-op (kept for any remaining imports) ────────────────────────────
export const subscribeToTableChanges = (_table, _callback) => null;

// ── Users ─────────────────────────────────────────────────────────────────────
export const fetchUsersFromSupabase = async () => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) { console.warn('[DB] fetchUsers error:', error.message); return []; }
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
      avatar: u.avatar || '',
    }));
  } catch (err) { console.warn('[DB] fetchUsers exception:', err); return []; }
};

export const syncUserToSupabase = async (userObj) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: Number(userObj.id),
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
    };
    let { data, error } = await supabase.from('users').upsert(payload, { onConflict: 'id' }).select().single();
    if (error?.code === '23503') {
      const r = await supabase.from('users').upsert({ ...payload, branch_id: null }, { onConflict: 'id' }).select().single();
      if (!r.error) return r.data;
    }
    if (error) { console.warn('[DB] syncUser error:', error.message); return null; }
    return data;
  } catch (err) { console.warn('[DB] syncUser exception:', err); return null; }
};

export const deleteUserFromSupabase = async (userId) => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('users').delete().eq('id', userId);
    if (error) console.warn('[DB] deleteUser error:', error.message);
  } catch (err) { console.warn('[DB] deleteUser exception:', err); }
};

// ── Employees ─────────────────────────────────────────────────────────────────
export const fetchEmployeesFromSupabase = async (branchId = null) => {
  if (!isSupabaseConfigured()) return [];
  try {
    let query = supabase.from('employees').select('*').order('created_at', { ascending: true });
    if (branchId) query = query.eq('branch_id', branchId);
    const { data, error } = await query;
    if (error) { console.warn('[DB] fetchEmployees error:', error.message, error.code); return []; }
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
      qrIssuedAt: e.qr_issued_at,
      qrStatus: e.qr_status,
      idType: e.id_type,
      idDocumentUrl: e.id_document_url,
      idDocumentName: e.id_document_name,
      idVerificationStatus: e.id_verification_status,
      idVerifiedAt: e.id_verified_at,
      idVerifiedBy: e.id_verified_by,
    }));
  } catch (err) { console.warn('[DB] fetchEmployees exception:', err); return []; }
};

export const syncEmployeeToSupabase = async (emp) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const payload = {
      id: emp.id,
      user_id: emp.userId ? Number(emp.userId) : null,
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
      qr_issued_at: emp.qrIssuedAt || new Date().toISOString().split('T')[0],
      qr_status: emp.qrStatus || 'active',
      id_type: emp.idType || 'PhilID / National ID',
      id_document_url: emp.idDocumentUrl || null,
      id_document_name: emp.idDocumentName || null,
      id_verification_status: emp.idVerificationStatus || 'Verified',
      id_verified_at: emp.idVerifiedAt || new Date().toISOString().split('T')[0],
      id_verified_by: emp.idVerifiedBy || 'System Administrator',
      updated_at: new Date().toISOString(),
    };
    let { data, error } = await supabase.from('employees').upsert(payload, { onConflict: 'id' }).select().single();
    if (error?.code === '23503') {
      const r = await supabase.from('employees').upsert({ ...payload, user_id: null, branch_id: 'BRANCH-001' }, { onConflict: 'id' }).select().single();
      if (!r.error) return r.data;
    }
    if (error) { console.warn('[DB] syncEmployee error:', error.message); return null; }
    return data;
  } catch (err) { console.warn('[DB] syncEmployee exception:', err); return null; }
};

export const deleteEmployeeFromSupabase = async (empId) => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('employees').delete().eq('id', empId);
    if (error) console.warn('[DB] deleteEmployee error:', error.message);
  } catch (err) { console.warn('[DB] deleteEmployee exception:', err); }
};

// ── Branches ──────────────────────────────────────────────────────────────────
export const fetchBranchesFromSupabase = async () => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('branches').select('*').order('id', { ascending: true });
    if (error) return [];
    return (data || []).map((b) => ({
      id: b.id,
      code: b.code,
      name: b.name,
      location: b.location,
      contactNumber: b.contact_number,
      email: b.email,
      supervisorId: b.supervisor_id ? Number(b.supervisor_id) : null,
      status: b.status,
      establishedDate: b.established_date,
    }));
  } catch (_) { return []; }
};

export const syncBranchToSupabase = async (b) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('branches').upsert({
      id: b.id, code: b.code || null, name: b.name,
      location: b.location || null, contact_number: b.contactNumber || null,
      email: b.email || null,
      supervisor_id: b.supervisorId ? Number(b.supervisorId) : null,
      status: b.status || 'Active',
      established_date: b.establishedDate || new Date().toISOString().slice(0, 10),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select().single();
    if (error) console.warn('[DB] syncBranch error:', error.message);
    return data;
  } catch (err) { console.warn('[DB] syncBranch exception:', err); return null; }
};

export const deleteBranchFromSupabase = async (branchId) => {
  if (!isSupabaseConfigured()) return;
  try {
    const { error } = await supabase.from('branches').delete().eq('id', branchId);
    if (error) console.warn('[DB] deleteBranch error:', error.message);
  } catch (err) { console.warn('[DB] deleteBranch exception:', err); }
};

// ── Attendance Logs ───────────────────────────────────────────────────────────
export const fetchAttendanceLogsFromSupabase = async () => {
  if (!isSupabaseConfigured()) return [];
  try {
    const { data, error } = await supabase.from('attendance_logs').select('*').order('date', { ascending: false });
    if (error) return [];
    return (data || []).map((l) => ({
      id: l.id, employeeId: l.employee_id, employeeName: l.employee_name,
      branchId: l.branch_id, date: l.date, timeIn: l.time_in, timeOut: l.time_out,
      breakMinutes: Number(l.break_minutes) || 60, regularHours: Number(l.regular_hours) || 0,
      overtimeHours: Number(l.overtime_hours) || 0, lateMinutes: Number(l.late_minutes) || 0,
      undertimeMinutes: Number(l.undertime_minutes) || 0,
      status: l.status, method: l.method, remarks: l.remarks, isManual: Boolean(l.is_manual),
    }));
  } catch (_) { return []; }
};

export const logAttendanceToSupabase = async (log) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const { data, error } = await supabase.from('attendance_logs').upsert({
      id: log.id, employee_id: log.employeeId, employee_name: log.employeeName || null,
      branch_id: log.branchId || null, date: log.date, time_in: log.timeIn || null,
      time_out: log.timeOut || null, break_minutes: Number(log.breakMinutes) || 60,
      regular_hours: Number(log.regularHours) || 0, overtime_hours: Number(log.overtimeHours) || 0,
      late_minutes: Number(log.lateMinutes) || 0, undertime_minutes: Number(log.undertimeMinutes) || 0,
      status: log.status || 'Present', method: log.method || 'QR',
      remarks: log.remarks || null, is_manual: Boolean(log.isManual),
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' }).select().single();
    if (error) { console.warn('[DB] logAttendance error:', error.message); return null; }
    return data;
  } catch (err) { console.warn('[DB] logAttendance exception:', err); return null; }
};

// ── Disbursements ─────────────────────────────────────────────────────────────
export const fetchDisbursementsFromSupabase = async () => {
  if (!isSupabaseConfigured()) return {};
  try {
    const { data, error } = await supabase.from('disbursements').select('*');
    if (error) return {};
    const map = {};
    (data || []).forEach((row) => { map[row.id] = row.record; });
    return map;
  } catch (_) { return {}; }
};

export const syncDisbursementToSupabase = async (key, record) => {
  if (!isSupabaseConfigured()) return null;
  try {
    const parts = key.split('_');
    const { data, error } = await supabase.from('disbursements').upsert(
      { id: key, employee_id: parts[0] || '', month_year: parts[1] || '', cutoff_type: parts[2] || '', record },
      { onConflict: 'id' }
    );
    if (error) console.warn('[DB] syncDisbursement error:', error.message);
    return data;
  } catch (_) { return null; }
};

export default supabase;

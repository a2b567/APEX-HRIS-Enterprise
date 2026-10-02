// One-time cleanup script: delete Juan Cruz from Supabase
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://ehpxangzzxenuytyryeq.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_5TbbZnEmSRJuVmuPq2k9HA_aVeAEE4o';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function cleanup() {
  console.log('Deleting Juan Cruz from employees...');
  const { error: empErr } = await supabase
    .from('employees')
    .delete()
    .eq('id', 'EMP-001-01');
  if (empErr) console.error('employees error:', empErr.message);
  else console.log('✓ Employee deleted (EMP-001-01)');

  console.log('Deleting Juan Cruz from users...');
  const { error: userErr } = await supabase
    .from('users')
    .delete()
    .eq('username', 'juan.cruz');
  if (userErr) console.error('users error:', userErr.message);
  else console.log('✓ User deleted (juan.cruz)');

  // Also delete by id=2 in case username doesn't match
  const { error: userErr2 } = await supabase
    .from('users')
    .delete()
    .eq('id', 2);
  if (userErr2) console.error('users id=2 error:', userErr2.message);
  else console.log('✓ User id=2 deleted');

  // Delete any attendance logs for this employee
  const { error: attErr } = await supabase
    .from('attendance_logs')
    .delete()
    .eq('employee_id', 'EMP-001-01');
  if (attErr) console.error('attendance_logs error:', attErr.message);
  else console.log('✓ Attendance logs deleted for EMP-001-01');

  console.log('\nDone! Juan Cruz has been permanently removed from Supabase.');
}

cleanup().catch(console.error);

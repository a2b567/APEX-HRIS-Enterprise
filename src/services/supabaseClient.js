import { createClient } from '@supabase/supabase-js';

// Supabase Project Configuration
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://fhcjzmxssmvkdaflzhsw.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY || 'public-anon-key-placeholder');

export const isSupabaseConfigured = () => {
  return Boolean(SUPABASE_ANON_KEY && SUPABASE_ANON_KEY !== 'public-anon-key-placeholder');
};

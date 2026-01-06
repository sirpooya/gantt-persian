import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Get these from: https://supabase.com/dashboard/project/frmkcwwwaaygrqtcttqb/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://frmkcwwwaaygrqtcttqb.supabase.co';
// Supabase renamed "anon/public" to "Publishable key" in the dashboard.
// Support either env var name to keep setup friction low.
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn(
    '⚠️  Supabase key not found. Please set VITE_SUPABASE_PUBLISHABLE_KEY (preferred) or VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

export const SUPABASE_URL = supabaseUrl;
export const SUPABASE_HAS_KEY = Boolean(supabaseAnonKey);

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


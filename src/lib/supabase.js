import { createClient } from '@supabase/supabase-js';

// Supabase configuration
// Get these from: https://supabase.com/dashboard/project/frmkcwwwaaygrqtcttqb/settings/api
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://frmkcwwwaaygrqtcttqb.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseAnonKey) {
  console.warn(
    '⚠️  Supabase anon key not found. Please set VITE_SUPABASE_ANON_KEY in your .env file or environment variables.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);


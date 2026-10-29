import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('https://') &&
  !supabaseUrl.includes('your-project') &&
  !supabaseAnonKey.includes('your-anon-key')
);

// Fallback dummy URL/key to prevent createClient throwing during initialization if env vars are unset
const clientUrl = isSupabaseConfigured ? supabaseUrl : 'https://placeholder-csr-project.supabase.co';
const clientKey = isSupabaseConfigured ? supabaseAnonKey : 'placeholder-anon-key';

export const supabase: SupabaseClient = createClient(clientUrl, clientKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

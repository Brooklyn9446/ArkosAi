import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceRoleKey) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY is not defined in environment variables.');
}

export const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey || '',
  {
    auth: {
      persistSession: false, //this tells not to maintain the session on the client side
      autoRefreshToken: false, //this tells not to auto refresh the session if the token is expired
    },
  }
);

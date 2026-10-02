import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

/**
 * Returns a Supabase client with the service_role key for secure server-side execution.
 * Only Edge Functions have access to SUPABASE_SERVICE_ROLE_KEY.
 */
export const getSupabaseAdmin = (): SupabaseClient => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('MISSING_SUPABASE_SERVICE_ROLE_ENV: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required');
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
};

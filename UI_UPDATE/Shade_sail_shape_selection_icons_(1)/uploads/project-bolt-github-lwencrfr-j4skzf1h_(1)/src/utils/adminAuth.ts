import { supabase } from '../lib/supabase';

export async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error('Admin session expired. Please log in again.');
  }

  return {
    'Authorization': `Bearer ${session.access_token}`,
    'apikey': supabaseKey,
  };
}

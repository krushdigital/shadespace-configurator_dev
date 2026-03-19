import { supabase } from '../lib/supabase';

export async function getAdminAuthHeaders(): Promise<Record<string, string>> {
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || supabaseKey;

  return {
    'Authorization': `Bearer ${token}`,
    'apikey': supabaseKey,
  };
}

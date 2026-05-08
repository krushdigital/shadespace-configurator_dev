import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'super_admin';
  status: 'pending' | 'active' | 'disabled';
  auth_user_id: string | null;
}

export function useAdminProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [unauthorised, setUnauthorised] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setProfile(null); setUnauthorised(false); setLoading(false); return; }

    const { data } = await supabase.from('admin_users')
      .select('id, email, full_name, role, status, auth_user_id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (!data || data.status !== 'active') {
      setProfile(null);
      setUnauthorised(true);
    } else {
      setProfile(data as AdminProfile);
      setUnauthorised(false);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      (async () => { await load(); })();
    });
    return () => subscription.unsubscribe();
  }, [load]);

  return { loading, profile, unauthorised, isSuperAdmin: profile?.role === 'super_admin', refresh: load };
}

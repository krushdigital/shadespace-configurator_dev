import { useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

export interface AdminProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'super_admin' | 'team_member';
  status: 'pending' | 'active' | 'disabled';
  auth_user_id: string | null;
}

export function useAdminProfile() {
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<AdminProfile | null>(null);
  const [unauthorised, setUnauthorised] = useState(false);

  const loadedUserIdRef = useRef<string | null>(null);

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { loadedUserIdRef.current = null; setProfile(null); setUnauthorised(false); setLoading(false); return; }
    loadedUserIdRef.current = session.user.id;

    const { data } = await supabase.from('admin_users')
      .select('id, email, full_name, role, status, auth_user_id')
      .eq('auth_user_id', session.user.id)
      .maybeSingle();

    if (!data) {
      setProfile(null);
      setUnauthorised(true);
    } else if (data.status === 'pending') {
      const { error: activateErr } = await supabase.from('admin_users')
        .update({ status: 'active', activated_at: new Date().toISOString() })
        .eq('id', data.id);
      if (activateErr) {
        setProfile(null);
        setUnauthorised(true);
      } else {
        setProfile({ ...data, status: 'active' } as AdminProfile);
        setUnauthorised(false);
      }
    } else if (data.status !== 'active') {
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
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const nextUserId = session?.user?.id ?? null;
      if (nextUserId === loadedUserIdRef.current) return;
      (async () => { await load(false); })();
    });
    return () => subscription.unsubscribe();
  }, [load]);

  return { loading, profile, unauthorised, isSuperAdmin: profile?.role === 'super_admin', refresh: load };
}

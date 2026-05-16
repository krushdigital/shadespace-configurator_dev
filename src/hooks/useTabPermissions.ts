import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TabPermission {
  tab_id: string;
  tab_label: string;
  allowed_for_admin: boolean;
  allowed_for_team_member: boolean;
}

export function useTabPermissions() {
  const [permissions, setPermissions] = useState<TabPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_tab_permissions')
      .select('tab_id, tab_label, allowed_for_admin, allowed_for_team_member')
      .order('tab_id');
    setPermissions((data as TabPermission[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isTabAllowed = useCallback((tabId: string, role: 'admin' | 'super_admin' | 'team_member') => {
    if (role === 'super_admin') return true;
    if (tabId === 'overview') return true;
    if (tabId === 'team') return role !== 'team_member';
    const perm = permissions.find(p => p.tab_id === tabId);
    if (!perm) return role === 'admin';
    return role === 'team_member' ? perm.allowed_for_team_member : perm.allowed_for_admin;
  }, [permissions]);

  return { permissions, loading, isTabAllowed, refresh: load };
}

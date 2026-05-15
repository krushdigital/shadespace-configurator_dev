import { useEffect, useState, useCallback } from 'react';
import { supabase } from '../lib/supabase';

export interface TabPermission {
  tab_id: string;
  tab_label: string;
  allowed_for_admin: boolean;
}

export function useTabPermissions() {
  const [permissions, setPermissions] = useState<TabPermission[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('admin_tab_permissions')
      .select('tab_id, tab_label, allowed_for_admin')
      .order('tab_id');
    setPermissions((data as TabPermission[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const isTabAllowed = useCallback((tabId: string, role: 'admin' | 'super_admin') => {
    if (role === 'super_admin') return true;
    if (tabId === 'overview' || tabId === 'team') return true;
    const perm = permissions.find(p => p.tab_id === tabId);
    return perm ? perm.allowed_for_admin : true;
  }, [permissions]);

  return { permissions, loading, isTabAllowed, refresh: load };
}

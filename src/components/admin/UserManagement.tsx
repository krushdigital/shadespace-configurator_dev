import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { getAdminAuthHeaders } from '../../utils/adminAuth';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import type { AdminProfile } from '../../hooks/useAdminProfile';
import type { TabPermission } from '../../hooks/useTabPermissions';

interface AdminUserRow {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'super_admin' | 'team_member';
  status: 'pending' | 'active' | 'disabled';
  auth_user_id: string | null;
  invited_by: string | null;
  invited_at: string | null;
  activated_at: string | null;
  last_login_at: string | null;
  created_at: string;
}

interface Props {
  currentProfile: AdminProfile;
  tabPermissions?: TabPermission[];
  onPermissionsChange?: () => void;
}

export const UserManagement: React.FC<Props> = ({ currentProfile, tabPermissions = [], onPermissionsChange }) => {
  const isSuper = currentProfile.role === 'super_admin';
  const [rows, setRows] = useState<AdminUserRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviting, setInviting] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  useBodyScrollLock(showInvite);
  useEffect(() => {
    if (!showInvite) return;
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') setShowInvite(false); };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [showInvite]);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteName, setInviteName] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'super_admin' | 'team_member'>('team_member');
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('admin_users').select('*').order('created_at', { ascending: false });
    setRows((data as AdminUserRow[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const showMsg = (type: 'success' | 'error', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const invite = async () => {
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-invite`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail.trim(), full_name: inviteName.trim(), role: inviteRole }),
      });
      const json = await res.json();
      if (!res.ok) {
        showMsg('error', json.error || 'Invite failed');
      } else {
        showMsg('success', `Invite sent to ${inviteEmail}`);
        setShowInvite(false);
        setInviteEmail(''); setInviteName(''); setInviteRole('team_member');
        load();
      }
    } catch (e) {
      showMsg('error', e instanceof Error ? e.message : 'Invite failed');
    } finally {
      setInviting(false);
    }
  };

  const removeUser = async (row: AdminUserRow) => {
    if (!confirm(`Permanently remove ${row.email}? This also deletes the Supabase Auth user so they can no longer sign in anywhere.`)) return;
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-delete`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: row.id }),
      });
      const json = await res.json();
      if (!res.ok) showMsg('error', json.error || 'Delete failed');
      else {
        showMsg('success', `${row.email} removed`);
        load();
      }
    } catch (e) { showMsg('error', e instanceof Error ? e.message : 'Delete failed'); }
  };

  const updateRole = async (row: AdminUserRow, patch: { role?: 'admin' | 'super_admin'; status?: string }) => {
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-update-role`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminUserId: row.id, ...patch }),
      });
      const json = await res.json();
      if (!res.ok) showMsg('error', json.error || 'Update failed');
      else load();
    } catch (e) { showMsg('error', e instanceof Error ? e.message : 'Update failed'); }
  };

  const resendInvite = async (row: AdminUserRow) => {
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-invite`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: row.email, full_name: row.full_name, role: row.role }),
      });
      const json = await res.json();
      if (!res.ok) showMsg('error', json.error || 'Resend failed');
      else showMsg('success', `Invite re-sent to ${row.email}`);
    } catch (e) { showMsg('error', e instanceof Error ? e.message : 'Resend failed'); }
  };

  const fmt = (iso: string | null) => iso ? new Date(iso).toLocaleString() : '-';

  const active = rows.filter(r => r.status === 'active');
  const pending = rows.filter(r => r.status === 'pending');
  const disabled = rows.filter(r => r.status === 'disabled');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-sm text-gray-500">Signed in as {currentProfile.email} ({currentProfile.role === 'super_admin' ? 'Super Admin' : 'Admin'})</p>
        </div>
        {isSuper && <Button onClick={() => setShowInvite(true)}>Invite admin</Button>}
      </div>

      {msg && (
        <div className={`px-4 py-3 rounded text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'}`}>
          {msg.text}
        </div>
      )}

      {loading ? (
        <Card className="p-6 text-sm text-gray-500">Loading...</Card>
      ) : (
        <>
          <Section title={`Active admins (${active.length})`}>
            <UserTable rows={active} isSuper={isSuper} currentId={currentProfile.id} onRemove={removeUser} onUpdate={updateRole} fmt={fmt} />
          </Section>
          <Section title={`Pending invitations (${pending.length})`}>
            <UserTable rows={pending} isSuper={isSuper} currentId={currentProfile.id} onRemove={removeUser} onResend={resendInvite} fmt={fmt} />
          </Section>
          {disabled.length > 0 && (
            <Section title={`Disabled (${disabled.length})`}>
              <UserTable rows={disabled} isSuper={isSuper} currentId={currentProfile.id} onRemove={removeUser} onUpdate={updateRole} fmt={fmt} />
            </Section>
          )}
        </>
      )}

      {isSuper && tabPermissions.length > 0 && (
        <TabPermissionsPanel
          permissions={tabPermissions}
          currentProfile={currentProfile}
          onPermissionsChange={onPermissionsChange}
        />
      )}

      {showInvite && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowInvite(false)} onWheel={e => e.stopPropagation()} onTouchMove={e => e.stopPropagation()}>
          <Card className="max-w-md w-full max-h-[90vh] flex flex-col" onClick={(e: React.MouseEvent) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-5 pb-3">
              <h3 className="text-lg font-bold">Invite a new admin</h3>
              <button onClick={() => setShowInvite(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100" aria-label="Close">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-5 pb-3 space-y-3">
              <div>
                <label className="text-xs text-gray-500 block mb-1">Email</label>
                <input value={inviteEmail} onChange={e => setInviteEmail(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="name@company.com" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Full name</label>
                <input value={inviteName} onChange={e => setInviteName(e.target.value)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm" placeholder="Jane Doe" />
              </div>
              <div>
                <label className="text-xs text-gray-500 block mb-1">Role</label>
                <select value={inviteRole} onChange={e => setInviteRole(e.target.value as any)} className="w-full border border-gray-300 rounded px-3 py-2 text-sm">
                  <option value="team_member">Team Member (limited tab access, email/password sign-in)</option>
                  <option value="admin">Admin (view analytics, manage content, Google sign-in)</option>
                  <option value="super_admin">Super Admin (full access, can invite and manage users)</option>
                </select>
              </div>
              <p className="text-xs text-gray-500">
                {inviteRole === 'team_member'
                  ? 'They will receive an email with a link to set their password.'
                  : 'They will receive an email invitation. They can sign in with Google once accepted.'}
              </p>
            </div>
            <div className="px-5 py-4 border-t border-gray-100 flex justify-end gap-2 flex-shrink-0">
              <Button variant="outline" onClick={() => setShowInvite(false)}>Cancel</Button>
              <Button onClick={invite} disabled={inviting || !inviteEmail}>{inviting ? 'Sending...' : 'Send invite'}</Button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};

const TabPermissionsPanel: React.FC<{
  permissions: TabPermission[];
  currentProfile: AdminProfile;
  onPermissionsChange?: () => void;
}> = ({ permissions, currentProfile, onPermissionsChange }) => {
  const [saving, setSaving] = useState<string | null>(null);

  const toggle = async (tabId: string, field: 'allowed_for_admin' | 'allowed_for_team_member', current: boolean) => {
    setSaving(`${tabId}-${field}`);
    const { error } = await supabase
      .from('admin_tab_permissions')
      .update({ [field]: !current, updated_at: new Date().toISOString(), updated_by: currentProfile.id })
      .eq('tab_id', tabId);
    if (!error && onPermissionsChange) onPermissionsChange();
    setSaving(null);
  };

  return (
    <Card className="p-0 overflow-hidden">
      <h2 className="font-semibold text-gray-900 p-4 border-b border-gray-200">Tab Permissions</h2>
      <p className="px-4 pt-2 pb-3 text-xs text-gray-500">Control which tabs Admins and Team Members can access. Super Admins always have full access.</p>
      <div className="overflow-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50 text-xs uppercase text-gray-500">
            <tr>
              <th className="text-left px-4 py-2">Tab</th>
              <th className="text-center px-4 py-2">Admin</th>
              <th className="text-center px-4 py-2">Team Member</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {permissions.map(p => (
              <tr key={p.tab_id}>
                <td className="px-4 py-3 text-gray-800">{p.tab_label}</td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(p.tab_id, 'allowed_for_admin', p.allowed_for_admin)}
                    disabled={saving === `${p.tab_id}-allowed_for_admin`}
                    className={`relative w-10 h-5 rounded-full transition-colors ${p.allowed_for_admin ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.allowed_for_admin ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    onClick={() => toggle(p.tab_id, 'allowed_for_team_member', p.allowed_for_team_member)}
                    disabled={saving === `${p.tab_id}-allowed_for_team_member`}
                    className={`relative w-10 h-5 rounded-full transition-colors ${p.allowed_for_team_member ? 'bg-green-500' : 'bg-gray-300'}`}
                  >
                    <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${p.allowed_for_team_member ? 'translate-x-5' : 'translate-x-0.5'}`} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <Card className="p-0 overflow-hidden">
    <h2 className="font-semibold text-gray-900 p-4 border-b border-gray-200">{title}</h2>
    {children}
  </Card>
);

interface UserTableProps {
  rows: AdminUserRow[];
  isSuper: boolean;
  currentId: string;
  onRemove: (r: AdminUserRow) => void;
  onUpdate?: (r: AdminUserRow, patch: any) => void;
  onResend?: (r: AdminUserRow) => void;
  fmt: (iso: string | null) => string;
}

const UserTable: React.FC<UserTableProps> = ({ rows, isSuper, currentId, onRemove, onUpdate, onResend, fmt }) => {
  if (rows.length === 0) return <div className="p-6 text-center text-sm text-gray-500">No users here yet.</div>;
  return (
    <div className="overflow-auto">
      <table className="min-w-full text-sm">
        <thead className="bg-gray-50 text-xs uppercase text-gray-500">
          <tr>
            <th className="text-left px-4 py-2">Email</th>
            <th className="text-left px-4 py-2">Name</th>
            <th className="text-left px-4 py-2">Role</th>
            <th className="text-left px-4 py-2">Last sign-in</th>
            <th className="text-left px-4 py-2">Invited</th>
            {isSuper && <th className="text-right px-4 py-2">Actions</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map(r => (
            <tr key={r.id} className="hover:bg-gray-50">
              <td className="px-4 py-2 font-medium text-gray-900">{r.email}</td>
              <td className="px-4 py-2 text-gray-700">{r.full_name || '-'}</td>
              <td className="px-4 py-2">
                <span className={`text-xs px-2 py-0.5 rounded ${
                  r.role === 'super_admin' ? 'bg-blue-50 text-blue-700' :
                  r.role === 'team_member' ? 'bg-green-50 text-green-700' :
                  'bg-gray-100 text-gray-700'
                }`}>
                  {r.role === 'super_admin' ? 'Super Admin' : r.role === 'team_member' ? 'Team Member' : 'Admin'}
                </span>
              </td>
              <td className="px-4 py-2 text-xs text-gray-600">{fmt(r.last_login_at)}</td>
              <td className="px-4 py-2 text-xs text-gray-600">{fmt(r.invited_at)}</td>
              {isSuper && (
                <td className="px-4 py-2 text-right">
                  <div className="flex justify-end gap-1 flex-wrap">
                    {onUpdate && r.id !== currentId && r.status !== 'pending' && (
                      <button
                        onClick={() => onUpdate(r, { role: r.role === 'super_admin' ? 'admin' : 'super_admin' })}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        {r.role === 'super_admin' ? 'Demote' : 'Promote'}
                      </button>
                    )}
                    {onUpdate && r.id !== currentId && r.status === 'active' && (
                      <button onClick={() => onUpdate(r, { status: 'disabled' })} className="text-xs text-amber-600 hover:underline">Disable</button>
                    )}
                    {onUpdate && r.status === 'disabled' && (
                      <button onClick={() => onUpdate(r, { status: 'active' })} className="text-xs text-green-600 hover:underline">Re-enable</button>
                    )}
                    {onResend && (
                      <button onClick={() => onResend(r)} className="text-xs text-blue-600 hover:underline">Resend</button>
                    )}
                    {r.id !== currentId && (
                      <button onClick={() => onRemove(r)} className="text-xs text-red-600 hover:underline">Remove</button>
                    )}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { getAdminAuthHeaders } from '../../utils/adminAuth';

interface ExcludedIp {
  id: string;
  ip_address: string;
  label: string;
  created_at: string;
  match_mode?: 'exact' | 'prefix' | 'cidr' | 'range';
  range_start?: string | null;
  range_end?: string | null;
}

const MATCH_TYPE_LABEL: Record<string, string> = {
  exact: 'Exact',
  prefix: 'Prefix',
  cidr: 'CIDR',
  range: 'Range',
};

const MATCH_TYPE_CLASS: Record<string, string> = {
  exact: 'bg-gray-100 text-gray-700',
  prefix: 'bg-blue-50 text-blue-700',
  cidr: 'bg-emerald-50 text-emerald-700',
  range: 'bg-amber-50 text-amber-700',
};

function formatExcludedIp(ip: ExcludedIp): string {
  if (ip.match_mode === 'range' && ip.range_start && ip.range_end) {
    return `${ip.range_start} \u2013 ${ip.range_end}`;
  }
  return ip.ip_address;
}

function validateIpInput(input: string): string | null {
  const s = input.trim();
  if (!s) return 'Enter an IP, CIDR, or range.';
  if (s.includes('-') && !s.includes('/')) {
    const parts = s.split(/\s*-\s*/);
    if (parts.length !== 2 || !parts[0] || !parts[1]) {
      return 'Range must be "start-end" (e.g. 1.2.3.4-1.2.3.20).';
    }
  }
  return null;
}

interface ExcludedEmail {
  id: string;
  email_pattern: string;
  label: string;
  created_at: string;
}

export const ExclusionManager: React.FC = () => {
  const [ips, setIps] = useState<ExcludedIp[]>([]);
  const [emails, setEmails] = useState<ExcludedEmail[]>([]);
  const [loading, setLoading] = useState(true);
  const [newIp, setNewIp] = useState('');
  const [newIpLabel, setNewIpLabel] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newEmailLabel, setNewEmailLabel] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [refreshResult, setRefreshResult] = useState<{ events_flagged: number; quotes_flagged: number } | null>(null);
  const [addingIp, setAddingIp] = useState(false);
  const [addingEmail, setAddingEmail] = useState(false);

  useEffect(() => {
    fetchExclusions();
  }, []);

  const fetchExclusions = async () => {
    try {
      setLoading(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const [ipsRes, emailsRes] = await Promise.all([
        fetch(`${supabaseUrl}/rest/v1/excluded_ips?order=created_at.desc`, { headers }),
        fetch(`${supabaseUrl}/rest/v1/excluded_emails?order=created_at.desc`, { headers }),
      ]);

      if (ipsRes.ok) setIps(await ipsRes.json());
      if (emailsRes.ok) setEmails(await emailsRes.json());
    } catch (error) {
      console.error('Failed to fetch exclusions:', error);
    } finally {
      setLoading(false);
    }
  };

  const addIp = async () => {
    const trimmed = newIp.trim();
    if (!trimmed) return;
    const validationError = validateIpInput(trimmed);
    if (validationError) {
      alert(validationError);
      return;
    }

    try {
      setAddingIp(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/excluded_ips`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ ip_address: trimmed, label: newIpLabel.trim() || trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        setIps([...data, ...ips]);
        setNewIp('');
        setNewIpLabel('');
      } else {
        const err = await res.text();
        if (err.includes('duplicate')) {
          alert('This IP rule is already in the exclusion list.');
        } else {
          alert(`Failed to add: ${err}`);
        }
      }
    } catch (error) {
      console.error('Failed to add IP:', error);
    } finally {
      setAddingIp(false);
    }
  };

  const removeIp = async (id: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/excluded_ips?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        setIps(ips.filter(ip => ip.id !== id));
      }
    } catch (error) {
      console.error('Failed to remove IP:', error);
    }
  };

  const addEmail = async () => {
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    try {
      setAddingEmail(true);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/excluded_emails`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json', 'Prefer': 'return=representation' },
        body: JSON.stringify({ email_pattern: trimmed, label: newEmailLabel.trim() || trimmed }),
      });

      if (res.ok) {
        const data = await res.json();
        setEmails([...data, ...emails]);
        setNewEmail('');
        setNewEmailLabel('');
      } else {
        const err = await res.text();
        if (err.includes('duplicate')) {
          alert('This email pattern is already in the exclusion list.');
        }
      }
    } catch (error) {
      console.error('Failed to add email:', error);
    } finally {
      setAddingEmail(false);
    }
  };

  const removeEmail = async (id: string) => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/excluded_emails?id=eq.${id}`, {
        method: 'DELETE',
        headers,
      });

      if (res.ok) {
        setEmails(emails.filter(e => e.id !== id));
      }
    } catch (error) {
      console.error('Failed to remove email:', error);
    }
  };

  const refreshFlags = async () => {
    try {
      setRefreshing(true);
      setRefreshResult(null);
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (!supabaseUrl) return;

      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${supabaseUrl}/rest/v1/rpc/refresh_exclusion_flags`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: '{}',
      });

      if (res.ok) {
        const data = await res.json();
        setRefreshResult(data);
      }
    } catch (error) {
      console.error('Failed to refresh flags:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric', month: 'short', day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Card className="p-6"><div className="animate-pulse h-32 bg-gray-200 rounded"></div></Card>
        <Card className="p-6"><div className="animate-pulse h-32 bg-gray-200 rounded"></div></Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-900">Internal Traffic Exclusion</h2>
          <Button onClick={refreshFlags} disabled={refreshing} variant="outline" size="sm">
            {refreshing ? 'Refreshing...' : 'Re-scan All Historical Data'}
          </Button>
        </div>
        <p className="text-sm text-gray-600 mb-4">
          Add IP addresses and email patterns to automatically exclude from analytics.
          New entries matching these rules will be flagged automatically.
          Use "Re-scan All Historical Data" to retroactively flag existing records after adding new rules.
        </p>
        {refreshResult && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
            <p className="text-sm text-green-800 font-medium">
              Scan complete: {refreshResult.events_flagged} events and {refreshResult.quotes_flagged} quotes flagged as internal.
            </p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">Excluded IP Addresses</h3>
        <p className="text-xs text-gray-500 mb-3">
          Accepts a single IP (<span className="font-mono">1.2.3.4</span>),
          a CIDR (<span className="font-mono">10.0.0.0/24</span>),
          a range (<span className="font-mono">1.2.3.4-1.2.3.20</span>),
          or a prefix (<span className="font-mono">203.118.</span>).
          The match type is detected automatically.
        </p>
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="IP, CIDR, or range"
            value={newIp}
            onChange={(e) => setNewIp(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => e.key === 'Enter' && addIp()}
          />
          <Input
            placeholder="Label (e.g. Office NZ)"
            value={newIpLabel}
            onChange={(e) => setNewIpLabel(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => e.key === 'Enter' && addIp()}
          />
          <Button onClick={addIp} disabled={addingIp || !newIp.trim()} size="sm">
            {addingIp ? 'Adding...' : 'Add Rule'}
          </Button>
        </div>

        {ips.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No excluded IPs yet. Add your office or home IP to start filtering.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Match</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Type</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Label</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Added</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ips.map((ip) => {
                  const mode = ip.match_mode || 'exact';
                  return (
                    <tr key={ip.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="px-4 py-2 text-sm font-mono text-gray-900">{formatExcludedIp(ip)}</td>
                      <td className="px-4 py-2 text-sm">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${MATCH_TYPE_CLASS[mode] || MATCH_TYPE_CLASS.exact}`}>
                          {MATCH_TYPE_LABEL[mode] || mode}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-700">{ip.label}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">{formatDate(ip.created_at)}</td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() => removeIp(ip.id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Excluded Email Patterns</h3>
        <p className="text-xs text-gray-500 mb-3">
          Enter a full email (e.g. john@example.com) or a domain pattern (e.g. @yourcompany.com) to exclude all emails from that domain.
        </p>
        <div className="flex gap-3 mb-4">
          <Input
            placeholder="Email or domain (e.g. @company.com)"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
          />
          <Input
            placeholder="Label (e.g. Team emails)"
            value={newEmailLabel}
            onChange={(e) => setNewEmailLabel(e.target.value)}
            className="max-w-xs"
            onKeyDown={(e) => e.key === 'Enter' && addEmail()}
          />
          <Button onClick={addEmail} disabled={addingEmail || !newEmail.trim()} size="sm">
            {addingEmail ? 'Adding...' : 'Add Pattern'}
          </Button>
        </div>

        {emails.length === 0 ? (
          <p className="text-sm text-gray-500 py-4">No excluded email patterns yet. Add your company domain to filter team activity.</p>
        ) : (
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Pattern</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Label</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600">Added</th>
                  <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {emails.map((email) => (
                  <tr key={email.id} className="border-b border-gray-100 hover:bg-gray-50">
                    <td className="px-4 py-2 text-sm font-mono text-gray-900">{email.email_pattern}</td>
                    <td className="px-4 py-2 text-sm text-gray-700">{email.label}</td>
                    <td className="px-4 py-2 text-sm text-gray-500">{formatDate(email.created_at)}</td>
                    <td className="px-4 py-2 text-right">
                      <button
                        onClick={() => removeEmail(email.id)}
                        className="text-red-600 hover:text-red-800 text-sm font-medium"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-3">How Exclusion Works</h3>
        <div className="space-y-3 text-sm text-gray-700">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center text-xs font-bold">1</div>
            <p><strong>Automatic:</strong> New events and quotes are checked against the exclusion lists on creation. Matching entries are instantly flagged.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center text-xs font-bold">2</div>
            <p><strong>Retroactive:</strong> Click "Re-scan All Historical Data" after adding new rules to flag existing records that match.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center text-xs font-bold">3</div>
            <p><strong>Dashboard toggle:</strong> Use the "Exclude Internal" toggle on the dashboard to hide flagged entries from all analytics views.</p>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-lime-100 text-lime-700 flex items-center justify-center text-xs font-bold">4</div>
            <p><strong>Manual flagging:</strong> You can also manually mark individual quotes or events as internal from their detail views.</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

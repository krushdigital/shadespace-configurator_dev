import React, { useEffect, useState, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { supabase } from '../../../lib/supabase';

interface Props {
  dateRange: { start: string; end: string };
  excludeInternal?: boolean;
  timezone?: string;
}

interface QueueRow {
  id: string;
  recipient_email: string;
  status: string;
  sent_at: string | null;
  subject_snapshot: string | null;
  html_snapshot: string | null;
  resend_message_id: string | null;
  template_id: string | null;
  automation_id: string | null;
  sender_id: string | null;
}

interface EventRow {
  queue_id: string;
  event_type: string;
  url: string | null;
  occurred_at: string;
}

export const EmailAnalytics: React.FC<Props> = ({ dateRange, timezone = 'UTC' }) => {
  const [queue, setQueue] = useState<QueueRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [senders, setSenders] = useState<any[]>([]);
  const [preview, setPreview] = useState<QueueRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const start = `${dateRange.start}T00:00:00`;
      const end = `${dateRange.end}T23:59:59`;
      const [{ data: q }, { data: t }, { data: a }, { data: s }] = await Promise.all([
        supabase.from('email_queue').select('*').gte('created_at', start).lte('created_at', end).order('created_at', { ascending: false }).limit(500),
        supabase.from('email_templates').select('id, name'),
        supabase.from('email_automations').select('id, name'),
        supabase.from('email_senders').select('id, from_name'),
      ]);
      const queueRows = q || [];
      setQueue(queueRows);
      setTemplates(t || []);
      setAutomations(a || []);
      setSenders(s || []);
      if (queueRows.length) {
        const { data: ev } = await supabase.from('email_events').select('queue_id, event_type, url, occurred_at').in('queue_id', queueRows.map(r => r.id));
        setEvents(ev || []);
      } else {
        setEvents([]);
      }
      setLoading(false);
    };
    load();
  }, [dateRange]);

  const stats = useMemo(() => {
    const s = { sent: 0, delivered: 0, opened: 0, clicked: 0, bounced: 0, unsubscribed: 0 };
    queue.forEach(q => { if (q.status === 'sent') s.sent++; });
    const firstByType: Record<string, Set<string>> = { delivered: new Set(), opened: new Set(), clicked: new Set(), bounced: new Set(), unsubscribed: new Set() };
    events.forEach(e => { if (firstByType[e.event_type]) firstByType[e.event_type].add(e.queue_id); });
    s.delivered = firstByType.delivered.size;
    s.opened = firstByType.opened.size;
    s.clicked = firstByType.clicked.size;
    s.bounced = firstByType.bounced.size;
    s.unsubscribed = firstByType.unsubscribed.size;
    return s;
  }, [queue, events]);

  const clicksByUrl = useMemo(() => {
    const map = new Map<string, number>();
    events.filter(e => e.event_type === 'clicked' && e.url).forEach(e => map.set(e.url!, (map.get(e.url!) || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 15);
  }, [events]);

  const fmtDate = (iso: string | null) => iso ? new Date(iso).toLocaleString('en-US', { timeZone: timezone, year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';
  const pct = (n: number) => stats.sent > 0 ? `${Math.round((n / stats.sent) * 100)}%` : '0%';

  const clicksFor = (qid: string) => events.filter(e => e.queue_id === qid && e.event_type === 'clicked').length;
  const openedAt = (qid: string) => events.find(e => e.queue_id === qid && e.event_type === 'opened')?.occurred_at || null;

  if (loading) return <Card className="p-6 text-sm text-gray-500">Loading analytics...</Card>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        {[
          { k: 'Sent', v: stats.sent, r: '100%' },
          { k: 'Delivered', v: stats.delivered, r: pct(stats.delivered) },
          { k: 'Opened', v: stats.opened, r: pct(stats.opened) },
          { k: 'Clicked', v: stats.clicked, r: pct(stats.clicked) },
          { k: 'Bounced', v: stats.bounced, r: pct(stats.bounced) },
          { k: 'Unsub', v: stats.unsubscribed, r: pct(stats.unsubscribed) },
        ].map(m => (
          <Card key={m.k} className="p-4">
            <div className="text-xs text-gray-500">{m.k}</div>
            <div className="text-2xl font-bold text-gray-900">{m.v}</div>
            <div className="text-xs text-gray-500">{m.r}</div>
          </Card>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <h2 className="font-semibold text-gray-900 p-4 border-b border-gray-200">Sends</h2>
        <div className="overflow-auto max-h-[500px]">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="text-left px-4 py-2">Sent at</th>
                <th className="text-left px-4 py-2">Recipient</th>
                <th className="text-left px-4 py-2">Template</th>
                <th className="text-left px-4 py-2">Automation</th>
                <th className="text-left px-4 py-2">Sender</th>
                <th className="text-left px-4 py-2">Status</th>
                <th className="text-left px-4 py-2">Opened</th>
                <th className="text-left px-4 py-2">Clicks</th>
                <th className="text-left px-4 py-2">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {queue.map(q => (
                <tr key={q.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-xs text-gray-700">{fmtDate(q.sent_at)}</td>
                  <td className="px-4 py-2 text-xs">{q.recipient_email}</td>
                  <td className="px-4 py-2 text-xs">{templates.find(t => t.id === q.template_id)?.name || '-'}</td>
                  <td className="px-4 py-2 text-xs">{automations.find(a => a.id === q.automation_id)?.name || 'test'}</td>
                  <td className="px-4 py-2 text-xs">{senders.find(s => s.id === q.sender_id)?.from_name || '-'}</td>
                  <td className="px-4 py-2 text-xs">
                    <span className={`px-2 py-0.5 rounded ${q.status === 'sent' ? 'bg-green-50 text-green-700' : q.status === 'failed' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-700'}`}>
                      {q.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-xs">{openedAt(q.id) ? fmtDate(openedAt(q.id)) : '-'}</td>
                  <td className="px-4 py-2 text-xs">{clicksFor(q.id)}</td>
                  <td className="px-4 py-2 text-xs">
                    <button onClick={() => setPreview(q)} className="text-blue-600 hover:underline">open</button>
                  </td>
                </tr>
              ))}
              {queue.length === 0 && (
                <tr><td colSpan={9} className="text-center p-6 text-sm text-gray-500">No emails sent in this date range.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <h2 className="font-semibold text-gray-900 p-4 border-b border-gray-200">Top clicked URLs</h2>
        <div className="divide-y divide-gray-100">
          {clicksByUrl.map(([u, n]) => (
            <div key={u} className="flex items-center justify-between px-4 py-2 text-xs">
              <span className="truncate max-w-[70%]" title={u}>{u}</span>
              <span className="font-semibold">{n}</span>
            </div>
          ))}
          {clicksByUrl.length === 0 && <div className="p-4 text-center text-sm text-gray-500">No clicks yet.</div>}
        </div>
      </Card>

      {preview && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setPreview(null)}>
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto p-5" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-900">{preview.subject_snapshot}</h3>
              <button onClick={() => setPreview(null)} className="text-gray-400 hover:text-gray-700">x</button>
            </div>
            <div className="text-xs text-gray-500 mb-3">To: {preview.recipient_email}</div>
            <div dangerouslySetInnerHTML={{ __html: preview.html_snapshot || '' }} />
          </div>
        </div>
      )}
    </div>
  );
};

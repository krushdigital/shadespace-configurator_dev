import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../lib/supabase';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';
import type { EmailTemplate, EmailSender } from '../EmailStudio';

interface QuoteOption {
  id: string;
  quote_reference: string;
  quote_name: string;
  customer_email: string | null;
  customer_first_name: string | null;
  customer_last_name: string | null;
  created_at: string;
  diagram_public_url: string | null;
  diagram_image_path: string | null;
}

interface RecentSend {
  id: string;
  recipient_email: string;
  status: string;
  sent_at: string | null;
  created_at: string;
  attachments: Array<{ filename: string; type?: string }> | null;
  subject_snapshot: string | null;
  html_snapshot: string | null;
  error: string | null;
}

export const TransactionalTemplates: React.FC<{ senders: EmailSender[] }> = ({ senders }) => {
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [selected, setSelected] = useState<EmailTemplate | null>(null);
  const [draft, setDraft] = useState<EmailTemplate | null>(null);
  const [saving, setSaving] = useState(false);
  const [mode, setMode] = useState<'preview' | 'code'>('preview');

  const [quotes, setQuotes] = useState<QuoteOption[]>([]);
  const [previewQuoteId, setPreviewQuoteId] = useState<string>('');
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [previewSubject, setPreviewSubject] = useState<string>('');
  const [previewLoading, setPreviewLoading] = useState(false);

  const [testTo, setTestTo] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [sending, setSending] = useState(false);

  const [recent, setRecent] = useState<RecentSend[]>([]);
  const [drawerSend, setDrawerSend] = useState<RecentSend | null>(null);

  const load = useCallback(async () => {
    const { data } = await supabase
      .from('email_templates')
      .select('*')
      .eq('transactional', true)
      .order('name');
    setTemplates(data || []);
    if (!selected && data && data.length > 0) {
      setSelected(data[0]);
      setDraft(data[0]);
    }
  }, [selected]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    supabase
      .from('saved_quotes')
      .select('id, quote_reference, quote_name, customer_email, customer_first_name, customer_last_name, created_at, diagram_public_url, diagram_image_path')
      .order('created_at', { ascending: false })
      .limit(25)
      .then(({ data }) => setQuotes(data || []));
  }, []);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user?.email) setTestTo(user.email);
    })();
  }, []);

  const loadRecent = useCallback(async (templateId: string) => {
    const { data } = await supabase
      .from('email_queue')
      .select('id, recipient_email, status, sent_at, created_at, attachments, subject_snapshot, html_snapshot, error')
      .eq('template_id', templateId)
      .order('created_at', { ascending: false })
      .limit(10);
    setRecent((data as any) || []);
  }, []);

  useEffect(() => { if (selected) loadRecent(selected.id); }, [selected, loadRecent]);

  const runPreview = useCallback(async () => {
    if (!draft) return;
    setPreviewLoading(true);
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: draft.id,
          toEmail: 'preview@example.com',
          previewOnly: true,
          quoteId: previewQuoteId || null,
        }),
      });
      const json = await res.json();
      if (res.ok && json?.ok) {
        setPreviewHtml(json.html || '');
        setPreviewSubject(json.subject || '');
      } else {
        setPreviewHtml(`<div style="padding:20px;color:#b91c1c;">Preview failed: ${JSON.stringify(json)}</div>`);
      }
    } catch (e) {
      setPreviewHtml(`<div style="padding:20px;color:#b91c1c;">Error: ${e instanceof Error ? e.message : e}</div>`);
    } finally {
      setPreviewLoading(false);
    }
  }, [draft, previewQuoteId]);

  useEffect(() => { if (draft) runPreview(); }, [draft?.id, previewQuoteId, runPreview]);

  const save = async () => {
    if (!draft) return;
    setSaving(true);
    const { error } = await supabase.from('email_templates').update({
      html_body: draft.html_body,
      text_body: draft.text_body,
      default_sender_id: draft.default_sender_id,
    }).eq('id', draft.id);
    setSaving(false);
    if (error) { alert(`Save failed: ${error.message}`); return; }
    await load();
    await runPreview();
  };

  const sendTest = async () => {
    if (!draft || !testTo) return;
    setSending(true);
    const wantsPdf = !!previewQuoteId && (draft as any).attach_pdf === true;
    setTestStatus(wantsPdf ? 'Generating PDF and sending...' : 'Sending...');
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: draft.id,
          toEmail: testTo,
          testMode: !previewQuoteId,
          quoteId: previewQuoteId || null,
          generatePdfFromQuote: wantsPdf,
        }),
      });
      const json = await res.json();
      setTestStatus(res.ok && json?.ok ? `Sent to ${testTo}${wantsPdf ? ' with PDF attached' : ''}` : `Failed: ${JSON.stringify(json?.error || json)}`);
      if (selected) loadRecent(selected.id);
    } catch (e) {
      setTestStatus(`Error: ${e instanceof Error ? e.message : e}`);
    } finally {
      setSending(false);
    }
  };

  const quoteLabel = (q: QuoteOption) => {
    const name = [q.customer_first_name, q.customer_last_name].filter(Boolean).join(' ') || q.customer_email || 'No customer';
    return `${q.quote_reference || '(no ref)'} - ${q.quote_name || 'Untitled'} - ${name}`;
  };

  const lastSent = useMemo(() => {
    if (recent.length === 0) return null;
    const latest = recent.find(r => r.status === 'sent');
    return latest?.sent_at || latest?.created_at || null;
  }, [recent]);

  return (
    <div className="space-y-4">
      <Card className="p-4 bg-amber-50 border-amber-200 border">
        <div className="flex items-start gap-3">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2" className="flex-shrink-0 mt-0.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>
          <div>
            <div className="text-sm font-semibold text-amber-900">Service emails</div>
            <div className="text-xs text-amber-800 mt-0.5">
              These templates are sent automatically when customers save progress or request a PDF quote. Subjects are locked to protect customer expectations, and these emails bypass the unsubscribe list.
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        <div className="space-y-3">
          {templates.map(t => (
            <button
              key={t.id}
              onClick={() => { setSelected(t); setDraft(t); }}
              className={`w-full text-left rounded-lg border p-3 transition-colors ${selected?.id === t.id ? 'border-lime-500 bg-lime-50' : 'border-gray-200 bg-white hover:border-gray-300'}`}
            >
              <div className="flex items-center justify-between">
                <div className="font-semibold text-sm text-gray-900">{t.name}</div>
                <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                  Locked
                </span>
              </div>
              <div className="text-[11px] text-gray-500 mt-1 truncate" title={t.subject}>{t.subject}</div>
              {selected?.id === t.id && lastSent && (
                <div className="text-[11px] text-gray-500 mt-1">Last sent: {new Date(lastSent).toLocaleString()}</div>
              )}
            </button>
          ))}
          {templates.length === 0 && (
            <div className="text-sm text-gray-500 p-3">No transactional templates configured.</div>
          )}
        </div>

        {draft && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-900">{draft.name}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{draft.template_key}</div>
                </div>
                <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-1">
                  Subject
                  <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                    Locked
                  </span>
                </label>
                <input
                  value={draft.subject}
                  readOnly
                  className="w-full border border-gray-200 bg-gray-50 rounded-md px-3 py-2 text-sm text-gray-700"
                  title="Subject is locked for transactional templates to protect customer expectations"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">From sender</label>
                <select
                  value={draft.default_sender_id || ''}
                  onChange={e => setDraft({ ...draft, default_sender_id: e.target.value || null })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">-- choose sender --</option>
                  {senders.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.from_name} &lt;{s.from_email}&gt;{s.is_default ? ' (default)' : ''}{s.is_verified ? '' : ' (unverified)'}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-gray-500 mt-1">Customer-facing "From" line for this email. Click Save to apply.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Preview with a real quote</label>
                <select
                  value={previewQuoteId}
                  onChange={e => setPreviewQuoteId(e.target.value)}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                >
                  <option value="">Sample data (Alex Sample)</option>
                  {quotes.map(q => <option key={q.id} value={q.id}>{quoteLabel(q)}</option>)}
                </select>
                {(() => {
                  if (!previewQuoteId) return null;
                  const q = quotes.find(x => x.id === previewQuoteId);
                  if (!q) return null;
                  const hasDiagram = !!(q.diagram_public_url || q.diagram_image_path);
                  if (hasDiagram) return null;
                  return (
                    <p className="mt-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                      This quote does not have a stored design diagram. Emails will render without the diagram image. New saves and PDF sends store diagrams automatically.
                    </p>
                  );
                })()}
              </div>
            </Card>

            <Card className="p-0">
              <div className="flex gap-0 border-b border-gray-200 px-4">
                {(['preview', 'code'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px ${mode === m ? 'border-lime-500 text-lime-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
                  >
                    {m === 'preview' ? 'Preview' : '</> Edit HTML'}
                  </button>
                ))}
              </div>
              <div className="p-4">
                {mode === 'preview' && (
                  <div className="bg-[#f3f4f6] p-6 rounded">
                    <div className="text-xs text-gray-600 mb-3">
                      Subject: <strong>{previewSubject || draft.subject}</strong>
                      {previewLoading && <span className="ml-2 text-gray-400">(loading...)</span>}
                    </div>
                    <div className="mx-auto bg-white border border-gray-200 rounded overflow-hidden max-h-[800px] overflow-y-auto" style={{ maxWidth: 640 }} dangerouslySetInnerHTML={{ __html: previewHtml || '<div style="padding:20px;color:#6b7280;">Loading preview...</div>' }} />
                  </div>
                )}
                {mode === 'code' && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">HTML Body</label>
                      <textarea
                        value={draft.html_body}
                        onChange={e => setDraft({ ...draft, html_body: e.target.value })}
                        className="w-full h-96 border border-gray-300 rounded-md px-3 py-2 text-xs font-mono"
                        spellCheck={false}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Plain Text Body</label>
                      <textarea
                        value={draft.text_body}
                        onChange={e => setDraft({ ...draft, text_body: e.target.value })}
                        className="w-full h-40 border border-gray-300 rounded-md px-3 py-2 text-xs font-mono"
                        spellCheck={false}
                      />
                    </div>
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold text-gray-900 mb-2">Send test</div>
              <div className="flex gap-2">
                <input
                  value={testTo}
                  onChange={e => setTestTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
                />
                <Button size="sm" onClick={sendTest} disabled={sending || !testTo}>
                  {sending ? 'Sending...' : 'Send test'}
                </Button>
              </div>
              <div className="text-xs text-gray-500 mt-2">
                Uses {previewQuoteId ? 'the selected real quote' : 'sample data'} to render the email. Delivered via Resend.
              </div>
              {(draft as any).attach_pdf && (
                <div className="mt-2 text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5">
                  {previewQuoteId
                    ? 'A PDF quote will be auto-generated from the selected quote and attached.'
                    : 'Select a real quote above to attach a PDF. Sample data sends without an attachment.'}
                </div>
              )}
              {testStatus && <div className="mt-2 text-xs text-gray-700">{testStatus}</div>}
            </Card>

            <Card className="p-0 overflow-hidden">
              <div className="p-4 border-b border-gray-200 text-sm font-semibold text-gray-900">Recent sends</div>
              <div className="divide-y divide-gray-100">
                {recent.map(r => (
                  <button
                    key={r.id}
                    onClick={() => setDrawerSend(r)}
                    className="w-full grid grid-cols-[1fr_auto_auto] items-center gap-3 p-3 text-left hover:bg-gray-50"
                  >
                    <div>
                      <div className="text-sm text-gray-900 truncate">{r.recipient_email}</div>
                      <div className="text-[11px] text-gray-500">{new Date(r.sent_at || r.created_at).toLocaleString()}</div>
                    </div>
                    {Array.isArray(r.attachments) && r.attachments.length > 0 && (
                      <span className="text-[11px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-medium">PDF</span>
                    )}
                    <span className={`text-[11px] px-2 py-0.5 rounded-full ${
                      r.status === 'sent' ? 'bg-green-50 text-green-700' :
                      r.status === 'failed' ? 'bg-red-50 text-red-700' :
                      'bg-gray-100 text-gray-600'
                    }`}>{r.status}</span>
                  </button>
                ))}
                {recent.length === 0 && <div className="p-4 text-xs text-gray-500">No sends yet.</div>}
              </div>
            </Card>
          </div>
        )}
      </div>

      {drawerSend && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-stretch justify-end" onClick={() => setDrawerSend(null)}>
          <div className="bg-white w-full max-w-xl h-full overflow-auto shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="p-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold text-gray-900">{drawerSend.recipient_email}</div>
                <div className="text-xs text-gray-500 mt-0.5">{new Date(drawerSend.sent_at || drawerSend.created_at).toLocaleString()}</div>
              </div>
              <button onClick={() => setDrawerSend(null)} className="text-gray-500 hover:text-gray-700">&times;</button>
            </div>
            <div className="p-4 space-y-3">
              <div className="text-xs text-gray-600">Subject: <strong>{drawerSend.subject_snapshot}</strong></div>
              {drawerSend.error && <div className="text-xs text-red-700 bg-red-50 border border-red-200 rounded p-2">{drawerSend.error}</div>}
              <div className="bg-gray-100 p-2 rounded">
                <div className="bg-white rounded shadow-sm" dangerouslySetInnerHTML={{ __html: drawerSend.html_snapshot || '' }} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

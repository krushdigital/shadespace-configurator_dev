import React, { useState, useMemo } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../lib/supabase';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';
import type { EmailTemplate, EmailSender } from '../EmailStudio';
import { VisualBuilder } from './VisualBuilder';

type Mode = 'visual' | 'code' | 'preview';

const SHORTCODES: { code: string; desc: string }[] = [
  { code: 'first_name', desc: 'Customer first name' },
  { code: 'applicant_name', desc: 'Full name' },
  { code: 'email', desc: 'Email address' },
  { code: 'quote_reference', desc: 'Quote reference code' },
  { code: 'quote_name', desc: 'Quote name' },
  { code: 'current_step_label', desc: 'Current step in friendly text' },
  { code: 'resume_url', desc: 'Resume configurator link (tokenised)' },
  { code: 'pdf_url', desc: 'Direct PDF download link' },
  { code: 'price', desc: 'Total price formatted' },
  { code: 'currency', desc: 'Currency code' },
  { code: 'country', desc: 'Customer country' },
  { code: 'fabric_type', desc: 'Fabric type' },
  { code: 'fabric_color', desc: 'Fabric colour' },
  { code: 'corners', desc: 'Number of corners' },
  { code: 'days_since_saved', desc: 'Days since quote was saved' },
  { code: 'sender_first_name', desc: 'Sender signature name' },
  { code: 'support_phone', desc: 'Support phone number' },
  { code: 'unsubscribe_url', desc: 'Unsubscribe link (injected automatically)' },
];

function renderPreview(html: string): string {
  const sample: Record<string, string> = {
    first_name: 'Alex', applicant_name: 'Alex Sample', email: 'alex@example.com',
    quote_reference: 'QT-2026-0042', quote_name: 'Backyard sail',
    current_step_label: 'Review', resume_url: '#', pdf_url: '#',
    price: '1,299', currency: 'NZD', country: 'NZ',
    fabric_type: 'Shadetex 320', fabric_color: 'Charcoal', corners: '4',
    days_since_saved: '2', sender_first_name: 'Nick', support_phone: '+64 21 000 000',
    unsubscribe_url: '#',
  };
  let out = html.replace(/\{\{#if\s+([\w_]+)\s*\}\}([\s\S]*?)\{\{\/if\}\}/g, (_m, k, body) => sample[k] ? body : '');
  out = out.replace(/\{\{\s*([\w_]+)\s*\}\}/g, (_m, k) => sample[k] ?? '');
  return out;
}

export const TemplateEditor: React.FC<{ template: EmailTemplate; senders: EmailSender[]; onBack: () => void }> = ({ template, senders, onBack }) => {
  const [mode, setMode] = useState<Mode>('visual');
  const [draft, setDraft] = useState<EmailTemplate>(template);
  const [saving, setSaving] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [testStatus, setTestStatus] = useState<string | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const previewHtml = useMemo(() => renderPreview(draft.html_body), [draft.html_body]);

  const save = async () => {
    setSaving(true);
    const { error } = await supabase.from('email_templates').update({
      name: draft.name,
      template_key: draft.template_key,
      subject: draft.subject,
      html_body: draft.html_body,
      text_body: draft.text_body,
      design_json: draft.design_json,
      default_sender_id: draft.default_sender_id,
      is_active: draft.is_active,
      description: draft.description,
    }).eq('id', draft.id);
    setSaving(false);
    if (error) alert(`Save failed: ${error.message}`); else alert('Saved');
  };

  const sendTest = async () => {
    if (!testTo) return;
    setTestStatus('Sending...');
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-email`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId: draft.id, senderId: draft.default_sender_id, toEmail: testTo, testMode: true }),
      });
      const json = await res.json();
      setTestStatus(res.ok ? `Sent (${json.messageId || 'ok'})` : `Failed: ${JSON.stringify(json)}`);
    } catch (e) { setTestStatus(`Error: ${e instanceof Error ? e.message : e}`); }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(`{{${code}}}`).then(() => {
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1200);
    });
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">&larr;</button>
          <div>
            <input
              value={draft.name}
              onChange={e => setDraft({ ...draft, name: e.target.value })}
              className="text-lg font-bold text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-gray-300"
            />
            <div className="text-xs text-gray-500 mt-0.5">{draft.template_key}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.is_active} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />
            Active
          </label>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </Card>

      <Card className="p-0">
        <div className="flex gap-0 border-b border-gray-200 px-4">
          {(['visual', 'code', 'preview'] as Mode[]).map(m => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={`px-4 py-3 text-sm font-medium capitalize border-b-2 -mb-px ${mode === m ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
              {m === 'visual' ? 'Visual' : m === 'code' ? '</> Code' : 'Preview'}
            </button>
          ))}
        </div>

        <div className="p-4">
          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">Subject</label>
            <input
              value={draft.subject}
              onChange={e => setDraft({ ...draft, subject: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
          </div>

          <div className="mb-3">
            <label className="block text-xs font-semibold text-gray-600 mb-1">From sender</label>
            <select
              value={draft.default_sender_id || ''}
              onChange={e => setDraft({ ...draft, default_sender_id: e.target.value || null })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">-- none --</option>
              {senders.map(s => <option key={s.id} value={s.id}>{s.from_name} &lt;{s.from_email}&gt;</option>)}
            </select>
          </div>

          {mode === 'visual' && (
            <VisualBuilder
              html={draft.html_body}
              onHtmlChange={(html) => setDraft({ ...draft, html_body: html })}
            />
          )}

          {mode === 'code' && (
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_240px] gap-4">
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">HTML Body</label>
                  <textarea
                    value={draft.html_body}
                    onChange={e => setDraft({ ...draft, html_body: e.target.value })}
                    className="w-full h-80 border border-gray-300 rounded-md px-3 py-2 text-xs font-mono"
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
              <div>
                <div className="text-xs font-bold uppercase text-gray-500 mb-2">Available Shortcodes</div>
                <div className="text-[11px] text-gray-500 mb-2">Click to copy, paste into editor</div>
                <div className="space-y-1 max-h-96 overflow-auto">
                  {SHORTCODES.map(s => (
                    <button
                      key={s.code}
                      onClick={() => copyCode(s.code)}
                      className="w-full text-left text-xs px-2 py-1.5 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 font-mono"
                      title={s.desc}
                    >
                      {copiedCode === s.code ? 'copied!' : `{{${s.code}}}`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {mode === 'preview' && (
            <div className="bg-gray-100 p-6 rounded">
              <div className="text-xs text-gray-500 mb-2">Subject: <strong>{renderPreview(draft.subject)}</strong></div>
              <div className="bg-white rounded shadow-sm" dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="text-sm font-semibold text-gray-700 mb-2">Send test email</div>
          <div className="flex gap-2">
            <input
              value={testTo}
              onChange={e => setTestTo(e.target.value)}
              placeholder="recipient@example.com"
              className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm"
            />
            <Button size="sm" onClick={sendTest}>Send test</Button>
          </div>
          {testStatus && <div className="mt-2 text-xs text-gray-600">{testStatus}</div>}
          <div className="text-xs text-gray-500 mt-2">Uses sample data. Delivered via Resend.</div>
        </div>
      </Card>
    </div>
  );
};

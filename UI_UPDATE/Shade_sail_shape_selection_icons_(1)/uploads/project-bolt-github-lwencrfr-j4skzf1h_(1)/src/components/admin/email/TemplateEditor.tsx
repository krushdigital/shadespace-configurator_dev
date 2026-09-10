import React, { useState, useMemo, useEffect } from 'react';
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

function renderPreview(html: string, sender?: EmailSender): string {
  const sample: Record<string, string> = {
    first_name: 'Alex', applicant_name: 'Alex Sample', email: 'alex@example.com',
    quote_reference: 'QT-2026-0042', quote_name: 'Backyard sail',
    current_step_label: 'Review', resume_url: '#', pdf_url: '#',
    price: '1,299', currency: 'NZD', country: 'NZ',
    fabric_type: 'Shadetex 320', fabric_color: 'Charcoal', corners: '4',
    days_since_saved: '2',
    sender_first_name: sender?.signature_name || 'Team',
    support_phone: sender?.signature_phone || '',
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
  const [pdfTemplates, setPdfTemplates] = useState<{ id: string; name: string; is_active: boolean }[]>([]);

  useEffect(() => {
    supabase.from('pdf_templates').select('id, name, is_active').order('name').then(({ data }) => {
      setPdfTemplates(data || []);
    });
  }, []);

  const selectedPdfTemplateMissing = !!draft.pdf_template_id && pdfTemplates.length > 0 && !pdfTemplates.find(p => p.id === draft.pdf_template_id);

  const activeSender = useMemo(
    () => senders.find(s => s.id === draft.default_sender_id) || senders.find(s => s.is_default) || senders[0],
    [senders, draft.default_sender_id],
  );

  const transformForPreview = (html: string): string => {
    let out = html;
    if (draft.include_header === false) {
      out = out.replace(/<!--\s*HEADER_BANNER_START\s*-->[\s\S]*?<!--\s*HEADER_BANNER_END\s*-->/g, '');
    }
    if (draft.include_signature) {
      const sigHtml = (activeSender?.signature_html && activeSender.signature_html.trim())
        || (activeSender?.signature_name || activeSender?.signature_phone
          ? `<div style="margin-top:24px;padding-top:16px;border-top:1px solid #e5e7eb;font-size:14px;line-height:1.5;color:#374151;">${[activeSender?.signature_name ? `<strong>${activeSender.signature_name}</strong>` : '', activeSender?.signature_phone || ''].filter(Boolean).join('<br>')}</div>`
          : '');
      if (sigHtml) {
        const anchor = /(<p[^>]*>\s*-\s*(?:\{\{\s*sender_first_name\s*\}\}|[A-Za-z][A-Za-z .'-]{0,40})\s*<\/p>)/i;
        if (anchor.test(out)) out = out.replace(anchor, `$1${sigHtml}`);
        else if (out.includes('</body>')) out = out.replace('</body>', `${sigHtml}</body>`);
        else out = out + sigHtml;
      }
    }
    return out;
  };

  const previewHtml = useMemo(
    () => renderPreview(transformForPreview(draft.html_body), activeSender),
    [draft.html_body, draft.include_header, draft.include_signature, activeSender?.id, activeSender?.signature_html, activeSender?.signature_name, activeSender?.signature_phone],
  );

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
      include_header: draft.include_header ?? true,
      include_signature: draft.include_signature ?? false,
      attach_pdf: draft.attach_pdf ?? false,
      pdf_template_id: draft.pdf_template_id ?? null,
      pdf_filename_pattern: draft.pdf_filename_pattern ?? null,
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

          <div className="mb-4 p-3 border border-gray-200 rounded-md bg-gray-50">
            <div className="flex items-center justify-between mb-2">
              <div className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Styling</div>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, include_header: false, include_signature: true })}
                className="text-xs px-2.5 py-1 rounded border border-gray-300 bg-white text-gray-700 hover:bg-gray-100"
                title="Strip the branded banner and append the sender signature"
              >
                Make it feel personal
              </button>
            </div>
            <div className="space-y-2">
              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={draft.include_header !== false}
                  onChange={e => setDraft({ ...draft, include_header: e.target.checked })}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Include branded header banner</span>
                  <span className="block text-xs text-gray-500">Uncheck to strip the dark banner and logo so the email reads like a personal message.</span>
                </span>
              </label>
              <label className="flex items-start gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={!!draft.include_signature}
                  onChange={e => setDraft({ ...draft, include_signature: e.target.checked })}
                  className="mt-0.5"
                />
                <span>
                  <span className="font-medium">Append sender signature</span>
                  <span className="block text-xs text-gray-500">
                    Uses the signature HTML from the selected sender. {activeSender?.signature_html ? 'Signature is set.' : 'No signature HTML configured on this sender yet.'}
                  </span>
                </span>
              </label>
              {draft.include_signature && !activeSender?.signature_html && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">
                  Add "Signature HTML" on this sender in the Senders tab, or the signature will fall back to the plain name/phone fields.
                </p>
              )}
              {draft.include_signature && (
                <p className="text-[11px] text-gray-500">
                  Heads up: if Codetwo also appends a signature for this sender, turn this off to avoid duplicates.
                </p>
              )}
            </div>
          </div>

          <div className="mb-4 p-3 border border-blue-200 rounded-md bg-blue-50">
            <div className="text-xs font-semibold text-blue-900 uppercase tracking-wide mb-2">PDF attachment</div>
            <label className="flex items-start gap-2 text-sm text-gray-800 mb-3">
              <input
                type="checkbox"
                checked={!!draft.attach_pdf}
                onChange={e => setDraft({ ...draft, attach_pdf: e.target.checked })}
                className="mt-0.5"
              />
              <span>
                <span className="font-medium">Attach a PDF to this email</span>
                <span className="block text-xs text-gray-500">When enabled, the chosen PDF design is attached using the customer's quote data.</span>
              </span>
            </label>

            {draft.attach_pdf && (
              <div className="space-y-2 pl-6">
                <div>
                  <label className="block text-[11px] font-medium text-blue-900 mb-1">PDF template</label>
                  <select
                    value={draft.pdf_template_id || ''}
                    onChange={e => setDraft({ ...draft, pdf_template_id: e.target.value || null })}
                    className="w-full border border-blue-300 rounded-md px-2 py-1.5 text-sm bg-white"
                  >
                    <option value="">Use currently active PDF template</option>
                    {pdfTemplates.map(p => (
                      <option key={p.id} value={p.id}>{p.name}{p.is_active ? ' (active)' : ''}</option>
                    ))}
                  </select>
                  {!draft.pdf_template_id ? (
                    <p className="text-[11px] text-blue-800/80 mt-1">Will use whichever PDF template is marked active in PDF Studio.</p>
                  ) : (
                    <p className="text-[11px] text-blue-800/80 mt-1">This email will always render with the chosen design, even if the active design changes.</p>
                  )}
                  {selectedPdfTemplateMissing && (
                    <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1.5 mt-1">
                      The selected PDF template no longer exists. Pick another or clear this to fall back to the active template.
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-blue-900 mb-1">Filename pattern</label>
                  <input
                    type="text"
                    value={draft.pdf_filename_pattern || ''}
                    onChange={e => setDraft({ ...draft, pdf_filename_pattern: e.target.value })}
                    placeholder="ShadeSpace-Quote-{quote_reference}.pdf"
                    className="w-full border border-blue-300 rounded-md px-2 py-1.5 text-sm bg-white font-mono"
                  />
                  <p className="text-[11px] text-blue-800/80 mt-1">Available tokens: {'{quote_reference}'}, {'{quote_name}'}, {'{customer_first_name}'}, {'{customer_last_name}'}.</p>
                </div>
              </div>
            )}
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
            <div className="bg-[#f3f4f6] p-6 rounded">
              <div className="text-xs text-gray-500 mb-3">Subject: <strong>{renderPreview(draft.subject, activeSender)}</strong></div>
              <div className="mx-auto bg-white border border-gray-200 rounded overflow-hidden" style={{ maxWidth: 640 }} dangerouslySetInnerHTML={{ __html: previewHtml }} />
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

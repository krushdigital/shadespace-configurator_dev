import React, { useState, useEffect } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../lib/supabase';
import { getAdminAuthHeaders } from '../../../utils/adminAuth';
import type { EmailAutomation, EmailTemplate, EmailSender } from '../EmailStudio';

interface Condition {
  id?: string;
  automation_id?: string;
  field: string;
  operator: 'eq' | 'neq' | 'gte' | 'lte' | 'contains' | 'in';
  value: string;
}

const STEP_LABELS = ['Dimensions', 'Corners', 'Fixing Points', 'Diagonals', 'Fabric', 'Colour', 'Review'];

export const AutomationEditor: React.FC<{ automation: EmailAutomation; templates: EmailTemplate[]; senders: EmailSender[]; onBack: () => void }> = ({ automation, templates, senders, onBack }) => {
  const [draft, setDraft] = useState<EmailAutomation>(automation);
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [saving, setSaving] = useState(false);
  const [dryRun, setDryRun] = useState<any>(null);

  useEffect(() => {
    supabase.from('email_automation_conditions').select('*').eq('automation_id', automation.id).then(({ data }) => {
      setConditions(data || []);
    });
  }, [automation.id]);

  const save = async () => {
    setSaving(true);
    const wasActive = automation.is_active;
    const nowActive = draft.is_active;
    const { data: { user } } = await supabase.auth.getUser();
    const auditPatch: Record<string, unknown> = {};
    if (wasActive !== nowActive) {
      if (nowActive) {
        auditPatch.paused_at = null;
        auditPatch.paused_by = null;
      } else {
        auditPatch.paused_at = new Date().toISOString();
        auditPatch.paused_by = user?.id || null;
      }
    }
    const { error } = await supabase.from('email_automations').update({
      name: draft.name,
      description: draft.description,
      is_active: draft.is_active,
      trigger_type: draft.trigger_type,
      trigger_config: draft.trigger_config,
      delay_minutes: draft.delay_minutes,
      template_id: draft.template_id,
      sender_id: draft.sender_id,
      max_sends_per_quote: draft.max_sends_per_quote,
      max_sends_per_email: draft.max_sends_per_email,
      cooldown_days: draft.cooldown_days,
      suppress_if_purchased: draft.suppress_if_purchased,
      respect_exclusions: draft.respect_exclusions,
      ...auditPatch,
    }).eq('id', draft.id);

    await supabase.from('email_automation_conditions').delete().eq('automation_id', draft.id);
    if (conditions.length) {
      await supabase.from('email_automation_conditions').insert(conditions.map(c => ({
        automation_id: draft.id,
        field: c.field,
        operator: c.operator,
        value: c.value,
      })));
    }
    setSaving(false);
    if (error) alert(`Save failed: ${error.message}`); else alert('Saved');
  };

  const runDryRun = async () => {
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-email-automations`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ dryRun: true, automationId: draft.id }),
      });
      const json = await res.json();
      setDryRun(json);
    } catch (e) { alert(`Dry run failed: ${e instanceof Error ? e.message : e}`); }
  };

  const cfg = draft.trigger_config || {};

  const summary = () => {
    const tpl = templates.find(t => t.id === draft.template_id)?.name || '(no template)';
    const snd = senders.find(s => s.id === draft.sender_id)?.from_name || '(no sender)';
    const delay = draft.delay_minutes < 60 ? `${draft.delay_minutes} min` : draft.delay_minutes < 1440 ? `${Math.round(draft.delay_minutes / 60)} hours` : `${Math.round(draft.delay_minutes / 1440)} days`;
    const trigger = draft.trigger_type === 'quote_reached_step' ? `when a quote reaches step ${STEP_LABELS[cfg.step] || cfg.step + 1}${cfg.status ? ` with status ${cfg.status}` : ''}` : draft.trigger_type === 'pdf_downloaded' ? `after a PDF is downloaded` : draft.trigger_type;
    const condsSummary = conditions.length ? ` where ${conditions.map(c => `${c.field} ${c.operator} ${c.value}`).join(' AND ')}` : '';
    return `${trigger}${condsSummary}, wait ${delay}, send "${tpl}" from ${snd}`;
  };

  return (
    <div className="space-y-4">
      <Card className="p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-gray-500 hover:text-gray-700">&larr;</button>
          <input
            value={draft.name}
            onChange={e => setDraft({ ...draft, name: e.target.value })}
            className="text-lg font-bold text-gray-900 bg-transparent outline-none border-b border-transparent focus:border-gray-300"
          />
        </div>
        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={draft.is_active} onChange={e => setDraft({ ...draft, is_active: e.target.checked })} />
            Active
          </label>
          <Button size="sm" variant="outline" onClick={runDryRun}>Dry run</Button>
          <Button size="sm" onClick={save} disabled={saving}>{saving ? 'Saving...' : 'Save'}</Button>
        </div>
      </Card>

      <Card className="p-4 bg-blue-50 border-blue-200">
        <div className="text-sm text-blue-900"><strong>Summary:</strong> {summary()}</div>
      </Card>

      <Card className="p-4 space-y-4">
        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">1. Trigger</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Trigger type</label>
              <select
                value={draft.trigger_type}
                onChange={e => setDraft({ ...draft, trigger_type: e.target.value })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="quote_saved">Quote saved</option>
                <option value="quote_reached_step">Quote reached specific step</option>
                <option value="quote_idle">Quote idle (no activity)</option>
                <option value="pdf_downloaded">PDF downloaded</option>
                <option value="cart_not_completed">Added to cart but not purchased</option>
                <option value="email_clicked">Email link clicked</option>
              </select>
            </div>
            {draft.trigger_type === 'quote_reached_step' && (
              <>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Step</label>
                  <select
                    value={cfg.step ?? 0}
                    onChange={e => setDraft({ ...draft, trigger_config: { ...cfg, step: Number(e.target.value) } })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  >
                    {STEP_LABELS.map((l, i) => <option key={i} value={i}>{i + 1}. {l}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Status filter</label>
                  <select
                    value={cfg.status || ''}
                    onChange={e => setDraft({ ...draft, trigger_config: { ...cfg, status: e.target.value || undefined } })}
                    className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                  >
                    <option value="">Any</option>
                    <option value="in_progress">In progress</option>
                    <option value="quote_ready">Quote ready</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </>
            )}
            {draft.trigger_type === 'pdf_downloaded' && (
              <div>
                <label className="text-xs text-gray-500 block mb-1">Hours since download</label>
                <input
                  type="number"
                  value={cfg.hours_since ?? 48}
                  onChange={e => setDraft({ ...draft, trigger_config: { ...cfg, hours_since: Number(e.target.value) } })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
              </div>
            )}
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">2. Additional filters (AND)</h3>
          <div className="space-y-2">
            {conditions.map((c, i) => (
              <div key={i} className="flex gap-2 items-center">
                <input
                  placeholder="field (e.g. customer_country)"
                  value={c.field}
                  onChange={e => setConditions(cs => cs.map((x, j) => j === i ? { ...x, field: e.target.value } : x))}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs"
                />
                <select
                  value={c.operator}
                  onChange={e => setConditions(cs => cs.map((x, j) => j === i ? { ...x, operator: e.target.value as any } : x))}
                  className="border border-gray-300 rounded px-2 py-1.5 text-xs"
                >
                  <option value="eq">=</option>
                  <option value="neq">!=</option>
                  <option value="gte">&gt;=</option>
                  <option value="lte">&lt;=</option>
                  <option value="contains">contains</option>
                  <option value="in">in (comma)</option>
                </select>
                <input
                  placeholder="value"
                  value={c.value}
                  onChange={e => setConditions(cs => cs.map((x, j) => j === i ? { ...x, value: e.target.value } : x))}
                  className="flex-1 border border-gray-300 rounded px-2 py-1.5 text-xs"
                />
                <button onClick={() => setConditions(cs => cs.filter((_, j) => j !== i))} className="text-red-500 text-xs">x</button>
              </div>
            ))}
            <button
              onClick={() => setConditions([...conditions, { field: '', operator: 'eq', value: '' }])}
              className="text-xs text-blue-600 hover:underline"
            >+ Add filter</button>
          </div>
        </div>

        <div>
          <h3 className="text-sm font-bold text-gray-700 mb-2">3. Action</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-gray-500 block mb-1">Template</label>
              <select
                value={draft.template_id || ''}
                onChange={e => setDraft({ ...draft, template_id: e.target.value || null })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="">-- none --</option>
                {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
              {(() => {
                const tpl = templates.find(t => t.id === draft.template_id);
                if (!tpl || !tpl.attach_pdf) return null;
                const pattern = tpl.pdf_filename_pattern || 'ShadeSpace-Quote-{quote_reference}.pdf';
                const designLabel = tpl.pdf_template_id ? 'a specific PDF design' : 'the active PDF template';
                return (
                  <p className="text-[11px] text-blue-700 bg-blue-50 border border-blue-200 rounded px-2 py-1.5 mt-1">
                    Will attach {designLabel} as <span className="font-mono">{pattern}</span>. Edit on the template itself.
                  </p>
                );
              })()}
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Sender</label>
              <select
                value={draft.sender_id || ''}
                onChange={e => setDraft({ ...draft, sender_id: e.target.value || null })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              >
                <option value="">-- default --</option>
                {senders.map(s => <option key={s.id} value={s.id}>{s.from_name} &lt;{s.from_email}&gt;</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Delay (minutes)</label>
              <input
                type="number"
                value={draft.delay_minutes}
                onChange={e => setDraft({ ...draft, delay_minutes: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max sends per quote</label>
              <input
                type="number"
                value={draft.max_sends_per_quote}
                onChange={e => setDraft({ ...draft, max_sends_per_quote: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Max sends per email (across all quotes)</label>
              <input
                type="number"
                value={draft.max_sends_per_email ?? ''}
                onChange={e => setDraft({ ...draft, max_sends_per_email: e.target.value ? Number(e.target.value) : null })}
                placeholder="No limit"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Caps total sends to a unique email regardless of how many configs they save</p>
            </div>
            <div>
              <label className="text-xs text-gray-500 block mb-1">Cooldown (days)</label>
              <input
                type="number"
                value={draft.cooldown_days ?? ''}
                onChange={e => setDraft({ ...draft, cooldown_days: e.target.value ? Number(e.target.value) : null })}
                placeholder="No cooldown"
                className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
              />
              <p className="text-[10px] text-gray-400 mt-0.5">Skip if any automation email was sent to this address within N days</p>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.suppress_if_purchased !== false}
                  onChange={e => setDraft({ ...draft, suppress_if_purchased: e.target.checked })}
                />
                Suppress if customer has placed a Shopify order
              </label>
              <p className="text-[10px] text-gray-400 ml-6">Customers who have purchased will not receive this automation</p>
            </div>
            <div className="md:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={draft.respect_exclusions}
                  onChange={e => setDraft({ ...draft, respect_exclusions: e.target.checked })}
                />
                Respect "Exclude Internal" flag (skip excluded quotes)
              </label>
            </div>
          </div>
        </div>

        {dryRun && (
          <div className="bg-gray-50 border border-gray-200 rounded p-3 text-xs">
            <div className="font-semibold mb-1">Dry run result:</div>
            <pre className="overflow-auto">{JSON.stringify(dryRun, null, 2)}</pre>
          </div>
        )}
      </Card>
    </div>
  );
};

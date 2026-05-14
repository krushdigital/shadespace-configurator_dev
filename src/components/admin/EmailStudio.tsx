import React, { useEffect, useState, useCallback } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getAdminAuthHeaders } from '../../utils/adminAuth';
import { supabase } from '../../lib/supabase';
import { TemplateEditor } from './email/TemplateEditor';
import { AutomationEditor } from './email/AutomationEditor';
import { EmailAnalytics } from './email/EmailAnalytics';
import { SendersManager } from './email/SendersManager';
import { TransactionalTemplates } from './email/TransactionalTemplates';
import { ToggleSwitch } from '../ui/ToggleSwitch';

type SubTab = 'transactional' | 'templates' | 'automations' | 'senders' | 'analytics';

interface EmailStudioProps {
  dateRange: { start: string; end: string };
  excludeInternal?: boolean;
  timezone?: string;
  isSuperAdmin?: boolean;
  onOpenPdfStudio?: () => void;
}

export interface EmailTemplate {
  id: string;
  template_key: string;
  name: string;
  description: string;
  subject: string;
  html_body: string;
  text_body: string;
  design_json: any;
  default_sender_id: string | null;
  is_active: boolean;
  updated_at: string;
  transactional?: boolean;
  include_header?: boolean;
  include_signature?: boolean;
  attach_pdf?: boolean;
  pdf_template_id?: string | null;
  pdf_filename_pattern?: string | null;
}

export interface EmailSender {
  id: string;
  label: string;
  from_name: string;
  from_email: string;
  reply_to: string | null;
  signature_name: string | null;
  signature_phone: string | null;
  signature_html: string | null;
  is_default: boolean;
  is_verified: boolean;
}

export interface EmailAutomation {
  id: string;
  name: string;
  description: string;
  is_active: boolean;
  trigger_type: string;
  trigger_config: any;
  delay_minutes: number;
  template_id: string | null;
  sender_id: string | null;
  max_sends_per_quote: number;
  respect_exclusions: boolean;
}

export const EmailStudio: React.FC<EmailStudioProps> = ({ dateRange, excludeInternal, timezone, isSuperAdmin = false, onOpenPdfStudio }) => {
  const [sub, setSub] = useState<SubTab>('transactional');
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [senders, setSenders] = useState<EmailSender[]>([]);
  const [automations, setAutomations] = useState<EmailAutomation[]>([]);
  const [editingTemplate, setEditingTemplate] = useState<EmailTemplate | null>(null);
  const [editingAutomation, setEditingAutomation] = useState<EmailAutomation | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    const [{ data: t }, { data: s }, { data: a }] = await Promise.all([
      supabase.from('email_templates').select('*').order('name'),
      supabase.from('email_senders').select('*').order('is_default', { ascending: false }),
      supabase.from('email_automations').select('*').order('name'),
    ]);
    setTemplates(t || []);
    setSenders(s || []);
    setAutomations(a || []);
    setLoading(false);
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const [health, setHealth] = useState<{ lastRun: string | null; pending: number; failed: number; keyConfigured: boolean } | null>(null);

  const loadHealth = useCallback(async () => {
    const [{ data: cron }, { count: pending }, { count: failed }, { data: cfg }] = await Promise.all([
      supabase.from('cron_run_log').select('ran_at, status').order('ran_at', { ascending: false }).limit(1),
      supabase.from('email_queue').select('id', { count: 'exact', head: true }).in('status', ['pending', 'sending']),
      supabase.from('email_queue').select('id', { count: 'exact', head: true }).eq('status', 'failed'),
      supabase.from('email_pipeline_config').select('service_role_key').maybeSingle(),
    ]);
    setHealth({
      lastRun: cron?.[0]?.ran_at || null,
      pending: pending || 0,
      failed: failed || 0,
      keyConfigured: !!cfg?.service_role_key,
    });
  }, []);

  useEffect(() => { loadHealth(); const i = setInterval(loadHealth, 30000); return () => clearInterval(i); }, [loadHealth]);

  const pauseAll = async () => {
    if (!confirm('Pause every automation? No emails will be sent until you re-enable them.')) return;
    const { data: { user } } = await supabase.auth.getUser();
    await supabase.from('email_automations').update({
      is_active: false,
      paused_at: new Date().toISOString(),
      paused_by: user?.id || null,
    }).neq('id', '00000000-0000-0000-0000-000000000000');
    refresh();
  };

  const runEvaluatorNow = async () => {
    try {
      const headers = await getAdminAuthHeaders();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/evaluate-email-automations`;
      const res = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' });
      const json = await res.json();
      alert(`Evaluator: ${JSON.stringify(json)}`);
    } catch (e) { alert(`Evaluator failed: ${e instanceof Error ? e.message : e}`); }
  };

  const processQueueNow = async () => {
    try {
      const headers = await getAdminAuthHeaders();
      const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/process-email-queue`;
      const res = await fetch(url, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: '{}' });
      const json = await res.json();
      alert(`Queue: ${JSON.stringify(json)}`);
    } catch (e) { alert(`Queue run failed: ${e instanceof Error ? e.message : e}`); }
  };

  if (editingTemplate) {
    return <TemplateEditor template={editingTemplate} senders={senders} onBack={() => { setEditingTemplate(null); refresh(); }} />;
  }
  if (editingAutomation) {
    return <AutomationEditor automation={editingAutomation} templates={templates} senders={senders} onBack={() => { setEditingAutomation(null); refresh(); }} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Email Studio</h1>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => { runEvaluatorNow(); loadHealth(); }}>Run evaluator</Button>
          <Button size="sm" variant="outline" onClick={() => { processQueueNow(); loadHealth(); }}>Process queue</Button>
          <Button size="sm" variant="outline" onClick={pauseAll} className="text-red-600 border-red-300">Pause all</Button>
        </div>
      </div>

      {health && (
        <Card className="p-3">
          <div className="flex flex-wrap items-center gap-4 text-xs">
            <Dot ok={health.keyConfigured} label={health.keyConfigured ? 'Scheduler key set' : 'Scheduler key missing'} />
            <Dot
              ok={!!health.lastRun && Date.now() - new Date(health.lastRun).getTime() < 15 * 60_000}
              label={health.lastRun ? `Last cron ${new Date(health.lastRun).toLocaleString()}` : 'Cron has not run yet'}
            />
            <span className="text-gray-600">Pending queue: <strong className="text-gray-900">{health.pending}</strong></span>
            <span className={health.failed > 0 ? 'text-red-600' : 'text-gray-600'}>Failed: <strong>{health.failed}</strong></span>
          </div>
        </Card>
      )}

      <div className="flex gap-1 border-b border-gray-200">
        {(['transactional', 'templates', 'automations', 'senders', 'analytics'] as SubTab[]).map(s => (
          <button
            key={s}
            onClick={() => setSub(s)}
            className={`px-4 py-2 text-sm font-medium capitalize border-b-2 -mb-px transition-colors ${
              sub === s ? 'border-lime-500 text-lime-700' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading && <div className="p-6 text-sm text-gray-500">Loading...</div>}

      {!loading && sub === 'transactional' && <TransactionalTemplates senders={senders} isSuperAdmin={isSuperAdmin} onOpenPdfStudio={onOpenPdfStudio} />}

      {!loading && sub === 'templates' && (
        <TemplatesList
          templates={templates}
          onEdit={setEditingTemplate}
          onCreate={async () => {
            const { data } = await supabase.from('email_templates').insert({
              template_key: `new_template_${Date.now()}`,
              name: 'Untitled Template',
              subject: 'New subject',
              default_sender_id: senders.find(s => s.is_default)?.id ?? senders[0]?.id ?? null,
            }).select().single();
            if (data) setEditingTemplate(data);
          }}
          onRefresh={refresh}
        />
      )}

      {!loading && sub === 'automations' && (
        <AutomationsList
          automations={automations}
          templates={templates}
          senders={senders}
          onEdit={setEditingAutomation}
          onCreate={async () => {
            const { data } = await supabase.from('email_automations').insert({
              name: 'Untitled Automation',
              trigger_type: 'quote_reached_step',
              trigger_config: { step: 0, status: 'in_progress' },
              delay_minutes: 60,
              sender_id: senders.find(s => s.is_default)?.id ?? null,
              template_id: templates[0]?.id ?? null,
            }).select().single();
            if (data) setEditingAutomation(data);
          }}
          onRefresh={refresh}
        />
      )}

      {!loading && sub === 'senders' && <SendersManager senders={senders} onRefresh={refresh} />}

      {!loading && sub === 'analytics' && <EmailAnalytics dateRange={dateRange} excludeInternal={excludeInternal} timezone={timezone} />}
    </div>
  );
};

const Dot: React.FC<{ ok: boolean; label: string }> = ({ ok, label }) => (
  <span className="inline-flex items-center gap-1.5">
    <span className={`inline-block w-2 h-2 rounded-full ${ok ? 'bg-green-500' : 'bg-red-500'}`} />
    <span className={ok ? 'text-gray-700' : 'text-red-700'}>{label}</span>
  </span>
);

const TemplatesList: React.FC<{ templates: EmailTemplate[]; onEdit: (t: EmailTemplate) => void; onCreate: () => void; onRefresh: () => void }> = ({ templates, onEdit, onCreate, onRefresh }) => (
  <Card className="p-0 overflow-hidden">
    <div className="flex items-center justify-between p-4 border-b border-gray-200">
      <h2 className="font-semibold text-gray-900">Templates</h2>
      <Button size="sm" onClick={onCreate}>New template</Button>
    </div>
    <div className="divide-y divide-gray-100">
      {templates.map(t => (
        <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer" onClick={() => onEdit(t)}>
          <div>
            <div className="font-medium text-gray-900">{t.name}</div>
            <div className="text-xs text-gray-500 mt-0.5">{t.template_key} - {t.subject}</div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-xs px-2 py-0.5 rounded-full ${t.is_active ? 'bg-green-50 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
              {t.is_active ? 'Active' : 'Draft'}
            </span>
            <button
              onClick={(e) => { e.stopPropagation(); if (confirm('Delete template?')) supabase.from('email_templates').delete().eq('id', t.id).then(onRefresh); }}
              className="text-xs text-red-600 hover:underline"
            >Delete</button>
          </div>
        </div>
      ))}
      {templates.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No templates yet.</div>}
    </div>
  </Card>
);

const AutomationsList: React.FC<{ automations: EmailAutomation[]; templates: EmailTemplate[]; senders: EmailSender[]; onEdit: (a: EmailAutomation) => void; onCreate: () => void; onRefresh: () => void }> = ({ automations, templates, senders, onEdit, onCreate, onRefresh }) => {
  const summary = (a: EmailAutomation) => {
    const tpl = templates.find(t => t.id === a.template_id)?.name || '(no template)';
    const snd = senders.find(s => s.id === a.sender_id)?.from_name || '(default sender)';
    const cfg = a.trigger_config || {};
    const stepLabels = ['Fabric & Colour', 'Style', 'Corners', 'Measurement options', 'Dimensions', 'Heights & Anchor Points', 'Review'];
    const trig = a.trigger_type === 'quote_reached_step'
      ? `when a quote reaches step ${cfg.step + 1} (${stepLabels[cfg.step] || '?'})${cfg.status ? ` with status ${cfg.status}` : ''}`
      : a.trigger_type === 'pdf_downloaded'
      ? `${cfg.hours_since || 48}h after a PDF download`
      : a.trigger_type;
    const delayTxt = a.delay_minutes < 60 ? `${a.delay_minutes} min` : a.delay_minutes < 1440 ? `${Math.round(a.delay_minutes / 60)}h` : `${Math.round(a.delay_minutes / 1440)}d`;
    return `${trig}, wait ${delayTxt}, send "${tpl}" from ${snd}`;
  };

  const toggle = async (a: EmailAutomation) => {
    const nextActive = !a.is_active;
    const { data: { user } } = await supabase.auth.getUser();
    const patch = nextActive
      ? { is_active: true, paused_at: null, paused_by: null }
      : { is_active: false, paused_at: new Date().toISOString(), paused_by: user?.id || null };
    await supabase.from('email_automations').update(patch).eq('id', a.id);
    onRefresh();
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Automations</h2>
        <Button size="sm" onClick={onCreate}>New automation</Button>
      </div>
      <div className="divide-y divide-gray-100">
        {automations.map(a => {
          const linkedTpl = templates.find(t => t.id === a.template_id);
          const templatePaused = linkedTpl && linkedTpl.is_active === false;
          return (
          <div key={a.id} className="flex items-start justify-between p-4 hover:bg-gray-50">
            <div className="flex-1 cursor-pointer" onClick={() => onEdit(a)}>
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-medium text-gray-900">{a.name}</div>
                {templatePaused && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-50 text-red-700 font-medium" title="The linked email template is paused — this automation will not send.">
                    Template paused
                  </span>
                )}
              </div>
              <div className="text-xs text-gray-600 mt-1">{summary(a)}</div>
            </div>
            <div className="flex items-center gap-3" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${a.is_active ? 'text-green-700' : 'text-gray-500'}`}>
                  {a.is_active ? 'Active' : 'Paused'}
                </span>
                <ToggleSwitch
                  enabled={a.is_active}
                  onChange={() => toggle(a)}
                  onLabel="Active"
                  offLabel="Paused"
                />
              </div>
              <button
                onClick={() => { if (confirm('Delete automation?')) supabase.from('email_automations').delete().eq('id', a.id).then(onRefresh); }}
                className="text-xs text-red-600 hover:underline"
              >Delete</button>
            </div>
          </div>
          );
        })}
        {automations.length === 0 && <div className="p-6 text-center text-sm text-gray-500">No automations yet.</div>}
      </div>
    </Card>
  );
};

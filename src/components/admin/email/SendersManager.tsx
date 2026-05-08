import React, { useState } from 'react';
import { Card } from '../../ui/Card';
import { Button } from '../../ui/Button';
import { supabase } from '../../../lib/supabase';
import type { EmailSender } from '../EmailStudio';

export const SendersManager: React.FC<{ senders: EmailSender[]; onRefresh: () => void }> = ({ senders, onRefresh }) => {
  const [editing, setEditing] = useState<Partial<EmailSender> | null>(null);

  const save = async () => {
    if (!editing) return;
    const payload = {
      label: editing.label || '',
      from_name: editing.from_name || '',
      from_email: editing.from_email || '',
      reply_to: editing.reply_to || null,
      signature_name: editing.signature_name || null,
      signature_phone: editing.signature_phone || null,
      is_default: editing.is_default || false,
      is_verified: editing.is_verified || false,
    };
    if (editing.is_default) {
      await supabase.from('email_senders').update({ is_default: false }).neq('id', editing.id || '00000000-0000-0000-0000-000000000000');
    }
    if (editing.id) {
      await supabase.from('email_senders').update(payload).eq('id', editing.id);
    } else {
      await supabase.from('email_senders').insert(payload);
    }
    setEditing(null);
    onRefresh();
  };

  return (
    <Card className="p-0 overflow-hidden">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="font-semibold text-gray-900">Senders</h2>
        <Button size="sm" onClick={() => setEditing({ is_default: false, is_verified: false })}>New sender</Button>
      </div>

      <div className="divide-y divide-gray-100">
        {senders.map(s => (
          <div key={s.id} className="flex items-center justify-between p-4 hover:bg-gray-50 cursor-pointer" onClick={() => setEditing(s)}>
            <div>
              <div className="font-medium text-gray-900">{s.from_name} &lt;{s.from_email}&gt;</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label} - signs "{s.signature_name || '—'}"</div>
            </div>
            <div className="flex items-center gap-2">
              {s.is_default && <span className="text-xs px-2 py-0.5 rounded bg-blue-50 text-blue-700">Default</span>}
              <span className={`text-xs px-2 py-0.5 rounded ${s.is_verified ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                {s.is_verified ? 'Verified' : 'Unverified'}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); if (confirm('Delete sender?')) supabase.from('email_senders').delete().eq('id', s.id).then(onRefresh); }}
                className="text-xs text-red-600 hover:underline"
              >Delete</button>
            </div>
          </div>
        ))}
      </div>

      {editing && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <div className="bg-white rounded-lg max-w-md w-full p-5 space-y-3" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold">{editing.id ? 'Edit sender' : 'New sender'}</h3>
            {[
              ['label', 'Label (internal)'],
              ['from_name', 'From name (shown to recipient)'],
              ['from_email', 'From email address'],
              ['reply_to', 'Reply-to'],
              ['signature_name', 'Signature first name'],
              ['signature_phone', 'Signature phone'],
            ].map(([k, label]) => (
              <div key={k}>
                <label className="text-xs text-gray-500 block mb-1">{label}</label>
                <input
                  value={(editing as any)[k] || ''}
                  onChange={e => setEditing({ ...editing, [k]: e.target.value })}
                  className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm"
                />
              </div>
            ))}
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_default || false} onChange={e => setEditing({ ...editing, is_default: e.target.checked })} />
              Default sender
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={editing.is_verified || false} onChange={e => setEditing({ ...editing, is_verified: e.target.checked })} />
              Domain verified in Resend
            </label>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(null)}>Cancel</Button>
              <Button size="sm" onClick={save}>Save</Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

import React, { useState } from 'react';

interface CostRow {
  id: string;
  edge_type: string;
  corners: number;
  cost_nzd: number;
}

interface CostTableEditorProps {
  title: string;
  description: string;
  rows: CostRow[];
  onSave: (id: string, cost_nzd: number) => Promise<void>;
  onError: (msg: string) => void;
}

export const CostTableEditor: React.FC<CostTableEditorProps> = ({
  title,
  description,
  rows,
  onSave,
  onError,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [saving, setSaving] = useState(false);

  const webbingRows = rows.filter((r) => r.edge_type === 'webbing').sort((a, b) => a.corners - b.corners);
  const cabledRows = rows.filter((r) => r.edge_type === 'cabled').sort((a, b) => a.corners - b.corners);

  const startEdit = (row: CostRow) => {
    setEditValue(String(row.cost_nzd));
    setEditingId(row.id);
  };

  const handleSave = async () => {
    if (!editingId) return;
    const num = parseFloat(editValue);
    if (isNaN(num) || num < 0) {
      onError('Cost must be a valid positive number');
      return;
    }
    setSaving(true);
    try {
      await onSave(editingId, num);
      setEditingId(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const renderTable = (label: string, data: CostRow[]) => (
    <div>
      <h4 className="text-sm font-semibold text-gray-700 mb-2 capitalize">{label} Edge</h4>
      <div className="overflow-x-auto border border-gray-200 rounded-lg">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left py-3 px-4 font-semibold text-gray-700">Corners</th>
              <th className="text-center py-3 px-4 font-semibold text-gray-700">Cost (NZD)</th>
              <th className="text-right py-3 px-4 font-semibold text-gray-700 w-32">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => {
              const isEditing = editingId === row.id;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 ${isEditing ? 'bg-lime-50/50' : 'hover:bg-gray-50'}`}
                >
                  <td className="py-3 px-4 font-medium text-gray-900">{row.corners} corners</td>
                  <td className="py-3 px-4 text-center">
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-32 px-2 py-1 border border-lime-400 rounded text-center text-sm font-mono focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSave();
                          if (e.key === 'Escape') setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="font-mono text-gray-800">${row.cost_nzd.toFixed(2)}</span>
                    )}
                  </td>
                  <td className="py-3 px-4 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-3 py-1 bg-lime-600 text-white text-xs font-medium rounded hover:bg-lime-700 disabled:opacity-50"
                        >
                          {saving ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                          className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(row)}
                        className="px-3 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded hover:bg-slate-200 transition-colors"
                      >
                        Edit
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <h3 className="text-lg font-semibold text-gray-900 mb-1">{title}</h3>
      <p className="text-sm text-gray-500 mb-4">{description}</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {renderTable('Webbing', webbingRows)}
        {renderTable('Cabled', cabledRows)}
      </div>
    </div>
  );
};

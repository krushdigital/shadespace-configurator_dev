import React, { useState } from 'react';

interface FabricType {
  id: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

interface FabricPricingRow {
  id: string;
  edge_type: string;
  perimeter: number;
  prices: Record<string, number>;
}

interface FabricPricingEditorProps {
  fabricTypes: FabricType[];
  fabricPricing: FabricPricingRow[];
  edgeFilter: 'webbing' | 'cabled';
  onEdgeFilterChange: (edge: 'webbing' | 'cabled') => void;
  onSave: (id: string, prices: Record<string, number>) => Promise<void>;
  onError: (msg: string) => void;
}

export const FabricPricingEditor: React.FC<FabricPricingEditorProps> = ({
  fabricTypes,
  fabricPricing,
  edgeFilter,
  onEdgeFilterChange,
  onSave,
  onError,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrices, setEditPrices] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const activeTypes = fabricTypes.filter((ft) => ft.is_active);
  const filteredRows = fabricPricing
    .filter((r) => r.edge_type === edgeFilter)
    .sort((a, b) => a.perimeter - b.perimeter);

  const startEdit = (row: FabricPricingRow) => {
    const prices: Record<string, string> = {};
    activeTypes.forEach((ft) => {
      prices[ft.id] = String(row.prices[ft.id] ?? 0);
    });
    setEditPrices(prices);
    setEditingId(row.id);
  };

  const handleSave = async () => {
    if (!editingId) return;
    const parsedPrices: Record<string, number> = {};
    for (const [key, val] of Object.entries(editPrices)) {
      const num = parseFloat(val);
      if (isNaN(num) || num < 0) {
        onError(`Invalid price for ${key}`);
        return;
      }
      parsedPrices[key] = num;
    }

    const currentRow = fabricPricing.find((r) => r.id === editingId);
    if (currentRow) {
      const inactiveTypes = fabricTypes.filter((ft) => !ft.is_active);
      inactiveTypes.forEach((ft) => {
        if (currentRow.prices[ft.id] !== undefined) {
          parsedPrices[ft.id] = currentRow.prices[ft.id];
        }
      });
    }

    setSaving(true);
    try {
      await onSave(editingId, parsedPrices);
      setEditingId(null);
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Fabric Pricing (NZD per perimeter)</h3>
          <p className="text-sm text-gray-500">Prices based on total perimeter in meters, by edge type and fabric</p>
        </div>
        <div className="flex bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => { onEdgeFilterChange('webbing'); setEditingId(null); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              edgeFilter === 'webbing' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Webbing Edge
          </button>
          <button
            onClick={() => { onEdgeFilterChange('cabled'); setEditingId(null); }}
            className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
              edgeFilter === 'cabled' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            Cabled Edge
          </button>
        </div>
      </div>

      <div className="text-xs text-gray-500 mb-2">
        Showing {filteredRows.length} rows for {edgeFilter} edge
      </div>

      <div className="overflow-x-auto border border-gray-200 rounded-lg max-h-[600px] overflow-y-auto">
        <table className="w-full text-sm">
          <thead className="sticky top-0 bg-gray-50 z-10">
            <tr className="border-b border-gray-200">
              <th className="text-left py-3 px-3 font-semibold text-gray-700 w-24">Perimeter (m)</th>
              {activeTypes.map((ft) => (
                <th key={ft.id} className="text-center py-3 px-3 font-semibold text-gray-700 min-w-[120px]">
                  {ft.label}
                </th>
              ))}
              <th className="text-right py-3 px-3 font-semibold text-gray-700 w-24">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredRows.map((row) => {
              const isEditing = editingId === row.id;
              return (
                <tr
                  key={row.id}
                  className={`border-b border-gray-100 ${isEditing ? 'bg-lime-50/50' : 'hover:bg-gray-50'}`}
                >
                  <td className="py-2 px-3 font-mono font-medium text-gray-900">{row.perimeter.toFixed(1)}</td>
                  {activeTypes.map((ft) => (
                    <td key={ft.id} className="py-2 px-3 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editPrices[ft.id] || '0'}
                          onChange={(e) =>
                            setEditPrices((prev) => ({ ...prev, [ft.id]: e.target.value }))
                          }
                          className="w-28 px-2 py-1 border border-lime-400 rounded text-center text-sm font-mono focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                        />
                      ) : (
                        <span className="font-mono text-gray-800">
                          {(row.prices[ft.id] ?? 0).toFixed(2)}
                        </span>
                      )}
                    </td>
                  ))}
                  <td className="py-2 px-3 text-right">
                    {isEditing ? (
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={handleSave}
                          disabled={saving}
                          className="px-2 py-1 bg-lime-600 text-white text-xs font-medium rounded hover:bg-lime-700 disabled:opacity-50"
                        >
                          {saving ? '...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          disabled={saving}
                          className="px-2 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(row)}
                        className="px-2 py-1 bg-slate-100 text-slate-700 text-xs font-medium rounded hover:bg-slate-200 transition-colors"
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
};

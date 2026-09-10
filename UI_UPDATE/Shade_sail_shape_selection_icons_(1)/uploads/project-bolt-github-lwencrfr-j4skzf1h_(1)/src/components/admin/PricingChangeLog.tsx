import React, { useState, useEffect } from 'react';
import { getAdminAuthHeaders } from '../../utils/adminAuth';

interface ChangeLogEntry {
  id: string;
  table_name: string;
  operation: string;
  previous_data: unknown;
  new_data: unknown;
  changed_by: string;
  description: string;
  is_undone: boolean;
  created_at: string;
}

interface PricingChangeLogProps {
  onUndo: (changeId: string) => Promise<void>;
  onError: (msg: string) => void;
}

export const PricingChangeLog: React.FC<PricingChangeLogProps> = ({ onUndo, onError }) => {
  const [entries, setEntries] = useState<ChangeLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [undoing, setUndoing] = useState<string | null>(null);
  const [tableFilter, setTableFilter] = useState<string>('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const fetchLog = async () => {
    try {
      setLoading(true);
      const authHeaders = await getAdminAuthHeaders();
      const params = new URLSearchParams({ limit: '100' });
      if (tableFilter) params.set('table', tableFilter);

      const response = await fetch(
        `${supabaseUrl}/functions/v1/base-pricing/change-log?${params}`,
        { headers: { ...authHeaders, 'Content-Type': 'application/json' } }
      );
      const result = await response.json();
      if (result.success) {
        setEntries(result.data || []);
      }
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to load change log');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLog();
  }, [tableFilter]);

  const handleUndo = async (entry: ChangeLogEntry) => {
    setUndoing(entry.id);
    try {
      await onUndo(entry.id);
      await fetchLog();
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Undo failed');
    } finally {
      setUndoing(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-NZ', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getOperationBadge = (operation: string, isUndone: boolean) => {
    if (isUndone) {
      return <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500 line-through">Undone</span>;
    }
    const colors: Record<string, string> = {
      update: 'bg-blue-100 text-blue-700',
      create: 'bg-green-100 text-green-700',
      delete: 'bg-red-100 text-red-700',
      bulk_replace: 'bg-orange-100 text-orange-700',
      bulk_merge: 'bg-teal-100 text-teal-700',
      undo: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[operation] || 'bg-gray-100 text-gray-600'}`}>
        {operation.replace('_', ' ')}
      </span>
    );
  };

  const tables = ['', 'fabric_pricing', 'corner_costs', 'hardware_costs', 'edge_features', 'fabric_types', 'pricing_settings'];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Pricing Change History</h3>
          <p className="text-sm text-gray-500">All pricing changes with undo capability</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-lime-500"
          >
            <option value="">All Tables</option>
            {tables.filter(Boolean).map((t) => (
              <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <button
            onClick={fetchLog}
            className="px-3 py-1.5 text-xs font-medium bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200"
          >
            Refresh
          </button>
        </div>
      </div>

      {loading ? (
        <div className="animate-pulse space-y-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded"></div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-gray-500 text-center py-8">No pricing changes recorded yet</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Table</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Operation</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Description</th>
                <th className="text-left py-2 px-3 font-semibold text-gray-700">Changed By</th>
                <th className="text-right py-2 px-3 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => {
                const canUndo =
                  !entry.is_undone &&
                  entry.operation !== 'undo' &&
                  entry.previous_data !== null;

                return (
                  <tr key={entry.id} className={`border-b border-gray-50 hover:bg-gray-50 ${entry.is_undone ? 'opacity-50' : ''}`}>
                    <td className="py-2 px-3 text-xs text-gray-500 whitespace-nowrap">
                      {formatDate(entry.created_at)}
                    </td>
                    <td className="py-2 px-3">
                      <span className="font-mono text-xs text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                        {entry.table_name}
                      </span>
                    </td>
                    <td className="py-2 px-3">{getOperationBadge(entry.operation, entry.is_undone)}</td>
                    <td className="py-2 px-3 text-gray-700 text-xs max-w-[300px] truncate">
                      {entry.description || '-'}
                    </td>
                    <td className="py-2 px-3 text-xs text-gray-500">{entry.changed_by}</td>
                    <td className="py-2 px-3 text-right">
                      {canUndo && (
                        <button
                          onClick={() => handleUndo(entry)}
                          disabled={undoing === entry.id}
                          className="px-3 py-1 bg-orange-50 text-orange-700 text-xs font-medium rounded hover:bg-orange-100 disabled:opacity-50 transition-colors"
                        >
                          {undoing === entry.id ? 'Undoing...' : 'Undo'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

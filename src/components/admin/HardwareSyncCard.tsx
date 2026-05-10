import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastProvider';

interface SyncResult {
  ok?: boolean;
  fetched?: number;
  upserts?: number;
  deactivated?: number;
  error?: string;
}

export const HardwareSyncCard: React.FC = () => {
  const { showToast } = useToast();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<SyncResult | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  const handleSync = async () => {
    setIsSyncing(true);
    setLastResult(null);
    try {
      const { data, error } = await supabase.functions.invoke('sync-hardware-catalog', {
        body: {},
      });

      if (error) {
        const message = error.message || 'Sync failed';
        setLastResult({ ok: false, error: message });
        showToast(`Hardware sync failed: ${message}`, 'error');
        return;
      }

      const result = (data || {}) as SyncResult;
      setLastResult(result);
      setLastSyncedAt(new Date().toLocaleString());

      if (result.ok) {
        showToast(
          `Synced ${result.upserts ?? 0} hardware products from Shopify`,
          'success'
        );
      } else {
        showToast(`Hardware sync returned an error: ${result.error ?? 'unknown'}`, 'error');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unexpected error';
      setLastResult({ ok: false, error: message });
      showToast(`Hardware sync failed: ${message}`, 'error');
    } finally {
      setIsSyncing(false);
    }
  };

  return (
    <Card className="border border-gray-200 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold text-forest-900">Hardware Catalog Sync</h3>
          <p className="text-sm text-gray-600 mt-1">
            Pulls the latest hardware products, prices, and images from the Shopify
            collection into the configurator.
          </p>
          {lastSyncedAt && (
            <p className="text-xs text-gray-500 mt-2">Last run: {lastSyncedAt}</p>
          )}
        </div>
        <div className="shrink-0">
          <Button onClick={handleSync} disabled={isSyncing} variant="primary" size="md">
            {isSyncing ? 'Syncing...' : 'Sync Hardware from Shopify'}
          </Button>
        </div>
      </div>

      {lastResult && (
        <div
          className={`mt-4 rounded-lg border px-4 py-3 text-sm ${
            lastResult.ok
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-800'
          }`}
        >
          {lastResult.ok ? (
            <div className="flex flex-wrap gap-x-6 gap-y-1">
              <span><strong>Fetched:</strong> {lastResult.fetched ?? 0}</span>
              <span><strong>Updated:</strong> {lastResult.upserts ?? 0}</span>
              <span><strong>Deactivated:</strong> {lastResult.deactivated ?? 0}</span>
            </div>
          ) : (
            <span>{lastResult.error ?? 'Sync failed'}</span>
          )}
        </div>
      )}
    </Card>
  );
};

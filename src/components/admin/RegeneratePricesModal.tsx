import React, { useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getAdminAuthHeaders } from '../../utils/adminAuth';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

type Direction = 'down_only' | 'up_only' | 'both';

interface QuoteChange {
  quoteId: string;
  quoteReference: string;
  quoteName: string;
  customerEmail: string | null;
  oldPrice: number;
  newPrice: number;
  currency: string;
  status: 'updated' | 'skipped';
  reason?: string;
}

interface RegenerateSummary {
  processed: number;
  updated: number;
  skipped: number;
  notificationsSent: number;
}

interface RegeneratePricesModalProps {
  mode: 'single' | 'bulk';
  quoteId?: string;
  quoteReference?: string;
  currentPrice?: number;
  currency?: string;
  customerEmail?: string | null;
  onClose: () => void;
  onComplete: () => void;
}

export const RegeneratePricesModal: React.FC<RegeneratePricesModalProps> = ({
  mode,
  quoteId,
  quoteReference,
  currentPrice,
  currency,
  customerEmail,
  onClose,
  onComplete,
}) => {
  const [direction, setDirection] = useState<Direction>('down_only');
  const [statusFilter, setStatusFilter] = useState<string[]>([
    'in_progress',
    'quote_ready',
    'completed',
  ]);
  const [sendNotification, setSendNotification] = useState(true);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<{
    summary: RegenerateSummary;
    changes: QuoteChange[];
  } | null>(null);
  const [result, setResult] = useState<{
    summary: RegenerateSummary;
    changes: QuoteChange[];
  } | null>(null);

  useBodyScrollLock(true);

  const statusOptions = [
    { value: 'in_progress', label: 'In Progress' },
    { value: 'quote_ready', label: 'Quote Ready' },
    { value: 'completed', label: 'Completed' },
    { value: 'expired', label: 'Expired' },
  ];

  const toggleStatus = (status: string) => {
    setStatusFilter((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status]
    );
  };

  const callRegenerate = async (dryRun: boolean) => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl) return null;

    const headers = await getAdminAuthHeaders();
    const body: Record<string, unknown> = {
      direction,
      sendNotification: dryRun ? false : sendNotification,
      dryRun,
    };

    if (mode === 'single' && quoteId) {
      body.quoteIds = [quoteId];
    } else {
      body.statusFilter = statusFilter;
    }

    const res = await fetch(
      `${supabaseUrl}/functions/v1/regenerate-quote-prices`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }
    );

    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(err.error || 'Request failed');
    }

    return res.json();
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const data = await callRegenerate(true);
      if (data) {
        setPreview({ summary: data.summary, changes: data.changes });
      }
    } catch (err: unknown) {
      alert(`Preview failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = async () => {
    setLoading(true);
    try {
      const data = await callRegenerate(false);
      if (data) {
        setResult({ summary: data.summary, changes: data.changes });
        setPreview(null);
      }
    } catch (err: unknown) {
      alert(`Apply failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number, cur: string) => {
    const symbols: Record<string, string> = {
      NZD: 'NZ$', USD: 'US$', AUD: 'AU$', GBP: '\u00a3', EUR: '\u20ac', CAD: 'CA$', AED: 'AED ',
    };
    return `${symbols[cur] || cur}${amount.toFixed(2)}`;
  };

  const updatedChanges = (preview || result)?.changes.filter(
    (c) => c.status === 'updated'
  ) || [];
  const skippedChanges = (preview || result)?.changes.filter(
    (c) => c.status === 'skipped'
  ) || [];

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
      onClick={onClose}
      onWheel={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
    >
      <Card
        className="max-w-2xl w-full max-h-[90vh] flex flex-col"
        onClick={(e: React.MouseEvent) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start p-6 pb-4 flex-shrink-0 border-b border-gray-200">
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {mode === 'single'
                ? `Regenerate Price - ${quoteReference}`
                : 'Regenerate Prices (Bulk)'}
            </h2>
            {mode === 'single' && currentPrice != null && currency && (
              <p className="text-sm text-gray-600 mt-1">
                Current price: {formatCurrency(currentPrice, currency)}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {!result ? (
            <>
              {/* Direction selector */}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-2">
                  Apply price changes:
                </label>
                <div className="space-y-2">
                  {[
                    { value: 'down_only' as Direction, label: 'Only if price goes down', desc: 'Best for passing savings to customers' },
                    { value: 'up_only' as Direction, label: 'Only if price goes up', desc: 'Correct under-priced quotes' },
                    { value: 'both' as Direction, label: 'Both (always update)', desc: 'Apply all price changes regardless of direction' },
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        direction === opt.value
                          ? 'border-[#01312D] bg-[#01312D]/5'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="direction"
                        value={opt.value}
                        checked={direction === opt.value}
                        onChange={() => setDirection(opt.value)}
                        className="mt-0.5 accent-[#01312D]"
                      />
                      <div>
                        <span className="text-sm font-medium text-gray-900">{opt.label}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Status filter (bulk only) */}
              {mode === 'bulk' && (
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-2">
                    Include quote statuses:
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {statusOptions.map((opt) => (
                      <label
                        key={opt.value}
                        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm cursor-pointer transition-colors ${
                          statusFilter.includes(opt.value)
                            ? 'border-[#01312D] bg-[#01312D]/5 text-[#01312D]'
                            : 'border-gray-200 text-gray-500 hover:border-gray-300'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={statusFilter.includes(opt.value)}
                          onChange={() => toggleStatus(opt.value)}
                          className="sr-only"
                        />
                        <span
                          className={`w-3 h-3 rounded-sm border flex items-center justify-center ${
                            statusFilter.includes(opt.value)
                              ? 'bg-[#01312D] border-[#01312D]'
                              : 'border-gray-300'
                          }`}
                        >
                          {statusFilter.includes(opt.value) && (
                            <svg className="w-2 h-2 text-white" fill="currentColor" viewBox="0 0 12 12">
                              <path d="M10.28 2.28L3.989 8.575 1.695 6.28A1 1 0 00.28 7.695l3 3a1 1 0 001.414 0l7-7A1 1 0 0010.28 2.28z" />
                            </svg>
                          )}
                        </span>
                        {opt.label}
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* Email notification */}
              <div className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
                <input
                  type="checkbox"
                  id="sendNotification"
                  checked={sendNotification}
                  onChange={(e) => setSendNotification(e.target.checked)}
                  className="mt-0.5 accent-[#01312D]"
                />
                <label htmlFor="sendNotification" className="cursor-pointer">
                  <span className="text-sm font-medium text-gray-900">
                    Notify customers of price drops via email
                  </span>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Only sends to customers with an email address when their price decreases.
                    {mode === 'single' && !customerEmail && (
                      <span className="text-amber-600 ml-1">(No email on this quote)</span>
                    )}
                  </p>
                </label>
              </div>

              {/* Preview results */}
              {preview && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h4 className="text-sm font-semibold text-gray-900">
                      Preview: {preview.summary.updated} quote{preview.summary.updated !== 1 ? 's' : ''} will be updated,{' '}
                      {preview.summary.skipped} skipped
                    </h4>
                  </div>
                  {updatedChanges.length > 0 && (
                    <div className="max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 sticky top-0">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Quote</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Old Price</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">New Price</th>
                            <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Change</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                          {updatedChanges.map((c) => (
                            <tr key={c.quoteId}>
                              <td className="px-3 py-2 text-gray-900">{c.quoteReference}</td>
                              <td className="px-3 py-2 text-right text-gray-600">
                                {formatCurrency(c.oldPrice, c.currency)}
                              </td>
                              <td className="px-3 py-2 text-right font-medium text-gray-900">
                                {formatCurrency(c.newPrice, c.currency)}
                              </td>
                              <td className={`px-3 py-2 text-right font-medium ${c.newPrice < c.oldPrice ? 'text-green-600' : 'text-red-600'}`}>
                                {c.newPrice < c.oldPrice ? '-' : '+'}
                                {formatCurrency(Math.abs(c.newPrice - c.oldPrice), c.currency)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  {updatedChanges.length === 0 && (
                    <div className="px-4 py-6 text-center text-gray-500 text-sm">
                      No quotes match the selected criteria. Nothing will be changed.
                    </div>
                  )}
                  {skippedChanges.length > 0 && (
                    <details className="border-t border-gray-200">
                      <summary className="px-4 py-2 text-xs text-gray-500 cursor-pointer hover:bg-gray-50">
                        {skippedChanges.length} skipped quote{skippedChanges.length !== 1 ? 's' : ''} (click to expand)
                      </summary>
                      <div className="max-h-32 overflow-y-auto px-4 pb-3">
                        {skippedChanges.map((c) => (
                          <div key={c.quoteId} className="flex justify-between text-xs text-gray-500 py-1">
                            <span>{c.quoteReference}</span>
                            <span>{c.reason}</span>
                          </div>
                        ))}
                      </div>
                    </details>
                  )}
                </div>
              )}
            </>
          ) : (
            /* Results after apply */
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3">
                  <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <p className="text-green-900 font-semibold">Prices regenerated successfully</p>
                    <p className="text-green-700 text-sm mt-1">
                      {result.summary.updated} quote{result.summary.updated !== 1 ? 's' : ''} updated,{' '}
                      {result.summary.skipped} skipped
                      {result.summary.notificationsSent > 0 && (
                        <>, {result.summary.notificationsSent} email notification{result.summary.notificationsSent !== 1 ? 's' : ''} sent</>
                      )}
                    </p>
                  </div>
                </div>
              </div>

              {updatedChanges.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden">
                  <div className="max-h-60 overflow-y-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Quote</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Old Price</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">New Price</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Savings</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {updatedChanges.map((c) => (
                          <tr key={c.quoteId}>
                            <td className="px-3 py-2">
                              <div className="text-gray-900">{c.quoteReference}</div>
                              {c.customerEmail && (
                                <div className="text-xs text-gray-500">{c.customerEmail}</div>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right text-gray-600 line-through">
                              {formatCurrency(c.oldPrice, c.currency)}
                            </td>
                            <td className="px-3 py-2 text-right font-medium text-gray-900">
                              {formatCurrency(c.newPrice, c.currency)}
                            </td>
                            <td className={`px-3 py-2 text-right font-medium ${c.newPrice < c.oldPrice ? 'text-green-600' : 'text-red-600'}`}>
                              {c.newPrice < c.oldPrice ? '-' : '+'}
                              {formatCurrency(Math.abs(c.newPrice - c.oldPrice), c.currency)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 flex-shrink-0">
          {result ? (
            <Button
              onClick={() => {
                onComplete();
                onClose();
              }}
            >
              Done
            </Button>
          ) : (
            <>
              <Button onClick={onClose} variant="outline" disabled={loading}>
                Cancel
              </Button>
              {!preview ? (
                <Button
                  onClick={handlePreview}
                  disabled={loading || (mode === 'bulk' && statusFilter.length === 0)}
                >
                  {loading ? 'Calculating...' : 'Preview Changes'}
                </Button>
              ) : (
                <>
                  <Button
                    onClick={() => setPreview(null)}
                    variant="outline"
                    disabled={loading}
                  >
                    Back
                  </Button>
                  <Button
                    onClick={handleApply}
                    disabled={loading || updatedChanges.length === 0}
                    className="bg-[#01312D] hover:bg-[#01312D]/90 text-white"
                  >
                    {loading
                      ? 'Applying...'
                      : `Apply to ${updatedChanges.length} quote${updatedChanges.length !== 1 ? 's' : ''}`}
                  </Button>
                </>
              )}
            </>
          )}
        </div>
      </Card>
    </div>
  );
};

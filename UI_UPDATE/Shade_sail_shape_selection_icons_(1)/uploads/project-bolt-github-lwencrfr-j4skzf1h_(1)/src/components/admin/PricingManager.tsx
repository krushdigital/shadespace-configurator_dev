import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { getAdminAuthHeaders } from '../../utils/adminAuth';
import { CsvUploadModal } from './CsvUploadModal';

interface PricingSetting {
  id: string;
  currency_code: string;
  currency_name: string;
  currency_symbol: string;
  market_markup: number;
  zonos_dhl_markup: number;
  exchange_rate: number;
  is_active: boolean;
  display_order: number;
  updated_at: string;
}

interface PricingHistory {
  id: string;
  currency_code: string;
  field_changed: string;
  old_value: string;
  new_value: string;
  changed_by: string;
  change_reason: string | null;
  created_at: string;
}

interface EditingState {
  [currencyCode: string]: {
    market_markup: string;
    zonos_dhl_markup: string;
    exchange_rate: string;
  };
}

export const PricingManager: React.FC = () => {
  const [settings, setSettings] = useState<PricingSetting[]>([]);
  const [history, setHistory] = useState<PricingHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);
  const [editing, setEditing] = useState<EditingState>({});
  const [showHistory, setShowHistory] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCsvUpload, setShowCsvUpload] = useState(false);
  const [showFormulaInfo, setShowFormulaInfo] = useState(false);

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const handleCsvExport = async () => {
    const authHeaders = await getAdminAuthHeaders();
    const response = await fetch(
      `${supabaseUrl}/functions/v1/base-pricing/csv-export?table=pricing_settings`,
      { headers: { ...authHeaders } }
    );
    const csv = await response.text();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pricing_settings.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCsvUpload = async (csvData: string, mode: 'replace' | 'merge') => {
    const authHeaders = await getAdminAuthHeaders();
    const response = await fetch(`${supabaseUrl}/functions/v1/base-pricing/csv-upload`, {
      method: 'POST',
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: JSON.stringify({ table: 'pricing_settings', csv_data: csvData, mode }),
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Upload failed');
    setSuccessMessage(`CSV ${mode} completed: ${data.rows_processed} rows`);
    setTimeout(() => setSuccessMessage(null), 4000);
    await fetchSettings();
  };

  useEffect(() => {
    fetchSettings();
    fetchHistory();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const authHeaders = await getAdminAuthHeaders();
      const response = await fetch(`${supabaseUrl}/functions/v1/pricing-settings?all=true`, {
        headers: {
          ...authHeaders,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          const parsed = data.settings.map((s: PricingSetting) => ({
            ...s,
            market_markup: Number(s.market_markup),
            zonos_dhl_markup: Number(s.zonos_dhl_markup),
            exchange_rate: Number(s.exchange_rate),
          }));
          setSettings(parsed);
        }
      }
    } catch (error) {
      console.error('Failed to fetch pricing settings:', error);
      setErrorMessage('Failed to load pricing settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchHistory = async () => {
    try {
      const authHeaders = await getAdminAuthHeaders();
      const response = await fetch(
        `${supabaseUrl}/rest/v1/pricing_history?order=created_at.desc&limit=50`,
        {
          headers: {
            ...authHeaders,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setHistory(data);
      }
    } catch (error) {
      console.error('Failed to fetch pricing history:', error);
    }
  };

  const startEditing = (setting: PricingSetting) => {
    setEditing((prev) => ({
      ...prev,
      [setting.currency_code]: {
        market_markup: String(setting.market_markup),
        zonos_dhl_markup: String(setting.zonos_dhl_markup),
        exchange_rate: String(setting.exchange_rate),
      },
    }));
  };

  const cancelEditing = (currencyCode: string) => {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[currencyCode];
      return next;
    });
  };

  const saveSettings = async (currencyCode: string) => {
    const editValues = editing[currencyCode];
    if (!editValues) return;

    const marketMarkup = parseFloat(editValues.market_markup);
    const zonosDhlMarkup = parseFloat(editValues.zonos_dhl_markup);
    const exchangeRate = parseFloat(editValues.exchange_rate);

    if (isNaN(marketMarkup) || marketMarkup <= 0) {
      setErrorMessage('Market markup must be a positive number');
      return;
    }
    if (isNaN(zonosDhlMarkup) || zonosDhlMarkup <= 0) {
      setErrorMessage('Zonos/DHL markup must be a positive number');
      return;
    }
    if (isNaN(exchangeRate) || exchangeRate <= 0) {
      setErrorMessage('Exchange rate must be a positive number');
      return;
    }

    setSaving(currencyCode);
    setErrorMessage(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token || supabaseKey;

      const response = await fetch(`${supabaseUrl}/functions/v1/pricing-settings`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currency_code: currencyCode,
          updates: {
            market_markup: marketMarkup,
            zonos_dhl_markup: zonosDhlMarkup,
            exchange_rate: exchangeRate,
          },
        }),
      });

      const data = await response.json();

      if (data.success) {
        setSuccessMessage(`${currencyCode} pricing updated successfully (${data.changes_logged} changes logged)`);
        cancelEditing(currencyCode);
        await fetchSettings();
        await fetchHistory();
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage(data.error || 'Failed to update pricing');
      }
    } catch (error) {
      console.error('Failed to save pricing settings:', error);
      setErrorMessage('Failed to save pricing settings');
    } finally {
      setSaving(null);
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

  const formatFieldName = (field: string) => {
    return field
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (l) => l.toUpperCase());
  };

  const calculateFinalPrice = (baseNZD: number, setting: PricingSetting) => {
    const markedUp = baseNZD * setting.market_markup;
    const zonosCost = baseNZD * (setting.zonos_dhl_markup - 1);
    return (markedUp + zonosCost) * setting.exchange_rate;
  };

  if (loading) {
    return (
      <Card className="p-6 border border-gray-200">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">{successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-green-600 hover:text-green-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="bg-red-50 border border-red-200 text-red-800 px-4 py-3 rounded-lg flex items-center justify-between">
          <span className="text-sm font-medium">{errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-red-600 hover:text-red-800">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      <Card className="border border-gray-200 shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Currency Pricing Settings</h2>
              <p className="text-sm text-gray-500 mt-1">
                Pricing flow: Base NZD &rarr; (Market Markup + Zonos/DHL on base) &rarr; Currency Conversion
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={handleCsvExport}>
                Export CSV
              </Button>
              <button
                onClick={() => setShowCsvUpload(true)}
                className="px-3 py-1.5 text-xs font-semibold bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
              >
                Upload CSV
              </button>
              <Button size="sm" variant="outline" onClick={fetchSettings}>
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6">
          <div className="mb-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-slate-700 mb-2">Example Calculation (NZ$1,000 base price)</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
              {settings.filter(s => s.is_active).map((s) => {
                const finalPrice = calculateFinalPrice(1000, s);
                return (
                  <div key={s.currency_code} className="text-center">
                    <div className="text-xs text-slate-500">{s.currency_code}</div>
                    <div className="text-sm font-bold text-slate-800">
                      {s.currency_symbol}{Math.ceil(finalPrice).toLocaleString()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mb-4">
            <button
              onClick={() => setShowFormulaInfo(!showFormulaInfo)}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {showFormulaInfo ? 'Hide formula explanation' : 'How is the Combined Factor calculated?'}
            </button>

            {showFormulaInfo && (
              <div className="mt-2 bg-sky-50 border border-sky-200 rounded-lg p-4 text-sm text-slate-700 space-y-3">
                <p>
                  The <span className="font-semibold">Combined Factor</span> is a single multiplier that converts any base NZD price directly into the final customer price in that currency.
                </p>
                <div className="bg-white/70 border border-sky-100 rounded px-3 py-2 font-mono text-xs text-slate-800">
                  Combined Factor = (Market Markup + Zonos/DHL Markup &minus; 1) &times; Exchange Rate
                </div>
                <ul className="space-y-1 text-xs text-slate-600 list-disc pl-4">
                  <li><span className="font-medium text-slate-700">Market Markup</span> &mdash; your profit margin (e.g. 1.083 = 8.3% markup on the base NZD price)</li>
                  <li><span className="font-medium text-slate-700">Zonos/DHL Markup</span> &mdash; shipping, duties &amp; fees surcharge. Only the extra portion above 1.0 is added (e.g. 1.200 = 20% added on top)</li>
                  <li><span className="font-medium text-slate-700">Exchange Rate</span> &mdash; converts the result from NZD into the target currency</li>
                </ul>
                <div className="bg-white/70 border border-sky-100 rounded px-3 py-2 text-xs text-slate-600">
                  <span className="font-medium text-slate-700">Example &mdash; USD:</span>{' '}
                  (1.083 + 1.200 &minus; 1) &times; 0.58 = <span className="font-semibold text-slate-800">0.7443</span>,
                  so a NZ$1,000 item becomes US$745
                </div>
              </div>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-3 font-semibold text-gray-700">Currency</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">Market Markup</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">Zonos/DHL Markup</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">Exchange Rate</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">Combined Factor</th>
                  <th className="text-center py-3 px-3 font-semibold text-gray-700">Last Updated</th>
                  <th className="text-right py-3 px-3 font-semibold text-gray-700">Actions</th>
                </tr>
              </thead>
              <tbody>
                {settings.map((setting) => {
                  const isEditing = !!editing[setting.currency_code];
                  const editValues = editing[setting.currency_code];
                  const isSaving = saving === setting.currency_code;
                  const combinedFactor = (setting.market_markup + setting.zonos_dhl_markup - 1) * setting.exchange_rate;

                  return (
                    <tr
                      key={setting.currency_code}
                      className={`border-b border-gray-100 ${!setting.is_active ? 'opacity-50' : ''} ${isEditing ? 'bg-lime-50/50' : 'hover:bg-gray-50'}`}
                    >
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-gray-900">{setting.currency_symbol}</span>
                          <div>
                            <div className="font-medium text-gray-900">{setting.currency_code}</div>
                            <div className="text-xs text-gray-500">{setting.currency_name}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editValues.market_markup}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [setting.currency_code]: { ...prev[setting.currency_code], market_markup: e.target.value },
                              }))
                            }
                            className="w-24 px-2 py-1 border border-lime-400 rounded text-center text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                          />
                        ) : (
                          <span className="font-mono text-gray-800">{setting.market_markup.toFixed(3)}</span>
                        )}
                        {!isEditing && (
                          <div className="text-xs text-gray-400">
                            {setting.market_markup === 1 ? 'No markup' : `${((setting.market_markup - 1) * 100).toFixed(1)}%`}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editValues.zonos_dhl_markup}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [setting.currency_code]: { ...prev[setting.currency_code], zonos_dhl_markup: e.target.value },
                              }))
                            }
                            className="w-24 px-2 py-1 border border-lime-400 rounded text-center text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                          />
                        ) : (
                          <span className="font-mono text-gray-800">{setting.zonos_dhl_markup.toFixed(3)}</span>
                        )}
                        {!isEditing && (
                          <div className="text-xs text-gray-400">
                            {setting.zonos_dhl_markup === 1 ? 'No markup' : `${((setting.zonos_dhl_markup - 1) * 100).toFixed(1)}%`}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.01"
                            min="0.01"
                            value={editValues.exchange_rate}
                            onChange={(e) =>
                              setEditing((prev) => ({
                                ...prev,
                                [setting.currency_code]: { ...prev[setting.currency_code], exchange_rate: e.target.value },
                              }))
                            }
                            className="w-24 px-2 py-1 border border-lime-400 rounded text-center text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500"
                          />
                        ) : (
                          <span className="font-mono text-gray-800">{setting.exchange_rate.toFixed(4)}</span>
                        )}
                        {!isEditing && (
                          <div className="text-xs text-gray-400">
                            1 NZD = {setting.exchange_rate} {setting.currency_code}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="font-mono font-bold text-gray-900">{combinedFactor.toFixed(4)}</span>
                      </td>

                      <td className="py-3 px-3 text-center">
                        <span className="text-xs text-gray-500">{formatDate(setting.updated_at)}</span>
                      </td>

                      <td className="py-3 px-3 text-right">
                        {isEditing ? (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => saveSettings(setting.currency_code)}
                              disabled={isSaving}
                              className="px-3 py-1 bg-lime-600 text-white text-xs font-medium rounded hover:bg-lime-700 disabled:opacity-50 transition-colors"
                            >
                              {isSaving ? 'Saving...' : 'Save'}
                            </button>
                            <button
                              onClick={() => cancelEditing(setting.currency_code)}
                              disabled={isSaving}
                              className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-medium rounded hover:bg-gray-300 disabled:opacity-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => startEditing(setting)}
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
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">Change History</h3>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setShowHistory(!showHistory)}
            >
              {showHistory ? 'Hide History' : 'Show History'}
            </Button>
          </div>

          {showHistory && (
            <div className="overflow-x-auto">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-8">No pricing changes recorded yet</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Date</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Currency</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Field</th>
                      <th className="text-center py-2 px-3 font-semibold text-gray-700">Old Value</th>
                      <th className="text-center py-2 px-3 font-semibold text-gray-700">New Value</th>
                      <th className="text-left py-2 px-3 font-semibold text-gray-700">Changed By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50">
                        <td className="py-2 px-3 text-xs text-gray-500">{formatDate(entry.created_at)}</td>
                        <td className="py-2 px-3 font-medium text-gray-900">{entry.currency_code}</td>
                        <td className="py-2 px-3 text-gray-700">{formatFieldName(entry.field_changed)}</td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-mono text-red-600 bg-red-50 px-2 py-0.5 rounded text-xs">{entry.old_value}</span>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <span className="font-mono text-green-600 bg-green-50 px-2 py-0.5 rounded text-xs">{entry.new_value}</span>
                        </td>
                        <td className="py-2 px-3 text-xs text-gray-500">{entry.changed_by}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </Card>

      {showCsvUpload && (
        <CsvUploadModal
          title="Upload Currency Pricing CSV"
          tableName="pricing_settings"
          expectedHeaders="currency_code,currency_name,currency_symbol,market_markup,zonos_dhl_markup,exchange_rate,is_active,display_order"
          onUpload={handleCsvUpload}
          onClose={() => setShowCsvUpload(false)}
        />
      )}
    </div>
  );
};

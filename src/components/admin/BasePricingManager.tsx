import React, { useState, useEffect } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { getAdminAuthHeaders } from '../../utils/adminAuth';
import { CsvUploadModal } from './CsvUploadModal';
import { FabricPricingEditor } from './FabricPricingEditor';
import { CostTableEditor } from './CostTableEditor';
import { PricingChangeLog } from './PricingChangeLog';

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

interface CostRow {
  id: string;
  edge_type: string;
  corners: number;
  cost_nzd: number;
}

interface EdgeFeatureRow {
  id: string;
  edge_type: string;
  feature_name: string;
  min_perimeter: number;
  max_perimeter: number;
  feature_value: number;
}

type SubTab = 'fabric' | 'corners' | 'hardware' | 'features' | 'fabric-types' | 'history';

export const BasePricingManager: React.FC = () => {
  const [subTab, setSubTab] = useState<SubTab>('fabric');
  const [fabricTypes, setFabricTypes] = useState<FabricType[]>([]);
  const [fabricPricing, setFabricPricing] = useState<FabricPricingRow[]>([]);
  const [cornerCosts, setCornerCosts] = useState<CostRow[]>([]);
  const [hardwareCosts, setHardwareCosts] = useState<CostRow[]>([]);
  const [edgeFeatures, setEdgeFeatures] = useState<EdgeFeatureRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showCsvUpload, setShowCsvUpload] = useState<string | null>(null);
  const [fabricEdgeFilter, setFabricEdgeFilter] = useState<'webbing' | 'cabled'>('webbing');
  const [newFabricId, setNewFabricId] = useState('');
  const [newFabricLabel, setNewFabricLabel] = useState('');

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const fetchAll = async () => {
    try {
      setLoading(true);
      const authHeaders = await getAdminAuthHeaders();
      const response = await fetch(`${supabaseUrl}/functions/v1/base-pricing`, {
        headers: { ...authHeaders, 'Content-Type': 'application/json' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();
      if (result.success && result.data) {
        setFabricTypes(result.data.fabricTypes || []);
        setFabricPricing(
          (result.data.fabricPricing || []).map((r: FabricPricingRow) => ({
            ...r,
            perimeter: Number(r.perimeter),
          }))
        );
        setCornerCosts(
          (result.data.cornerCosts || []).map((r: CostRow) => ({
            ...r,
            cost_nzd: Number(r.cost_nzd),
          }))
        );
        setHardwareCosts(
          (result.data.hardwareCosts || []).map((r: CostRow) => ({
            ...r,
            cost_nzd: Number(r.cost_nzd),
          }))
        );
        setEdgeFeatures(
          (result.data.edgeFeatures || []).map((r: EdgeFeatureRow) => ({
            ...r,
            min_perimeter: Number(r.min_perimeter),
            max_perimeter: Number(r.max_perimeter),
            feature_value: Number(r.feature_value),
          }))
        );
      }
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to load pricing data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const apiCall = async (path: string, method: string, body?: unknown) => {
    const authHeaders = await getAdminAuthHeaders();
    const response = await fetch(`${supabaseUrl}/functions/v1/base-pricing/${path}`, {
      method,
      headers: { ...authHeaders, 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await response.json();
    if (!data.success) throw new Error(data.error || 'Request failed');
    return data;
  };

  const handleCsvUpload = async (csvData: string, mode: 'replace' | 'merge') => {
    if (!showCsvUpload) return;
    const body: Record<string, string> = { table: showCsvUpload, csv_data: csvData, mode };
    if (showCsvUpload === 'fabric_pricing') {
      body.edge_type = fabricEdgeFilter;
    }
    await apiCall('csv-upload', 'POST', body);
    showSuccess(`CSV ${mode} completed successfully`);
    await fetchAll();
  };

  const handleCsvExport = async (table: string) => {
    const authHeaders = await getAdminAuthHeaders();
    let exportUrl = `${supabaseUrl}/functions/v1/base-pricing/csv-export?table=${table}`;
    let filename = `${table}.csv`;
    if (table === 'fabric_pricing') {
      exportUrl += `&edge_type=${fabricEdgeFilter}`;
      filename = `fabric_pricing_${fabricEdgeFilter}.csv`;
    }
    const response = await fetch(exportUrl, { headers: { ...authHeaders } });
    const csv = await response.text();
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleAddFabricType = async () => {
    if (!newFabricId || !newFabricLabel) {
      setErrorMessage('Fabric ID and label are required');
      return;
    }
    const sanitizedId = newFabricId.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (!sanitizedId) {
      setErrorMessage('Fabric ID must contain only letters and numbers');
      return;
    }
    try {
      await apiCall('fabric-types', 'POST', {
        id: sanitizedId,
        label: newFabricLabel,
        display_order: fabricTypes.length + 1,
      });
      setNewFabricId('');
      setNewFabricLabel('');
      showSuccess(`Fabric type "${newFabricLabel}" added successfully`);
      await fetchAll();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to add fabric type');
    }
  };

  const handleToggleFabricType = async (ft: FabricType) => {
    try {
      await apiCall('fabric-types', 'PUT', { id: ft.id, is_active: !ft.is_active });
      showSuccess(`${ft.label} ${ft.is_active ? 'deactivated' : 'activated'}`);
      await fetchAll();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to update');
    }
  };

  const getCsvHeaders = () => {
    if (subTab === 'fabric') {
      const typeIds = fabricTypes.filter((ft) => ft.is_active).map((ft) => ft.id);
      return `perimeter,${typeIds.join(',')}`;
    }
    if (subTab === 'corners' || subTab === 'hardware') return 'edge_type,corners,cost_nzd';
    if (subTab === 'features') return 'edge_type,feature_name,min_perimeter,max_perimeter,feature_value';
    return '';
  };

  const getTableName = () => {
    if (subTab === 'fabric') return 'fabric_pricing';
    if (subTab === 'corners') return 'corner_costs';
    if (subTab === 'hardware') return 'hardware_costs';
    if (subTab === 'features') return 'edge_features';
    return '';
  };

  const subTabs: { id: SubTab; label: string }[] = [
    { id: 'fabric', label: 'Fabric Pricing' },
    { id: 'corners', label: 'Corner Costs' },
    { id: 'hardware', label: 'Hardware Costs' },
    { id: 'features', label: 'Edge Features' },
    { id: 'fabric-types', label: 'Fabric Types' },
    { id: 'history', label: 'Change History' },
  ];

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
              <h2 className="text-xl font-bold text-gray-900">Base Pricing (NZD)</h2>
              <p className="text-sm text-gray-500 mt-1">
                All base prices are in NZD. Currency markups and exchange rates are applied separately.
              </p>
            </div>
            <div className="flex gap-2">
              {subTab !== 'fabric-types' && subTab !== 'history' && (
                <>
                  <Button size="sm" variant="outline" onClick={() => handleCsvExport(getTableName())}>
                    Export CSV
                  </Button>
                  <button
                    onClick={() => setShowCsvUpload(getTableName())}
                    className="px-3 py-1.5 text-xs font-semibold bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
                  >
                    Upload CSV
                  </button>
                </>
              )}
              <Button size="sm" variant="outline" onClick={fetchAll}>
                Refresh
              </Button>
            </div>
          </div>
        </div>

        <div className="border-b border-gray-200">
          <nav className="flex gap-0 px-6 overflow-x-auto">
            {subTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSubTab(tab.id)}
                className={`py-3 px-4 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
                  subTab === tab.id
                    ? 'border-lime-500 text-lime-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {subTab === 'fabric' && (
            <FabricPricingEditor
              fabricTypes={fabricTypes}
              fabricPricing={fabricPricing}
              edgeFilter={fabricEdgeFilter}
              onEdgeFilterChange={setFabricEdgeFilter}
              onSave={async (id, prices) => {
                await apiCall('fabric-pricing', 'PUT', { id, prices });
                showSuccess('Fabric pricing updated');
                await fetchAll();
              }}
              onError={setErrorMessage}
            />
          )}

          {subTab === 'corners' && (
            <CostTableEditor
              title="Corner Costs (NZD)"
              description="Cost per number of corners, by edge type"
              rows={cornerCosts}
              onSave={async (id, cost_nzd) => {
                await apiCall('corner-costs', 'PUT', { id, cost_nzd });
                showSuccess('Corner cost updated');
                await fetchAll();
              }}
              onError={setErrorMessage}
            />
          )}

          {subTab === 'hardware' && (
            <CostTableEditor
              title="Hardware Costs (NZD)"
              description="Turnbuckle & shackle costs for 'Adjust to fit' option, by edge type and corner count"
              rows={hardwareCosts}
              onSave={async (id, cost_nzd) => {
                await apiCall('hardware-costs', 'PUT', { id, cost_nzd });
                showSuccess('Hardware cost updated');
                await fetchAll();
              }}
              onError={setErrorMessage}
            />
          )}

          {subTab === 'features' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Edge Features</h3>
              <p className="text-sm text-gray-500 mb-4">Wire thickness and webbing width ranges by perimeter</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Edge Type</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Feature</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-700">Min Perimeter (m)</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-700">Max Perimeter (m)</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-700">Value (mm)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {edgeFeatures.map((ef) => (
                      <tr key={ef.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-3 capitalize font-medium text-gray-900">{ef.edge_type}</td>
                        <td className="py-3 px-3 text-gray-700">
                          {ef.feature_name === 'wire_thickness' ? 'Wire Thickness' : 'Webbing Width'}
                        </td>
                        <td className="py-3 px-3 text-center font-mono text-gray-800">{ef.min_perimeter}</td>
                        <td className="py-3 px-3 text-center font-mono text-gray-800">{ef.max_perimeter}</td>
                        <td className="py-3 px-3 text-center font-mono font-bold text-gray-900">{ef.feature_value}mm</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subTab === 'fabric-types' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-1">Fabric Types</h3>
              <p className="text-sm text-gray-500 mb-4">Manage available fabric types. Adding a type creates a new pricing column (defaulting to $0).</p>

              <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-slate-700 mb-3">Add New Fabric Type</h4>
                <div className="flex gap-3 items-end">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">ID (lowercase, no spaces)</label>
                    <input
                      type="text"
                      value={newFabricId}
                      onChange={(e) => setNewFabricId(e.target.value)}
                      placeholder="e.g. premium400"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 w-48"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Display Label</label>
                    <input
                      type="text"
                      value={newFabricLabel}
                      onChange={(e) => setNewFabricLabel(e.target.value)}
                      placeholder="e.g. Premium 400"
                      className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500 w-48"
                    />
                  </div>
                  <button
                    onClick={handleAddFabricType}
                    className="px-4 py-2 text-sm font-semibold bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
                  >
                    Add Type
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">ID</th>
                      <th className="text-left py-3 px-3 font-semibold text-gray-700">Label</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-700">Order</th>
                      <th className="text-center py-3 px-3 font-semibold text-gray-700">Status</th>
                      <th className="text-right py-3 px-3 font-semibold text-gray-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {fabricTypes.map((ft) => (
                      <tr key={ft.id} className={`border-b border-gray-100 ${!ft.is_active ? 'opacity-50' : ''}`}>
                        <td className="py-3 px-3 font-mono text-gray-800">{ft.id}</td>
                        <td className="py-3 px-3 font-medium text-gray-900">{ft.label}</td>
                        <td className="py-3 px-3 text-center text-gray-600">{ft.display_order}</td>
                        <td className="py-3 px-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              ft.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                            }`}
                          >
                            {ft.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <button
                            onClick={() => handleToggleFabricType(ft)}
                            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
                              ft.is_active
                                ? 'bg-red-50 text-red-700 hover:bg-red-100'
                                : 'bg-green-50 text-green-700 hover:bg-green-100'
                            }`}
                          >
                            {ft.is_active ? 'Deactivate' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {subTab === 'history' && (
            <PricingChangeLog
              onUndo={async (changeId) => {
                await apiCall('undo', 'POST', { change_id: changeId });
                showSuccess('Change undone successfully');
                await fetchAll();
              }}
              onError={setErrorMessage}
            />
          )}
        </div>
      </Card>

      {showCsvUpload && (
        <CsvUploadModal
          title={showCsvUpload === 'fabric_pricing'
            ? `Upload ${fabricEdgeFilter === 'webbing' ? 'Webbing Edge' : 'Cabled Edge'} Fabric Pricing CSV`
            : `Upload ${showCsvUpload.replace(/_/g, ' ')} CSV`}
          tableName={showCsvUpload === 'fabric_pricing' ? `fabric_pricing (${fabricEdgeFilter})` : showCsvUpload}
          expectedHeaders={getCsvHeaders()}
          onUpload={handleCsvUpload}
          onClose={() => setShowCsvUpload(null)}
        />
      )}
    </div>
  );
};

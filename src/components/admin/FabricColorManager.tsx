import React, { useState, useEffect, useCallback } from 'react';
import { getAdminAuthHeaders } from '../../utils/adminAuth';
import { Eye, EyeOff, Plus, Trash2, ChevronDown, ChevronUp, CreditCard as Edit2, Check, X, Flame, Package, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface DbFabric {
  id: string;
  label: string;
  description: string;
  detailed_description: string;
  benefits: string[];
  best_for: string[];
  uv_protection: string;
  warranty_years: number;
  made_in: string;
  weight_per_sqm: number;
  badge_text: string;
  is_fire_retardant: boolean;
  display_order: number;
  is_active: boolean;
}

interface DbColor {
  id: string;
  fabric_type_id: string;
  color_name: string;
  image_url: string;
  text_color: string;
  shade_factor: number;
  is_fire_retardant: boolean;
  is_in_stock: boolean;
  display_order: number;
}

const API_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fabric-catalog`;

async function apiCall(path: string, method: string, body?: unknown) {
  const headers = await getAdminAuthHeaders();
  const res = await fetch(`${API_BASE}/${path}`, {
    method,
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    let errorMsg = `Request failed (${res.status})`;
    try { const parsed = JSON.parse(text); errorMsg = parsed.error || errorMsg; } catch { /* use default */ }
    return { success: false, error: errorMsg };
  }
  return res.json();
}

export function FabricColorManager() {
  const [fabrics, setFabrics] = useState<DbFabric[]>([]);
  const [colors, setColors] = useState<DbColor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [expandedFabric, setExpandedFabric] = useState<string | null>(null);
  const [view, setView] = useState<'manage' | 'stock'>('stock');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const headers = await getAdminAuthHeaders();
      const res = await fetch(`${API_BASE}/admin`, {
        headers: { ...headers, 'Content-Type': 'application/json' },
      });
      const result = await res.json();
      if (result.success) {
        setFabrics(result.data.fabrics || []);
        setColors(result.data.colors || []);
      } else {
        setError(result.error || 'Failed to load');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (success) {
      const t = setTimeout(() => setSuccess(null), 3000);
      return () => clearTimeout(t);
    }
  }, [success]);

  const toggleColorStock = async (color: DbColor) => {
    const result = await apiCall('colors', 'PUT', { id: color.id, is_in_stock: !color.is_in_stock });
    if (result.success) {
      setColors(prev => prev.map(c => c.id === color.id ? { ...c, is_in_stock: !c.is_in_stock } : c));
      setSuccess(`${color.color_name} marked as ${!color.is_in_stock ? 'in stock' : 'out of stock'}`);
    } else {
      setError(result.error || 'Failed to update');
    }
  };

  const bulkStockUpdate = async (fabricId: string, inStock: boolean) => {
    const fabricColors = colors.filter(c => c.fabric_type_id === fabricId);
    const updates = fabricColors.map(c => ({ id: c.id, is_in_stock: inStock }));
    const result = await apiCall('colors/bulk-stock', 'PUT', { updates });
    if (result.success) {
      setColors(prev => prev.map(c => c.fabric_type_id === fabricId ? { ...c, is_in_stock: inStock } : c));
      setSuccess(`All ${fabrics.find(f => f.id === fabricId)?.label} colors marked ${inStock ? 'in stock' : 'out of stock'}`);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-lime-600"></div></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Fabrics & Colors</h3>
          <p className="text-sm text-gray-500">Manage fabric types, colors, and stock availability</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('stock')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${view === 'stock' ? 'bg-lime-100 text-lime-800 border border-lime-300' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}
          >
            <Package className="w-4 h-4 inline mr-1" />
            Stock Status
          </button>
          <button
            onClick={() => setView('manage')}
            className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors ${view === 'manage' ? 'bg-lime-100 text-lime-800 border border-lime-300' : 'bg-white text-gray-600 border border-gray-300 hover:bg-gray-50'}`}
          >
            <Edit2 className="w-4 h-4 inline mr-1" />
            Full Management
          </button>
        </div>
      </div>

      {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}<button onClick={() => setError(null)} className="ml-2 font-bold">x</button></div>}
      {success && <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{success}</div>}

      {view === 'stock' ? (
        <StockStatusView fabrics={fabrics} colors={colors} toggleColorStock={toggleColorStock} bulkStockUpdate={bulkStockUpdate} />
      ) : (
        <FullManagementView
          fabrics={fabrics}
          colors={colors}
          expandedFabric={expandedFabric}
          setExpandedFabric={setExpandedFabric}
          toggleColorStock={toggleColorStock}
          bulkStockUpdate={bulkStockUpdate}
          onRefresh={fetchData}
          setSuccess={setSuccess}
          setError={setError}
        />
      )}
    </div>
  );
}

function StockStatusView({ fabrics, colors, toggleColorStock, bulkStockUpdate }: {
  fabrics: DbFabric[];
  colors: DbColor[];
  toggleColorStock: (c: DbColor) => void;
  bulkStockUpdate: (fabricId: string, inStock: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      {fabrics.map(fabric => {
        const fabricColors = colors.filter(c => c.fabric_type_id === fabric.id).sort((a, b) => a.display_order - b.display_order);
        const inStockCount = fabricColors.filter(c => c.is_in_stock).length;

        return (
          <div key={fabric.id} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <h4 className="font-semibold text-gray-900">{fabric.label}</h4>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${fabric.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                  {fabric.is_active ? 'Active' : 'Inactive'}
                </span>
                <span className="text-xs text-gray-500">{inStockCount}/{fabricColors.length} in stock</span>
              </div>
              <div className="flex gap-2">
                <button onClick={() => bulkStockUpdate(fabric.id, true)} className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100 transition-colors">All In Stock</button>
                <button onClick={() => bulkStockUpdate(fabric.id, false)} className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100 transition-colors">All Out of Stock</button>
              </div>
            </div>
            <div className="p-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
                {fabricColors.map(color => (
                  <button
                    key={color.id}
                    onClick={() => toggleColorStock(color)}
                    className={`relative rounded-lg border-2 p-2 transition-all ${
                      color.is_in_stock
                        ? 'border-green-300 bg-white hover:border-green-400'
                        : 'border-red-300 bg-red-50 hover:border-red-400 opacity-60'
                    }`}
                  >
                    <div className="relative pb-[60%] rounded overflow-hidden mb-2">
                      {color.image_url ? (
                        <img src={color.image_url} alt={color.color_name} className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                      ) : (
                        <div className="absolute inset-0 bg-gray-200 flex items-center justify-center text-xs text-gray-400">No image</div>
                      )}
                      {!color.is_in_stock && (
                        <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center">
                          <span className="text-white text-xs font-bold bg-red-600 px-2 py-0.5 rounded">OUT OF STOCK</span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs font-medium text-gray-900 truncate">{color.color_name}</div>
                    <div className="flex items-center gap-1 mt-1">
                      {color.is_in_stock ? (
                        <Eye className="w-3 h-3 text-green-600" />
                      ) : (
                        <EyeOff className="w-3 h-3 text-red-500" />
                      )}
                      <span className={`text-xs ${color.is_in_stock ? 'text-green-600' : 'text-red-500'}`}>
                        {color.is_in_stock ? 'In Stock' : 'Hidden'}
                      </span>
                      {color.is_fire_retardant && <Flame className="w-3 h-3 text-orange-500 ml-auto" />}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function FullManagementView({ fabrics, colors, expandedFabric, setExpandedFabric, toggleColorStock, bulkStockUpdate, onRefresh, setSuccess, setError }: {
  fabrics: DbFabric[];
  colors: DbColor[];
  expandedFabric: string | null;
  setExpandedFabric: (id: string | null) => void;
  toggleColorStock: (c: DbColor) => void;
  bulkStockUpdate: (fabricId: string, inStock: boolean) => void;
  onRefresh: () => void;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
}) {
  const [showAddFabric, setShowAddFabric] = useState(false);
  const [orderedIds, setOrderedIds] = useState<string[]>(fabrics.map(f => f.id));
  const [savingOrder, setSavingOrder] = useState(false);

  useEffect(() => {
    setOrderedIds(fabrics.map(f => f.id));
  }, [fabrics]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const fabricsById = new Map(fabrics.map(f => [f.id, f]));
  const orderedFabrics = orderedIds.map(id => fabricsById.get(id)).filter((f): f is DbFabric => !!f);

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = orderedIds.indexOf(String(active.id));
    const newIndex = orderedIds.indexOf(String(over.id));
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(orderedIds, oldIndex, newIndex);
    setOrderedIds(next);
    setSavingOrder(true);
    const result = await apiCall('fabrics/reorder', 'PUT', { order: next });
    setSavingOrder(false);
    if (result.success) {
      setSuccess('Fabric order updated');
      onRefresh();
    } else {
      setError(result.error || 'Failed to save new order');
      setOrderedIds(fabrics.map(f => f.id));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">Drag the handle to reorder fabric types. Order applies to the configurator and comparison widget.</p>
        <button
          onClick={() => setShowAddFabric(!showAddFabric)}
          className="flex items-center gap-1 px-3 py-2 text-sm font-semibold bg-lime-600 text-white rounded-lg hover:bg-lime-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Fabric Type
        </button>
      </div>

      {savingOrder && <div className="text-xs text-gray-500">Saving order…</div>}

      {showAddFabric && (
        <AddFabricForm
          onClose={() => setShowAddFabric(false)}
          onSuccess={() => { setShowAddFabric(false); onRefresh(); setSuccess('New fabric type added'); }}
          setError={setError}
          nextOrder={fabrics.length}
        />
      )}

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={orderedIds} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {orderedFabrics.map(fabric => {
              const fabricColors = colors.filter(c => c.fabric_type_id === fabric.id).sort((a, b) => a.display_order - b.display_order);
              const isExpanded = expandedFabric === fabric.id;

              return (
                <SortableFabricCard
                  key={fabric.id}
                  fabric={fabric}
                  colors={fabricColors}
                  isExpanded={isExpanded}
                  onToggleExpand={() => setExpandedFabric(isExpanded ? null : fabric.id)}
                  toggleColorStock={toggleColorStock}
                  bulkStockUpdate={bulkStockUpdate}
                  onRefresh={onRefresh}
                  setSuccess={setSuccess}
                  setError={setError}
                />
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableFabricCard(props: {
  fabric: DbFabric;
  colors: DbColor[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  toggleColorStock: (c: DbColor) => void;
  bulkStockUpdate: (fabricId: string, inStock: boolean) => void;
  onRefresh: () => void;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.fabric.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 20 : 'auto',
    boxShadow: isDragging ? '0 8px 24px rgba(0,0,0,0.12)' : undefined,
  };
  return (
    <div ref={setNodeRef} style={style}>
      <FabricCard
        {...props}
        dragHandleProps={{ ...attributes, ...listeners }}
      />
    </div>
  );
}

function AddFabricForm({ onClose, onSuccess, setError, nextOrder }: {
  onClose: () => void;
  onSuccess: () => void;
  setError: (msg: string) => void;
  nextOrder: number;
}) {
  const [form, setForm] = useState({
    id: '', label: '', description: '', detailed_description: '',
    uv_protection: '', warranty_years: 10, made_in: '', weight_per_sqm: 0,
    badge_text: '', is_fire_retardant: false,
  });
  const [benefits, setBenefits] = useState('');
  const [bestFor, setBestFor] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.id || !form.label) { setError('ID and Label are required'); return; }
    setSaving(true);
    const result = await apiCall('fabrics', 'POST', {
      ...form,
      benefits: benefits.split('\n').filter(Boolean),
      best_for: bestFor.split('\n').filter(Boolean),
      display_order: nextOrder,
    });
    setSaving(false);
    if (result.success) { onSuccess(); } else { setError(result.error || 'Failed to add fabric'); }
  };

  return (
    <div className="border border-lime-200 bg-lime-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-semibold text-gray-900">Add New Fabric Type</h4>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">ID (lowercase, no spaces) *</label>
          <input value={form.id} onChange={e => setForm({ ...form, id: e.target.value.toLowerCase().replace(/\s/g, '') })} placeholder="e.g. premium400" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Display Label *</label>
          <input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="e.g. Premium 400" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Short Description</label>
          <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="One-line description" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Detailed Description</label>
          <textarea value={form.detailed_description} onChange={e => setForm({ ...form, detailed_description: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Benefits (one per line)</label>
          <textarea value={benefits} onChange={e => setBenefits(e.target.value)} rows={3} placeholder="Superior UV protection&#10;Easy to clean" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Best For (one per line)</label>
          <textarea value={bestFor} onChange={e => setBestFor(e.target.value)} rows={3} placeholder="Residential applications&#10;Commercial use" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">UV Protection</label>
          <input value={form.uv_protection} onChange={e => setForm({ ...form, uv_protection: e.target.value })} placeholder="e.g. 95%+" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Warranty (years)</label>
          <input type="number" value={form.warranty_years} onChange={e => setForm({ ...form, warranty_years: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Made In</label>
          <input value={form.made_in} onChange={e => setForm({ ...form, made_in: e.target.value })} placeholder="e.g. Australia" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Weight (g/m2)</label>
          <input type="number" value={form.weight_per_sqm} onChange={e => setForm({ ...form, weight_per_sqm: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Badge Text</label>
          <input value={form.badge_text} onChange={e => setForm({ ...form, badge_text: e.target.value })} placeholder="e.g. Premium, Best Value" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" checked={form.is_fire_retardant} onChange={e => setForm({ ...form, is_fire_retardant: e.target.checked })} className="rounded" />
          <label className="text-sm text-gray-700">Fire Retardant fabric line</label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:opacity-50">{saving ? 'Adding...' : 'Add Fabric Type'}</button>
      </div>
    </div>
  );
}

function FabricCard({ fabric, colors: fabricColors, isExpanded, onToggleExpand, toggleColorStock, bulkStockUpdate, onRefresh, setSuccess, setError, dragHandleProps }: {
  fabric: DbFabric;
  colors: DbColor[];
  isExpanded: boolean;
  onToggleExpand: () => void;
  toggleColorStock: (c: DbColor) => void;
  bulkStockUpdate: (fabricId: string, inStock: boolean) => void;
  onRefresh: () => void;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
  dragHandleProps?: Record<string, unknown>;
}) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState<Partial<DbFabric>>({});
  const [editBenefits, setEditBenefits] = useState('');
  const [editBestFor, setEditBestFor] = useState('');
  const [showAddColor, setShowAddColor] = useState(false);
  const [saving, setSaving] = useState(false);
  const inStockCount = fabricColors.filter(c => c.is_in_stock).length;

  const startEdit = () => {
    setEditForm({ ...fabric });
    setEditBenefits((fabric.benefits || []).join('\n'));
    setEditBestFor((fabric.best_for || []).join('\n'));
    setEditing(true);
  };

  const saveEdit = async () => {
    setSaving(true);
    const result = await apiCall('fabrics', 'PUT', {
      ...editForm,
      benefits: editBenefits.split('\n').filter(Boolean),
      best_for: editBestFor.split('\n').filter(Boolean),
    });
    setSaving(false);
    if (result.success) { setEditing(false); onRefresh(); setSuccess(`${fabric.label} updated`); }
    else { setError(result.error || 'Failed to update'); }
  };

  const toggleActive = async () => {
    const result = await apiCall('fabrics', 'PUT', { id: fabric.id, is_active: !fabric.is_active });
    if (result.success) { onRefresh(); setSuccess(`${fabric.label} ${!fabric.is_active ? 'activated' : 'deactivated'}`); }
    else { setError(result.error || 'Failed to update'); }
  };

  return (
    <div className={`border rounded-lg overflow-hidden ${fabric.is_active ? 'border-gray-200' : 'border-gray-200 opacity-60'}`}>
      <div className="bg-gray-50 px-4 py-3 flex items-center justify-between cursor-pointer" onClick={onToggleExpand}>
        <div className="flex items-center gap-3">
          {dragHandleProps && (
            <button
              type="button"
              {...dragHandleProps}
              onClick={e => e.stopPropagation()}
              className="text-gray-400 hover:text-gray-700 cursor-grab active:cursor-grabbing touch-none"
              aria-label={`Drag to reorder ${fabric.label}`}
              title="Drag to reorder"
            >
              <GripVertical className="w-5 h-5" />
            </button>
          )}
          <button className="text-gray-400">{isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}</button>
          <h4 className="font-semibold text-gray-900">{fabric.label}</h4>
          {fabric.is_fire_retardant && <Flame className="w-4 h-4 text-orange-500" />}
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${fabric.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>{fabric.is_active ? 'Active' : 'Inactive'}</span>
          {fabric.badge_text && <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-lime-100 text-lime-700">{fabric.badge_text}</span>}
          <span className="text-xs text-gray-500">{inStockCount}/{fabricColors.length} colors in stock</span>
        </div>
        <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
          <button onClick={startEdit} className="px-2 py-1 text-xs font-medium bg-blue-50 text-blue-700 rounded hover:bg-blue-100 transition-colors">Edit</button>
          <button onClick={toggleActive} className={`px-2 py-1 text-xs font-medium rounded transition-colors ${fabric.is_active ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>{fabric.is_active ? 'Deactivate' : 'Activate'}</button>
        </div>
      </div>

      {editing && (
        <EditFabricForm
          form={editForm}
          setForm={setEditForm}
          benefits={editBenefits}
          setBenefits={setEditBenefits}
          bestFor={editBestFor}
          setBestFor={setEditBestFor}
          saving={saving}
          onSave={saveEdit}
          onCancel={() => setEditing(false)}
        />
      )}

      {isExpanded && (
        <div className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <button onClick={() => bulkStockUpdate(fabric.id, true)} className="px-2 py-1 text-xs font-medium bg-green-50 text-green-700 rounded hover:bg-green-100">All In Stock</button>
              <button onClick={() => bulkStockUpdate(fabric.id, false)} className="px-2 py-1 text-xs font-medium bg-red-50 text-red-700 rounded hover:bg-red-100">All Out of Stock</button>
            </div>
            <button onClick={() => setShowAddColor(!showAddColor)} className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-lime-600 text-white rounded-lg hover:bg-lime-700">
              <Plus className="w-3 h-3" /> Add Color
            </button>
          </div>

          {showAddColor && (
            <AddColorForm
              fabricId={fabric.id}
              nextOrder={fabricColors.length}
              onClose={() => setShowAddColor(false)}
              onSuccess={() => { setShowAddColor(false); onRefresh(); setSuccess('Color added'); }}
              setError={setError}
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {fabricColors.map(color => (
              <ColorCard
                key={color.id}
                color={color}
                isFireRetardantFabric={fabric.is_fire_retardant}
                onToggleStock={() => toggleColorStock(color)}
                onRefresh={onRefresh}
                setSuccess={setSuccess}
                setError={setError}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function EditFabricForm({ form, setForm, benefits, setBenefits, bestFor, setBestFor, saving, onSave, onCancel }: {
  form: Partial<DbFabric>;
  setForm: (f: Partial<DbFabric>) => void;
  benefits: string;
  setBenefits: (s: string) => void;
  bestFor: string;
  setBestFor: (s: string) => void;
  saving: boolean;
  onSave: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="bg-blue-50 border-t border-blue-200 p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Label</label>
          <input value={form.label || ''} onChange={e => setForm({ ...form, label: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Badge Text</label>
          <input value={form.badge_text || ''} onChange={e => setForm({ ...form, badge_text: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Short Description</label>
          <input value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="md:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Detailed Description</label>
          <textarea value={form.detailed_description || ''} onChange={e => setForm({ ...form, detailed_description: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Benefits (one per line)</label>
          <textarea value={benefits} onChange={e => setBenefits(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Best For (one per line)</label>
          <textarea value={bestFor} onChange={e => setBestFor(e.target.value)} rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">UV Protection</label>
          <input value={form.uv_protection || ''} onChange={e => setForm({ ...form, uv_protection: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Warranty (years)</label>
          <input type="number" value={form.warranty_years ?? 0} onChange={e => setForm({ ...form, warranty_years: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Made In</label>
          <input value={form.made_in || ''} onChange={e => setForm({ ...form, made_in: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Weight (g/m2)</label>
          <input type="number" value={form.weight_per_sqm ?? 0} onChange={e => setForm({ ...form, weight_per_sqm: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Display Order</label>
          <input type="number" value={form.display_order ?? 0} onChange={e => setForm({ ...form, display_order: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" checked={form.is_fire_retardant || false} onChange={e => setForm({ ...form, is_fire_retardant: e.target.checked })} className="rounded" />
          <label className="text-sm text-gray-700">Fire Retardant fabric line</label>
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <button onClick={onCancel} className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={onSave} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{saving ? 'Saving...' : 'Save Changes'}</button>
      </div>
    </div>
  );
}

function AddColorForm({ fabricId, nextOrder, onClose, onSuccess, setError }: {
  fabricId: string;
  nextOrder: number;
  onClose: () => void;
  onSuccess: () => void;
  setError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    color_name: '', image_url: '', text_color: '#FFFFFF', shade_factor: 0, is_fire_retardant: false,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async () => {
    if (!form.color_name) { setError('Color name is required'); return; }
    setSaving(true);
    const result = await apiCall('colors', 'POST', { ...form, fabric_type_id: fabricId, display_order: nextOrder });
    setSaving(false);
    if (result.success) { onSuccess(); } else { setError(result.error || 'Failed to add color'); }
  };

  return (
    <div className="mb-4 border border-lime-200 bg-lime-50 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h5 className="text-sm font-semibold text-gray-900">Add New Color</h5>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Color Name *</label>
          <input value={form.color_name} onChange={e => setForm({ ...form, color_name: e.target.value })} placeholder="e.g. Ocean Blue" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs font-medium text-gray-600 mb-1">Swatch Image URL (Shopify CDN)</label>
          <input value={form.image_url} onChange={e => setForm({ ...form, image_url: e.target.value })} placeholder="https://cdn.shopify.com/..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
          <select value={form.text_color} onChange={e => setForm({ ...form, text_color: e.target.value })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500">
            <option value="#FFFFFF">White (for dark swatches)</option>
            <option value="#000000">Black (for light swatches)</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Shade Factor (%)</label>
          <input type="number" step="0.1" value={form.shade_factor} onChange={e => setForm({ ...form, shade_factor: parseFloat(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-lime-500 focus:border-lime-500" />
        </div>
        <div className="flex items-center gap-2 pt-5">
          <input type="checkbox" checked={form.is_fire_retardant} onChange={e => setForm({ ...form, is_fire_retardant: e.target.checked })} className="rounded" />
          <label className="text-sm text-gray-700">Fire Retardant certified</label>
        </div>
      </div>
      {form.image_url && (
        <div className="mt-3">
          <label className="block text-xs font-medium text-gray-600 mb-1">Preview</label>
          <img src={form.image_url} alt="Preview" className="w-20 h-14 object-cover rounded border border-gray-300" />
        </div>
      )}
      <div className="flex justify-end gap-2 mt-3">
        <button onClick={onClose} className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50">Cancel</button>
        <button onClick={handleSubmit} disabled={saving} className="px-3 py-1.5 text-sm font-semibold bg-lime-600 text-white rounded-lg hover:bg-lime-700 disabled:opacity-50">{saving ? 'Adding...' : 'Add Color'}</button>
      </div>
    </div>
  );
}

function ColorCard({ color, isFireRetardantFabric, onToggleStock, onRefresh, setSuccess, setError }: {
  color: DbColor;
  isFireRetardantFabric: boolean;
  onToggleStock: () => void;
  onRefresh: () => void;
  setSuccess: (msg: string) => void;
  setError: (msg: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ ...color });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const saveEdit = async () => {
    setSaving(true);
    const result = await apiCall('colors', 'PUT', {
      id: color.id,
      color_name: editForm.color_name,
      image_url: editForm.image_url,
      text_color: editForm.text_color,
      shade_factor: editForm.shade_factor,
      is_fire_retardant: editForm.is_fire_retardant,
      display_order: editForm.display_order,
    });
    setSaving(false);
    if (result.success) { setEditing(false); onRefresh(); setSuccess(`${editForm.color_name} updated`); }
    else { setError(result.error || 'Failed to update'); }
  };

  const handleDelete = async () => {
    const result = await apiCall(`colors/${color.id}`, 'DELETE');
    if (result.success) { onRefresh(); setSuccess(`${color.color_name} deleted`); }
    else { setError(result.error || 'Failed to delete'); }
  };

  if (editing) {
    return (
      <div className="border border-blue-200 bg-blue-50 rounded-lg p-3">
        <div className="space-y-2">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Color Name</label>
            <input value={editForm.color_name} onChange={e => setEditForm({ ...editForm, color_name: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Image URL</label>
            <input value={editForm.image_url} onChange={e => setEditForm({ ...editForm, image_url: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:ring-2 focus:ring-blue-500" />
          </div>
          {editForm.image_url && <img src={editForm.image_url} alt="Preview" className="w-16 h-12 object-cover rounded border" />}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Text Color</label>
              <select value={editForm.text_color} onChange={e => setEditForm({ ...editForm, text_color: e.target.value })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm">
                <option value="#FFFFFF">White</option>
                <option value="#000000">Black</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">SF %</label>
              <input type="number" step="0.1" value={editForm.shade_factor} onChange={e => setEditForm({ ...editForm, shade_factor: parseFloat(e.target.value) || 0 })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Display Order</label>
              <input type="number" value={editForm.display_order} onChange={e => setEditForm({ ...editForm, display_order: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm" />
            </div>
            {isFireRetardantFabric && (
              <div className="flex items-center gap-2 pt-5">
                <input type="checkbox" checked={editForm.is_fire_retardant} onChange={e => setEditForm({ ...editForm, is_fire_retardant: e.target.checked })} className="rounded" />
                <label className="text-xs text-gray-700">FR Certified</label>
              </div>
            )}
          </div>
        </div>
        <div className="flex justify-between mt-3">
          <div>
            {!confirmDelete ? (
              <button onClick={() => setConfirmDelete(true)} className="text-xs text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
            ) : (
              <div className="flex items-center gap-1">
                <span className="text-xs text-red-600">Delete?</span>
                <button onClick={handleDelete} className="text-xs text-red-700 font-bold hover:underline">Yes</button>
                <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 hover:underline">No</button>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="px-2 py-1 text-xs text-gray-600 border border-gray-300 rounded hover:bg-gray-50">Cancel</button>
            <button onClick={saveEdit} disabled={saving} className="px-2 py-1 text-xs font-semibold bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50">{saving ? '...' : 'Save'}</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`border rounded-lg p-3 flex gap-3 ${color.is_in_stock ? 'border-gray-200 bg-white' : 'border-red-200 bg-red-50 opacity-70'}`}>
      <div className="relative w-16 h-12 rounded overflow-hidden flex-shrink-0 border border-gray-300">
        {color.image_url ? (
          <img src={color.image_url} alt={color.color_name} className="w-full h-full object-cover" loading="lazy" />
        ) : (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center text-xs text-gray-400">N/A</div>
        )}
        {!color.is_in_stock && (
          <div className="absolute inset-0 bg-red-900/40 flex items-center justify-center"><EyeOff className="w-4 h-4 text-white" /></div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1">
          <span className="text-sm font-medium text-gray-900 truncate">{color.color_name}</span>
          {isFireRetardantFabric && (
            <span className={`text-xs px-1 py-0.5 rounded font-medium ${color.is_fire_retardant ? 'bg-orange-100 text-orange-700' : 'bg-gray-100 text-gray-500'}`}>
              {color.is_fire_retardant ? 'FR' : 'Std'}
            </span>
          )}
        </div>
        <div className="text-xs text-gray-500">SF {Number(color.shade_factor)}%</div>
      </div>
      <div className="flex flex-col gap-1">
        <button onClick={onToggleStock} className={`px-2 py-1 text-xs font-medium rounded transition-colors ${color.is_in_stock ? 'bg-red-50 text-red-700 hover:bg-red-100' : 'bg-green-50 text-green-700 hover:bg-green-100'}`}>
          {color.is_in_stock ? 'Hide' : 'Show'}
        </button>
        <button onClick={() => { setEditForm({ ...color }); setEditing(true); }} className="px-2 py-1 text-xs font-medium bg-gray-50 text-gray-700 rounded hover:bg-gray-100">Edit</button>
      </div>
    </div>
  );
}

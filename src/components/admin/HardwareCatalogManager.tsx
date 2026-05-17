import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useToast } from '../ui/ToastProvider';
import { Wrench, Eye, EyeOff, Star, AlertTriangle, ImageOff, Copy, X, Search, GitMerge } from 'lucide-react';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface CatalogRow {
  id: string;
  sku: string | null;
  name: string;
  short_description: string | null;
  image_url: string | null;
  category_id: string | null;
  admin_category_override: string | null;
  price_nzd: number;
  is_active: boolean;
  admin_hidden: boolean;
  is_featured: boolean;
  merged_into_id: string | null;
  last_synced_at: string | null;
}

interface CategoryRow {
  id: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

interface PackRow {
  id: string;
  name: string;
  items: Array<{ catalog_id: string; qty: number }>;
}

type FilterKey = 'all' | 'included' | 'excluded' | 'missing_image' | 'uncategorised' | 'duplicates' | 'featured';

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export const HardwareCatalogManager: React.FC = () => {
  const { showToast } = useToast();
  const [rows, setRows] = useState<CatalogRow[]>([]);
  const [categories, setCategories] = useState<CategoryRow[]>([]);
  const [packs, setPacks] = useState<PackRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterKey>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [mergeGroupKey, setMergeGroupKey] = useState<string | null>(null);
  useBodyScrollLock(!!mergeGroupKey);
  const [newCategoryLabel, setNewCategoryLabel] = useState('');
  const [savingId, setSavingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [cat, cats, pk] = await Promise.all([
      supabase.from('hardware_catalog').select('*').order('name'),
      supabase.from('hardware_categories').select('*').order('display_order'),
      supabase.from('hardware_packs').select('id,name,items'),
    ]);
    if (cat.error) showToast(`Failed to load catalog: ${cat.error.message}`, 'error');
    setRows((cat.data as CatalogRow[]) || []);
    setCategories((cats.data as CategoryRow[]) || []);
    setPacks((pk.data as PackRow[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const packReferences = useMemo(() => {
    const m = new Map<string, string[]>();
    for (const p of packs) {
      for (const it of p.items || []) {
        const arr = m.get(it.catalog_id) || [];
        arr.push(p.name);
        m.set(it.catalog_id, arr);
      }
    }
    return m;
  }, [packs]);

  const duplicateGroups = useMemo(() => {
    const map = new Map<string, CatalogRow[]>();
    for (const r of rows) {
      const key = normalizeName(r.name);
      if (!key) continue;
      const arr = map.get(key) || [];
      arr.push(r);
      map.set(key, arr);
    }
    const dupes = new Map<string, CatalogRow[]>();
    for (const [k, arr] of map.entries()) {
      if (arr.length > 1) dupes.set(k, arr);
    }
    return dupes;
  }, [rows]);

  const duplicateIds = useMemo(() => {
    const s = new Set<string>();
    for (const arr of duplicateGroups.values()) for (const r of arr) s.add(r.id);
    return s;
  }, [duplicateGroups]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter(r => {
      if (q) {
        const hit = r.name.toLowerCase().includes(q) || (r.sku || '').toLowerCase().includes(q);
        if (!hit) return false;
      }
      if (filter === 'included') return !r.admin_hidden && r.is_active;
      if (filter === 'excluded') return r.admin_hidden;
      if (filter === 'missing_image') return !r.image_url;
      if (filter === 'uncategorised') return !r.category_id && !r.admin_category_override;
      if (filter === 'duplicates') return duplicateIds.has(r.id);
      if (filter === 'featured') return r.is_featured;
      return true;
    });
  }, [rows, search, filter, duplicateIds]);

  const updateRow = async (id: string, patch: Partial<CatalogRow>) => {
    setSavingId(id);
    const { error } = await supabase.from('hardware_catalog').update(patch).eq('id', id);
    setSavingId(null);
    if (error) {
      showToast(`Update failed: ${error.message}`, 'error');
      return false;
    }
    setRows(prev => prev.map(r => (r.id === id ? { ...r, ...patch } : r)));
    return true;
  };

  const toggleHidden = async (row: CatalogRow) => {
    if (!row.admin_hidden) {
      const refs = packReferences.get(row.id);
      if (refs && refs.length > 0) {
        const ok = confirm(`This item is referenced by pack(s): ${refs.join(', ')}.\nHiding it may break standard packs. Continue?`);
        if (!ok) return;
      }
    }
    await updateRow(row.id, { admin_hidden: !row.admin_hidden });
  };

  const toggleFeatured = (row: CatalogRow) => updateRow(row.id, { is_featured: !row.is_featured });

  const setCategory = (row: CatalogRow, value: string) => {
    const override = value === '' ? null : value;
    return updateRow(row.id, { admin_category_override: override });
  };

  const bulk = async (action: 'include' | 'exclude' | 'feature' | 'unfeature') => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const patch: Partial<CatalogRow> =
      action === 'include' ? { admin_hidden: false } :
      action === 'exclude' ? { admin_hidden: true } :
      action === 'feature' ? { is_featured: true } :
      { is_featured: false };
    const { error } = await supabase.from('hardware_catalog').update(patch).in('id', ids);
    if (error) { showToast(error.message, 'error'); return; }
    setRows(prev => prev.map(r => (selected.has(r.id) ? { ...r, ...patch } : r)));
    setSelected(new Set());
    showToast(`Updated ${ids.length} items`, 'success');
  };

  const bulkSetCategory = async (value: string) => {
    if (selected.size === 0) return;
    const ids = Array.from(selected);
    const override = value === '' ? null : value;
    const { error } = await supabase.from('hardware_catalog').update({ admin_category_override: override }).in('id', ids);
    if (error) { showToast(error.message, 'error'); return; }
    setRows(prev => prev.map(r => (selected.has(r.id) ? { ...r, admin_category_override: override } : r)));
    setSelected(new Set());
    showToast(`Reassigned ${ids.length} items`, 'success');
  };

  const addCategory = async () => {
    const label = newCategoryLabel.trim();
    if (!label) return;
    const id = label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
    if (!id) return;
    const maxOrder = categories.reduce((m, c) => Math.max(m, c.display_order), 0);
    const { error } = await supabase.from('hardware_categories').insert({
      id, label, display_order: maxOrder + 10, is_active: true,
    });
    if (error) { showToast(error.message, 'error'); return; }
    setNewCategoryLabel('');
    showToast('Category added', 'success');
    load();
  };

  const openMerge = (row: CatalogRow) => {
    const key = normalizeName(row.name);
    setMergeGroupKey(key);
  };

  const performMerge = async (winnerId: string) => {
    if (!mergeGroupKey) return;
    const group = duplicateGroups.get(mergeGroupKey) || [];
    const losers = group.filter(r => r.id !== winnerId);
    if (losers.length === 0) { setMergeGroupKey(null); return; }

    const loserIds = losers.map(r => r.id);

    for (const p of packs) {
      const hasLoser = (p.items || []).some(it => loserIds.includes(it.catalog_id));
      if (hasLoser) {
        const nextItems = (p.items || []).map(it =>
          loserIds.includes(it.catalog_id) ? { ...it, catalog_id: winnerId } : it
        );
        await supabase.from('hardware_packs').update({ items: nextItems }).eq('id', p.id);
      }
    }

    const { error } = await supabase
      .from('hardware_catalog')
      .update({ merged_into_id: winnerId, admin_hidden: true })
      .in('id', loserIds);
    if (error) { showToast(error.message, 'error'); return; }

    showToast(`Merged ${loserIds.length} item(s) into winner`, 'success');
    setMergeGroupKey(null);
    load();
  };

  const categoryLabel = (id: string | null) => categories.find(c => c.id === id)?.label || 'Other';

  const mergeGroup = mergeGroupKey ? duplicateGroups.get(mergeGroupKey) || [] : [];

  const stats = useMemo(() => ({
    total: rows.length,
    hidden: rows.filter(r => r.admin_hidden).length,
    missingImage: rows.filter(r => !r.image_url).length,
    uncategorised: rows.filter(r => !r.category_id && !r.admin_category_override).length,
    duplicates: duplicateIds.size,
    featured: rows.filter(r => r.is_featured).length,
  }), [rows, duplicateIds]);

  const allVisibleSelected = filtered.length > 0 && filtered.every(r => selected.has(r.id));
  const toggleSelectAll = () => {
    setSelected(prev => {
      if (allVisibleSelected) {
        const next = new Set(prev);
        for (const r of filtered) next.delete(r.id);
        return next;
      }
      const next = new Set(prev);
      for (const r of filtered) next.add(r.id);
      return next;
    });
  };

  const filters: Array<{ key: FilterKey; label: string; count: number }> = [
    { key: 'all', label: 'All', count: stats.total },
    { key: 'included', label: 'Included', count: stats.total - stats.hidden },
    { key: 'excluded', label: 'Excluded', count: stats.hidden },
    { key: 'missing_image', label: 'Missing image', count: stats.missingImage },
    { key: 'uncategorised', label: 'Uncategorised', count: stats.uncategorised },
    { key: 'duplicates', label: 'Duplicates', count: stats.duplicates },
    { key: 'featured', label: 'Featured', count: stats.featured },
  ];

  return (
    <Card className="p-5">
      <div className="flex flex-col gap-1 mb-4">
        <h3 className="text-lg font-semibold text-forest-900">Hardware Catalog Manager</h3>
        <p className="text-sm text-gray-600">
          Include or exclude items, mark favourites, reassign categories, and merge duplicate rows. Changes apply to the configurator immediately.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 mb-4">
        {filters.map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`rounded-lg border px-3 py-2 text-left transition ${
              filter === f.key
                ? 'border-[#307C31] bg-[#307C31]/5 text-[#01312D]'
                : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
            }`}
          >
            <div className="text-[11px] font-semibold uppercase tracking-wider">{f.label}</div>
            <div className="text-lg font-bold">{f.count}</div>
          </button>
        ))}
      </div>

      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search name or SKU..."
            className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm focus:border-[#307C31] focus:outline-none"
          />
        </div>
        <Button size="sm" variant="outline" onClick={load}>Refresh</Button>
      </div>

      {selected.size > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2 rounded-lg border border-[#307C31]/30 bg-[#307C31]/5 px-3 py-2">
          <span className="text-sm font-semibold text-[#01312D]">{selected.size} selected</span>
          <Button size="sm" variant="outline" onClick={() => bulk('include')}>Include</Button>
          <Button size="sm" variant="outline" onClick={() => bulk('exclude')}>Exclude</Button>
          <Button size="sm" variant="outline" onClick={() => bulk('feature')}>Feature</Button>
          <Button size="sm" variant="outline" onClick={() => bulk('unfeature')}>Unfeature</Button>
          <select
            onChange={e => { if (e.target.value) bulkSetCategory(e.target.value === '__clear__' ? '' : e.target.value); e.currentTarget.value = ''; }}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
            defaultValue=""
          >
            <option value="" disabled>Reassign category...</option>
            <option value="__clear__">Clear override</option>
            {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
          </select>
          <button onClick={() => setSelected(new Set())} className="ml-auto text-xs text-slate-500 hover:text-slate-700">Clear selection</button>
        </div>
      )}

      <div className="overflow-x-auto rounded-lg border border-slate-200">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-600">
            <tr>
              <th className="px-3 py-2 text-left">
                <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
              </th>
              <th className="px-3 py-2 text-left">Item</th>
              <th className="px-3 py-2 text-left">SKU</th>
              <th className="px-3 py-2 text-left">Category</th>
              <th className="px-3 py-2 text-right">Price NZD</th>
              <th className="px-3 py-2 text-left">Flags</th>
              <th className="px-3 py-2 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">Loading...</td></tr>
            )}
            {!loading && filtered.length === 0 && (
              <tr><td colSpan={7} className="px-3 py-6 text-center text-slate-500">No items match this filter.</td></tr>
            )}
            {!loading && filtered.map(r => {
              const isDup = duplicateIds.has(r.id);
              const currentCat = r.admin_category_override || r.category_id || '';
              const inPacks = packReferences.get(r.id) || [];
              const isSelected = selected.has(r.id);
              return (
                <tr key={r.id} className={`${r.admin_hidden ? 'bg-slate-50/60 opacity-70' : ''} ${isSelected ? 'bg-[#307C31]/5' : ''}`}>
                  <td className="px-3 py-2 align-top">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => {
                        setSelected(prev => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id); else next.add(r.id);
                          return next;
                        });
                      }}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded bg-slate-100 flex items-center justify-center">
                        {r.image_url ? (
                          <img src={r.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <Wrench className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-slate-900 line-clamp-1">{r.name}</div>
                        {r.short_description && <div className="text-xs text-slate-500 line-clamp-1">{r.short_description}</div>}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-xs text-slate-600">{r.sku || '-'}</td>
                  <td className="px-3 py-2">
                    <select
                      value={currentCat}
                      onChange={e => setCategory(r, e.target.value)}
                      disabled={savingId === r.id}
                      className="rounded border border-slate-200 bg-white px-2 py-1 text-xs"
                    >
                      <option value="">Other</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                    {r.admin_category_override && (
                      <div className="text-[10px] text-slate-500 mt-0.5">
                        overrides: {categoryLabel(r.category_id)}
                      </div>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-xs font-semibold text-slate-700">${Number(r.price_nzd).toFixed(2)}</td>
                  <td className="px-3 py-2">
                    <div className="flex flex-wrap gap-1">
                      {isDup && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700">
                          <Copy className="h-3 w-3" /> Duplicate
                        </span>
                      )}
                      {!r.image_url && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          <ImageOff className="h-3 w-3" /> No image
                        </span>
                      )}
                      {!r.category_id && !r.admin_category_override && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          Uncategorised
                        </span>
                      )}
                      {r.is_featured && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#307C31]/10 px-2 py-0.5 text-[10px] font-semibold text-[#01312D]">
                          <Star className="h-3 w-3" /> Featured
                        </span>
                      )}
                      {inPacks.length > 0 && (
                        <span
                          title={`Used in packs: ${inPacks.join(', ')}`}
                          className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-semibold text-blue-700"
                        >
                          <AlertTriangle className="h-3 w-3" /> In pack
                        </span>
                      )}
                      {r.admin_hidden && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-semibold text-red-700">
                          Hidden
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => toggleFeatured(r)}
                        title={r.is_featured ? 'Remove featured' : 'Mark as featured'}
                        className={`rounded p-1.5 ${r.is_featured ? 'text-[#D97706]' : 'text-slate-400 hover:text-slate-700'}`}
                      >
                        <Star className={`h-4 w-4 ${r.is_featured ? 'fill-current' : ''}`} />
                      </button>
                      {isDup && (
                        <button
                          onClick={() => openMerge(r)}
                          title="Merge duplicates"
                          className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                        >
                          <GitMerge className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => toggleHidden(r)}
                        title={r.admin_hidden ? 'Include in configurator' : 'Exclude from configurator'}
                        className={`rounded p-1.5 ${r.admin_hidden ? 'text-slate-400 hover:text-slate-700' : 'text-[#307C31] hover:bg-[#307C31]/10'}`}
                      >
                        {r.admin_hidden ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="mt-6 border-t border-slate-200 pt-4">
        <h4 className="text-sm font-bold text-slate-800 mb-2">Categories</h4>
        <div className="flex flex-wrap gap-2 mb-3">
          {categories.map(c => (
            <span key={c.id} className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
              {c.label}
              <span className="text-slate-400">#{c.display_order}</span>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newCategoryLabel}
            onChange={e => setNewCategoryLabel(e.target.value)}
            placeholder="New category label..."
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:border-[#307C31] focus:outline-none"
          />
          <Button size="sm" variant="primary" onClick={addCategory}>Add Category</Button>
        </div>
      </div>

      {mergeGroupKey && mergeGroup.length > 0 && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-4" onClick={() => setMergeGroupKey(null)}>
          <div className="w-full max-w-xl rounded-2xl bg-white p-5 shadow-2xl max-h-[90vh] overflow-y-auto overscroll-contain" onClick={e => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-3">
              <div>
                <h4 className="text-lg font-bold text-slate-900">Merge duplicates</h4>
                <p className="text-sm text-slate-600">Choose the winner. Pack references will be re-pointed to the winner, the other rows will be hidden and marked as merged.</p>
              </div>
              <button onClick={() => setMergeGroupKey(null)} className="rounded p-1.5 text-slate-500 hover:bg-slate-100">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {mergeGroup.map(r => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <div className="h-10 w-10 overflow-hidden rounded bg-slate-100 flex items-center justify-center">
                    {r.image_url ? <img src={r.image_url} alt="" className="h-full w-full object-cover" /> : <Wrench className="h-4 w-4 text-slate-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900">{r.name}</div>
                    <div className="text-xs text-slate-500">SKU {r.sku || '-'} • ${Number(r.price_nzd).toFixed(2)} • {categoryLabel(r.category_id)}</div>
                  </div>
                  <Button size="sm" variant="primary" onClick={() => performMerge(r.id)}>Keep this one</Button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

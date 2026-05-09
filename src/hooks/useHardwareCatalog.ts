import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

export interface HardwareCategory {
  id: string;
  label: string;
  display_order: number;
}

export interface HardwareItem {
  id: string;
  shopify_variant_id: string | null;
  shopify_product_id: string | null;
  sku: string | null;
  name: string;
  short_description: string;
  long_description: string;
  material: string;
  image_url: string;
  category_id: string | null;
  price_nzd: number;
  compare_at_nzd: number | null;
  deduction_mm: number;
  edge_types: string[];
  display_order: number;
}

export interface HardwarePack {
  id: string;
  name: string;
  edge_type: 'webbing' | 'cabled';
  corners: number;
  items: Array<{ catalog_id: string; qty: number }>;
  price_nzd_override: number | null;
}

export interface HardwareCatalogData {
  items: HardwareItem[];
  categories: HardwareCategory[];
  packs: HardwarePack[];
  loading: boolean;
  error: string | null;
}

const EMPTY: HardwareCatalogData = { items: [], categories: [], packs: [], loading: true, error: null };

export function useHardwareCatalog(): HardwareCatalogData {
  const [state, setState] = useState<HardwareCatalogData>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [cats, items, packs] = await Promise.all([
        supabase.from('hardware_categories').select('id,label,display_order').eq('is_active', true).order('display_order'),
        supabase.from('hardware_catalog').select('*').eq('is_active', true).order('display_order'),
        supabase.from('hardware_packs').select('*').eq('is_active', true),
      ]);
      if (cancelled) return;
      const err = cats.error?.message || items.error?.message || packs.error?.message || null;
      setState({
        categories: cats.data || [],
        items: (items.data as HardwareItem[]) || [],
        packs: (packs.data as HardwarePack[]) || [],
        loading: false,
        error: err,
      });
    })();
    return () => { cancelled = true; };
  }, []);

  return state;
}

export function getDefaultPack(
  packs: HardwarePack[],
  edgeType: 'webbing' | 'cabled' | '',
  corners: number,
): HardwarePack | null {
  if (!edgeType || !corners) return null;
  return packs.find(p => p.edge_type === edgeType && p.corners === corners) || null;
}

export function groupItemsByCategory(items: HardwareItem[], categories: HardwareCategory[]): Array<{ category: HardwareCategory; items: HardwareItem[] }> {
  const map = new Map<string, HardwareItem[]>();
  for (const it of items) {
    const key = it.category_id || '_uncategorised';
    const arr = map.get(key) || [];
    arr.push(it);
    map.set(key, arr);
  }
  const out: Array<{ category: HardwareCategory; items: HardwareItem[] }> = [];
  for (const cat of categories) {
    const bucket = map.get(cat.id);
    if (bucket && bucket.length > 0) out.push({ category: cat, items: bucket });
  }
  const misc = map.get('_uncategorised');
  if (misc && misc.length > 0) out.push({ category: { id: '_uncategorised', label: 'Other', display_order: 9999 }, items: misc });
  return out;
}

export function useHardwareSearch(items: HardwareItem[], query: string): HardwareItem[] {
  return useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(it => {
      return (
        it.name.toLowerCase().includes(q) ||
        (it.sku || '').toLowerCase().includes(q) ||
        it.short_description.toLowerCase().includes(q)
      );
    });
  }, [items, query]);
}

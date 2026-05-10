import { useState, useEffect } from 'react';
import { Fabric, FabricColor, FabricSpec } from '../types';
import { FABRICS } from '../data/fabrics';

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
  short_name?: string;
  tag?: string;
  chip_color?: string;
  tagline?: string;
  image_lifestyle_url?: string;
  image_swatch_url?: string;
  image_macro_url?: string;
  highlights?: string[] | unknown;
  spec_extras?: FabricSpec[] | unknown;
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

function mapDbToFabric(dbFabrics: DbFabric[], dbColors: DbColor[]): Fabric[] {
  return dbFabrics.map((f) => {
    const colors: FabricColor[] = dbColors
      .filter((c) => c.fabric_type_id === f.id)
      .sort((a, b) => a.display_order - b.display_order)
      .map((c) => ({
        name: c.color_name,
        imageUrl: c.image_url,
        textColor: c.text_color,
        shadeFactor: Number(c.shade_factor) || undefined,
        isFireRetardant: c.is_fire_retardant,
      }));

    return {
      id: f.id,
      label: f.label,
      description: f.description,
      detailedDescription: f.detailed_description,
      benefits: Array.isArray(f.benefits) ? f.benefits : [],
      bestFor: Array.isArray(f.best_for) ? f.best_for : [],
      uvProtection: f.uv_protection,
      colors,
      pricePerSqm: 0,
      warrantyYears: f.warranty_years,
      madeIn: f.made_in,
      weightPerSqm: f.weight_per_sqm,
      badgeText: f.badge_text,
      isFireRetardant: f.is_fire_retardant,
      shortName: f.short_name || undefined,
      tag: f.tag || undefined,
      chipColor: f.chip_color || undefined,
      tagline: f.tagline || undefined,
      imageLifestyleUrl: f.image_lifestyle_url || undefined,
      imageSwatchUrl: f.image_swatch_url || undefined,
      imageMacroUrl: f.image_macro_url || undefined,
      highlights: Array.isArray(f.highlights) ? (f.highlights as string[]) : [],
      specExtras: Array.isArray(f.spec_extras) ? (f.spec_extras as FabricSpec[]) : [],
    };
  });
}

const CACHE_DURATION_MS = 5 * 60 * 1000;
let cachedFabrics: Fabric[] | null = null;
let cacheTimestamp: number | null = null;

interface FabricCatalogState {
  fabrics: Fabric[];
  loading: boolean;
  error: string | null;
}

export function useFabricCatalog(): FabricCatalogState & { refetch: () => Promise<void> } {
  const [state, setState] = useState<FabricCatalogState>(() => {
    if (cachedFabrics && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      return { fabrics: cachedFabrics, loading: false, error: null };
    }
    return { fabrics: FABRICS, loading: true, error: null };
  });

  const fetchData = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      if (!supabaseUrl || !supabaseKey) throw new Error('Supabase configuration missing');

      const response = await fetch(`${supabaseUrl}/functions/v1/fabric-catalog`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const result = await response.json();

      if (result.success && result.data) {
        const fabrics = mapDbToFabric(result.data.fabrics || [], result.data.colors || []);
        if (fabrics.length > 0) {
          cachedFabrics = fabrics;
          cacheTimestamp = Date.now();
          setState({ fabrics, loading: false, error: null });
        } else {
          setState({ fabrics: FABRICS, loading: false, error: null });
        }
      } else {
        throw new Error('No fabric catalog data returned');
      }
    } catch (err) {
      console.warn('Failed to load fabric catalog from DB, using fallback:', err);
      setState({ fabrics: FABRICS, loading: false, error: err instanceof Error ? err.message : 'Unknown error' });
    }
  };

  useEffect(() => {
    if (cachedFabrics && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      setState({ fabrics: cachedFabrics, loading: false, error: null });
      return;
    }
    fetchData();
  }, []);

  return { ...state, refetch: fetchData };
}

export function clearFabricCatalogCache() {
  cachedFabrics = null;
  cacheTimestamp = null;
}

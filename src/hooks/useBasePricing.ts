import { useState, useEffect } from 'react';

export interface FabricType {
  id: string;
  label: string;
  display_order: number;
  is_active: boolean;
}

export interface FabricPricingRow {
  id: string;
  edge_type: 'webbing' | 'cabled';
  perimeter: number;
  prices: Record<string, number>;
}

export interface CostRow {
  id: string;
  edge_type: 'webbing' | 'cabled';
  corners: number;
  cost_nzd: number;
}

export interface EdgeFeatureRow {
  id: string;
  edge_type: 'webbing' | 'cabled';
  feature_name: string;
  min_perimeter: number;
  max_perimeter: number;
  feature_value: number;
}

export interface BasePricingData {
  fabricTypes: FabricType[];
  fabricPricing: FabricPricingRow[];
  cornerCosts: CostRow[];
  hardwareCosts: CostRow[];
  edgeFeatures: EdgeFeatureRow[];
}

interface BasePricingState {
  data: BasePricingData | null;
  loading: boolean;
  error: string | null;
}

const CACHE_DURATION_MS = 5 * 60 * 1000;

let cachedData: BasePricingData | null = null;
let cacheTimestamp: number | null = null;

export function useBasePricing(): BasePricingState & { refetch: () => Promise<void> } {
  const [state, setState] = useState<BasePricingState>(() => {
    if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      return { data: cachedData, loading: false, error: null };
    }
    return { data: null, loading: true, error: null };
  });

  const fetchData = async () => {
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

      if (!supabaseUrl || !supabaseKey) {
        throw new Error('Supabase configuration missing');
      }

      const response = await fetch(`${supabaseUrl}/functions/v1/base-pricing`, {
        headers: {
          'Authorization': `Bearer ${supabaseKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const result = await response.json();

      if (result.success && result.data) {
        const data: BasePricingData = {
          fabricTypes: result.data.fabricTypes || [],
          fabricPricing: (result.data.fabricPricing || []).map((r: FabricPricingRow) => ({
            ...r,
            perimeter: Number(r.perimeter),
          })),
          cornerCosts: (result.data.cornerCosts || []).map((r: CostRow) => ({
            ...r,
            cost_nzd: Number(r.cost_nzd),
          })),
          hardwareCosts: (result.data.hardwareCosts || []).map((r: CostRow) => ({
            ...r,
            cost_nzd: Number(r.cost_nzd),
          })),
          edgeFeatures: (result.data.edgeFeatures || []).map((r: EdgeFeatureRow) => ({
            ...r,
            min_perimeter: Number(r.min_perimeter),
            max_perimeter: Number(r.max_perimeter),
            feature_value: Number(r.feature_value),
          })),
        };

        cachedData = data;
        cacheTimestamp = Date.now();

        setState({ data, loading: false, error: null });
      } else {
        throw new Error('No base pricing data returned');
      }
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : 'Unknown error',
      }));
    }
  };

  useEffect(() => {
    if (cachedData && cacheTimestamp && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      setState({ data: cachedData, loading: false, error: null });
      return;
    }
    fetchData();
  }, []);

  return { ...state, refetch: fetchData };
}

export function getFabricPriceFromDB(
  data: BasePricingData,
  perimeter: number,
  fabricType: string,
  edgeType: 'webbing' | 'cabled'
): number {
  const roundedPerimeter = Math.round(perimeter * 2) / 2;

  const rows = data.fabricPricing.filter((r) => r.edge_type === edgeType);
  if (rows.length === 0) return 0;

  let closest = rows[0];
  let minDiff = Math.abs(roundedPerimeter - closest.perimeter);

  for (const row of rows) {
    const diff = Math.abs(roundedPerimeter - row.perimeter);
    if (diff < minDiff) {
      minDiff = diff;
      closest = row;
    }
  }

  return closest.prices[fabricType] ?? 0;
}

export function getCornerCostFromDB(
  data: BasePricingData,
  corners: number,
  edgeType: 'webbing' | 'cabled'
): number {
  const row = data.cornerCosts.find((r) => r.edge_type === edgeType && r.corners === corners);
  return row?.cost_nzd ?? 0;
}

export function getHardwareCostFromDB(
  data: BasePricingData,
  corners: number,
  edgeType: 'webbing' | 'cabled'
): number {
  const row = data.hardwareCosts.find((r) => r.edge_type === edgeType && r.corners === corners);
  return row?.cost_nzd ?? 0;
}

export function getEdgeFeatureFromDB(
  data: BasePricingData,
  perimeter: number,
  edgeType: 'webbing' | 'cabled',
  featureName: string
): number {
  const row = data.edgeFeatures.find(
    (r) =>
      r.edge_type === edgeType &&
      r.feature_name === featureName &&
      perimeter >= r.min_perimeter &&
      perimeter <= r.max_perimeter
  );
  return row?.feature_value ?? 0;
}

export function clearBasePricingCache() {
  cachedData = null;
  cacheTimestamp = null;
}

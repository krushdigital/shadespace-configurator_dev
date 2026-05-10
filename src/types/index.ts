export interface Point {
  x: number;
  y: number;
}

export interface ConfiguratorState {
  step: number;
  fabricType: string;
  fabricColor: string;
  edgeType: EdgeType | '';
  corners: number;
  unit: 'metric' | 'imperial';
  measurementOption: 'adjust' | 'exact';
  points: Point[];
  measurements: {
    [key: string]: number;
  };
  fixingHeights: number[];
  fixingTypes?: ('post' | 'building')[];
  attachmentTypes?: string[];
  eyeOrientations?: ('horizontal' | 'vertical')[];
  fixingPointsInstalled?: boolean;
  currency: string;
  diagonalsInitiallyProvided?: boolean;
  heightsProvidedByUser?: boolean;
  hasManuallyAdjustedShape?: boolean;
  hardwareSelectionMode?: 'standard' | 'manual' | 'none';
  cornerHardware?: { [cornerIndex: number]: CornerHardwareLine[] };
}

export interface CornerHardwareLine {
  catalogId: string;
  qty: number;
  name: string;
  sku: string | null;
  priceNzd: number;
  livePrice?: number;
  livePriceCurrency?: string;
}

export interface ShadeCalculations {
  area: number;
  perimeter: number;
  fabricCost: number;
  edgeCost: number;
  hardwareCost: number;
  hardwareBreakdown?: {
    mode: 'standard' | 'manual' | 'none';
    subtotalNzd: number;
    perCornerNzd: number[];
    sailOnlyPriceNzd: number;
    hardwareOnlyPriceNzd: number;
    liveCurrency?: string;
    hardwareOnlyLivePrice?: number;
    perCornerLivePrice?: number[];
    standardPackLivePrice?: number | null;
  };
  totalPrice: number;
  webbingWidth: number;
  wireThickness?: number;
  totalWeightGrams: number;
}

export type FabricType = string;
export type EdgeType = 'webbing' | 'cabled' | 'none';

export interface Fabric {
  id: string;
  label: string;
  description: string;
  detailedDescription: string;
  benefits: string[];
  bestFor: string[];
  uvProtection: string;
  colors: FabricColor[];
  pricePerSqm: number;
  warrantyYears: number;
  madeIn: string;
  weightPerSqm: number;
  badgeText?: string;
  isFireRetardant?: boolean;
}

export interface FabricColor {
  name: string;
  imageUrl: string;
  textColor: string;
  shadeFactor?: number;
  isFireRetardant?: boolean;
}

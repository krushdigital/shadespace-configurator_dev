export interface Point {
  x: number;
  y: number;
}

export type FixedShapeType = 'triangle' | 'right-angle-triangle' | 'square' | 'rectangle';

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
  includeGrease?: boolean;
  shapeMode?: 'custom' | 'fixed';
  fixedShapeType?: FixedShapeType | null;
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
    greaseLivePrice?: number;
    greaseIncluded?: boolean;
  };
  totalPrice: number;
  webbingWidth: number;
  wireThickness?: number;
  totalWeightGrams: number;
}

type FabricType = string;
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
  shortName?: string;
  tag?: string;
  chipColor?: string;
  tagline?: string;
  imageLifestyleUrl?: string;
  imageSwatchUrl?: string;
  imageMacroUrl?: string;
  highlights?: string[];
  specExtras?: FabricSpec[];
}

export interface FabricSpec {
  label: string;
  value: string;
  numeric?: number;
  higherBetter?: boolean;
  featured?: boolean;
}

export interface FabricColor {
  name: string;
  imageUrl: string;
  textColor: string;
  shadeFactor?: number;
  isFireRetardant?: boolean;
}

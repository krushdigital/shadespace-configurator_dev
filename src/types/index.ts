export interface Point {
  x: number;
  y: number;
}

export interface ConfiguratorState {
  step: number;
  fabricType: FabricType;
  fabricColor: string;
  edgeType: EdgeType;
  corners: number;
  unit: 'metric' | 'imperial';
  measurementOption: 'adjust' | 'exact';
  points: Point[];
  measurements: {
    [key: string]: number;
  };
  fixingHeights: number[];
  fixingTypes?: ('post' | 'building')[];
  eyeOrientations?: ('horizontal' | 'vertical')[];
  fixingPointsInstalled?: boolean;
  currency: string;
  diagonalsInitiallyProvided?: boolean;
  heightsProvidedByUser?: boolean;
  view3DMode?: 'hidden' | '2d' | '3d';
  tensionPreset?: TensionPreset;
  animationEnabled?: boolean;
  windIntensity?: number;
  sail3DOffset?: { x: number; y: number; z: number };
}

export interface ShadeCalculations {
  area: number;
  perimeter: number;
  fabricCost: number;
  edgeCost: number;
  hardwareCost: number;
  totalPrice: number;
  webbingWidth: number;
  wireThickness?: number;
  totalWeightGrams: number;
}

export type FabricType = 'monotec370' | 'extrablock330' | 'shadetec320';
export type EdgeType = 'webbing' | 'cabled';

export interface Fabric {
  id: FabricType;
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
}

export interface FabricColor {
  name: string;
  imageUrl: string;
  textColor: string;
  shadeFactor?: number;
}

export type TensionPreset = 'low' | 'medium' | 'high';
export type HardwareCornerType = 'd-ring' | 'eye-bolt' | 'eye-plate';
export type TensionerType = 'turnbuckle-m6' | 'turnbuckle-m8' | 'ratchet';

export interface View3DConfig {
  cameraPosition?: { x: number; y: number; z: number };
  cameraTarget?: { x: number; y: number; z: number };
  qualityLevel?: 'low' | 'medium' | 'high' | 'auto';
  showGrid?: boolean;
  showAxes?: boolean;
}

export interface AnimationState {
  enabled: boolean;
  windIntensity: number;
  windDirection: { x: number; y: number; z: number };
  time: number;
}
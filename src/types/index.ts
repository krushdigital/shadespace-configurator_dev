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
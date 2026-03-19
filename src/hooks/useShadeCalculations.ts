import { useMemo } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../types';
import {
  CORNER_COSTS,
  CABLED_CORNER_COSTS,
  HARDWARE_COSTS,
  CABLED_HARDWARE_COSTS,
  getFabricPriceFromPerimeter,
  getWebbingWidth,
  getWireThickness
} from '../data/pricing';
import { FABRICS } from '../data/fabrics';
import { calculatePolygonArea } from '../utils/geometry';
import { PricingSetting, getPricingForCurrency } from './usePricingSettings';
import {
  BasePricingData,
  getFabricPriceFromDB,
  getCornerCostFromDB,
  getHardwareCostFromDB,
  getEdgeFeatureFromDB
} from './useBasePricing';

export function useShadeCalculations(
  config: ConfiguratorState,
  pricingSettingsMap?: Record<string, PricingSetting>,
  basePricingData?: BasePricingData | null
): ShadeCalculations {
  return useMemo(() => {
    let perimeterMM = 0;
    const edgeKeys = [];

    for (let i = 0; i < config.corners; i++) {
      const nextIndex = (i + 1) % config.corners;
      const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
      edgeKeys.push(edgeKey);

      if (config.measurements[edgeKey]) {
        perimeterMM += config.measurements[edgeKey];
      }
    }

    const hasAllEdgeMeasurements = edgeKeys.every(key =>
      config.measurements[key] && config.measurements[key] > 0
    );

    if (!hasAllEdgeMeasurements) {
      return {
        area: 0,
        perimeter: 0,
        fabricCost: 0,
        edgeCost: 0,
        hardwareCost: 0,
        totalPrice: 0,
        webbingWidth: 0,
        totalWeightGrams: 0
      };
    }

    const perimeterM = perimeterMM / 1000;
    const adjustedPerimeter = Math.round(perimeterM / 0.5) * 0.5;
    const area = calculatePolygonArea(config.measurements, config.corners);
    const edgeType = config.edgeType as 'webbing' | 'cabled';

    let webbingWidth: number;
    let wireThickness: number;

    if (basePricingData) {
      webbingWidth = getEdgeFeatureFromDB(basePricingData, adjustedPerimeter, 'webbing', 'webbing_width') || 50;
      wireThickness = getEdgeFeatureFromDB(basePricingData, adjustedPerimeter, 'cabled', 'wire_thickness') || 4;
    } else {
      webbingWidth = getWebbingWidth(adjustedPerimeter);
      wireThickness = getWireThickness(adjustedPerimeter);
    }

    let fabricCostNZD = 0;
    let edgeCostNZD = 0;
    let cornerCostNZD = 0;
    let hardwareCostNZD = 0;

    if (basePricingData) {
      fabricCostNZD = getFabricPriceFromDB(basePricingData, adjustedPerimeter, config.fabricType, edgeType);
      edgeCostNZD = 0;
      cornerCostNZD = getCornerCostFromDB(basePricingData, config.corners, edgeType);
      if (config.measurementOption === 'adjust') {
        hardwareCostNZD = getHardwareCostFromDB(basePricingData, config.corners, edgeType);
      }
    } else {
      if (config.edgeType === 'webbing') {
        fabricCostNZD = getFabricPriceFromPerimeter(adjustedPerimeter, config.fabricType, 'webbing');
        edgeCostNZD = 0;
        cornerCostNZD = CORNER_COSTS[config.corners as keyof typeof CORNER_COSTS] || 0;
        if (config.measurementOption === 'adjust') {
          hardwareCostNZD = HARDWARE_COSTS[config.corners as keyof typeof HARDWARE_COSTS] || 0;
        }
      } else if (config.edgeType === 'cabled') {
        fabricCostNZD = getFabricPriceFromPerimeter(adjustedPerimeter, config.fabricType, 'cabled');
        edgeCostNZD = 0;
        cornerCostNZD = CABLED_CORNER_COSTS[config.corners as keyof typeof CABLED_CORNER_COSTS] || 0;
        if (config.measurementOption === 'adjust') {
          hardwareCostNZD = CABLED_HARDWARE_COSTS[config.corners as keyof typeof CABLED_HARDWARE_COSTS] || 0;
        }
      }
    }

    const baseNZD = fabricCostNZD + edgeCostNZD + cornerCostNZD + hardwareCostNZD;

    const pricing = pricingSettingsMap
      ? getPricingForCurrency(pricingSettingsMap, config.currency)
      : { marketMarkup: 1.0, zonosDhlMarkup: 1.0, exchangeRate: 1.0, symbol: 'NZ$' };

    const markedUpNZD = baseNZD * pricing.marketMarkup;
    const zonosDhlCostNZD = baseNZD * (pricing.zonosDhlMarkup - 1);
    const totalNZD = markedUpNZD + zonosDhlCostNZD;
    const convertedTotal = totalNZD * pricing.exchangeRate;

    const markedUpFactor = pricing.marketMarkup * pricing.exchangeRate;
    const zonosFactor = (pricing.zonosDhlMarkup - 1) * pricing.exchangeRate;
    const combinedFactor = markedUpFactor + zonosFactor;

    const fabricCost = fabricCostNZD * combinedFactor;
    const edgeCost = edgeCostNZD * combinedFactor;
    const hardwareCost = (cornerCostNZD + hardwareCostNZD) * combinedFactor;
    const totalPrice = Math.ceil(convertedTotal);

    const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
    const fabricWeightPerSqm = selectedFabric?.weightPerSqm || 370;
    const areaSqm = area;

    const totalSailWeightGrams =
      (fabricWeightPerSqm * areaSqm) +
      (config.corners * 200);

    const perimeterWeightPerMeter = config.edgeType === 'cabled' ? 140 : 100;
    const perimeterWeightGrams = Math.round(perimeterM) * perimeterWeightPerMeter;

    const hardwareWeightGrams = config.measurementOption === 'adjust'
      ? config.corners * 380
      : 0;

    const totalWeightGrams = totalSailWeightGrams + perimeterWeightGrams + hardwareWeightGrams;

    return {
      area,
      perimeter: perimeterM,
      fabricCost,
      edgeCost,
      hardwareCost,
      totalPrice,
      webbingWidth,
      wireThickness,
      totalWeightGrams
    };
  }, [
    config.measurements,
    config.corners,
    config.edgeType,
    config.fabricType,
    config.measurementOption,
    config.currency,
    config.unit,
    pricingSettingsMap,
    basePricingData
  ]);
}

import { useMemo } from 'react';
import { ConfiguratorState, ShadeCalculations, CornerHardwareLine } from '../types';
import type { HardwarePack, HardwareItem } from './useHardwareCatalog';
import { getLiveHardwarePrice, getLivePackPrice, isGreaseItem } from './useHardwareCatalog';
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
import { getRecommendedEdgeType, getEdgeRecommendation } from '../utils/edgeRecommendation';
import { PricingSetting, getPricingForCurrency } from './usePricingSettings';
import {
  BasePricingData,
  getFabricPriceFromDB,
  getCornerCostFromDB,
  getHardwareCostFromDB,
  getEdgeFeatureFromDB
} from './useBasePricing';

export interface LockedTotalOverride {
  total: number;
  currency: string;
  baseNzd?: number | null;
}

export function useShadeCalculations(
  config: ConfiguratorState,
  pricingSettingsMap?: Record<string, PricingSetting>,
  basePricingData?: BasePricingData | null,
  hardwarePacks?: HardwarePack[] | null,
  hardwareItems?: HardwareItem[] | null,
  lockedOverride?: LockedTotalOverride | null,
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
    const area = calculatePolygonArea(config.measurements, config.corners, config.fixingHeights, config.points);
    const recommendation = getEdgeRecommendation(perimeterMM);
    const usesCheaperFallback = !config.edgeType && recommendation === 'either';
    const edgeType = (config.edgeType || getRecommendedEdgeType(perimeterMM)) as 'webbing' | 'cabled';

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

    let embeddedHardwareCostNZD = 0;
    if (basePricingData) {
      fabricCostNZD = getFabricPriceFromDB(basePricingData, adjustedPerimeter, config.fabricType, edgeType);
      edgeCostNZD = 0;
      cornerCostNZD = getCornerCostFromDB(basePricingData, config.corners, edgeType);
      embeddedHardwareCostNZD = getHardwareCostFromDB(basePricingData, config.corners, edgeType);
    } else {
      if (edgeType === 'webbing') {
        fabricCostNZD = getFabricPriceFromPerimeter(adjustedPerimeter, config.fabricType, 'webbing');
        edgeCostNZD = 0;
        cornerCostNZD = CORNER_COSTS[config.corners as keyof typeof CORNER_COSTS] || 0;
        embeddedHardwareCostNZD = HARDWARE_COSTS[config.corners as keyof typeof HARDWARE_COSTS] || 0;
      } else if (edgeType === 'cabled') {
        fabricCostNZD = getFabricPriceFromPerimeter(adjustedPerimeter, config.fabricType, 'cabled');
        edgeCostNZD = 0;
        cornerCostNZD = CABLED_CORNER_COSTS[config.corners as keyof typeof CABLED_CORNER_COSTS] || 0;
        embeddedHardwareCostNZD = CABLED_HARDWARE_COSTS[config.corners as keyof typeof CABLED_HARDWARE_COSTS] || 0;
      }
    }

    if (usesCheaperFallback) {
      let altFabric = 0, altCorner = 0;
      const alt: 'webbing' | 'cabled' = edgeType === 'webbing' ? 'cabled' : 'webbing';
      if (basePricingData) {
        altFabric = getFabricPriceFromDB(basePricingData, adjustedPerimeter, config.fabricType, alt);
        altCorner = getCornerCostFromDB(basePricingData, config.corners, alt);
      } else if (alt === 'webbing') {
        altFabric = getFabricPriceFromPerimeter(adjustedPerimeter, config.fabricType, 'webbing');
        altCorner = CORNER_COSTS[config.corners as keyof typeof CORNER_COSTS] || 0;
      } else {
        altFabric = getFabricPriceFromPerimeter(adjustedPerimeter, config.fabricType, 'cabled');
        altCorner = CABLED_CORNER_COSTS[config.corners as keyof typeof CABLED_CORNER_COSTS] || 0;
      }
      const altSail = altFabric + altCorner;
      const currentSail = fabricCostNZD + edgeCostNZD + cornerCostNZD;
      if (altSail < currentSail) {
        fabricCostNZD = altFabric;
        edgeCostNZD = 0;
        cornerCostNZD = altCorner;
      }
    }

    const perCornerNzd: number[] = new Array(config.corners).fill(0);
    const perCornerLivePrice: number[] = new Array(config.corners).fill(0);
    const resolvedMode: 'standard' | 'manual' | 'none' =
      config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none');
    const breakdownMode: 'standard' | 'manual' | 'none' = resolvedMode;
    let breakdownSubtotalNzd = 0;

    const pricing = pricingSettingsMap
      ? getPricingForCurrency(pricingSettingsMap, config.currency)
      : { marketMarkup: 1.0, zonosDhlMarkup: 1.0, exchangeRate: 1.0, symbol: 'NZ$' };

    const hardwareItemsById = new Map<string, HardwareItem>();
    if (hardwareItems) for (const it of hardwareItems) hardwareItemsById.set(it.id, it);

    let hardwareLiveSubtotal = 0;
    let standardPackLivePrice: number | null = null;

    if (resolvedMode === 'standard') {
      let standardTotal = embeddedHardwareCostNZD;
      let pack: HardwarePack | undefined;
      if (hardwarePacks && hardwarePacks.length > 0) {
        pack = hardwarePacks.find(p => p.edge_type === edgeType && p.corners === config.corners);
        if (pack && pack.price_nzd_override != null) {
          standardTotal = Number(pack.price_nzd_override);
        }
      }
      hardwareCostNZD = standardTotal;
      const per = config.corners > 0 ? standardTotal / config.corners : 0;
      for (let i = 0; i < config.corners; i++) perCornerNzd[i] = per;
      breakdownSubtotalNzd = standardTotal;

      if (pack) {
        const live = getLivePackPrice(pack, config.currency, pricing.exchangeRate);
        if (live != null) {
          standardPackLivePrice = live;
          hardwareLiveSubtotal = live;
        }
      }
      if (standardPackLivePrice == null) {
        standardPackLivePrice = standardTotal * pricing.exchangeRate;
        hardwareLiveSubtotal = standardPackLivePrice;
      }
      const perLive = config.corners > 0 ? hardwareLiveSubtotal / config.corners : 0;
      for (let i = 0; i < config.corners; i++) perCornerLivePrice[i] = perLive;
    } else if (resolvedMode === 'manual') {
      let manualSubtotal = 0;
      if (config.cornerHardware) {
        for (let i = 0; i < config.corners; i++) {
          const lines = config.cornerHardware[i] || [];
          let cornerNzd = 0;
          let cornerLive = 0;
          for (const line of lines) {
            cornerNzd += line.priceNzd * line.qty;
            const catalogItem = hardwareItemsById.get(line.catalogId);
            const livePerUnit = catalogItem
              ? getLiveHardwarePrice(catalogItem, config.currency, pricing.exchangeRate)
              : (line.livePriceCurrency === config.currency && line.livePrice != null
                  ? line.livePrice
                  : line.priceNzd * pricing.exchangeRate);
            cornerLive += livePerUnit * line.qty;
          }
          perCornerNzd[i] = cornerNzd;
          perCornerLivePrice[i] = cornerLive;
          manualSubtotal += cornerNzd;
          hardwareLiveSubtotal += cornerLive;
        }
      }
      hardwareCostNZD = manualSubtotal;
      breakdownSubtotalNzd = manualSubtotal;
    } else {
      hardwareCostNZD = 0;
      breakdownSubtotalNzd = 0;
    }

    let greaseLivePrice = 0;
    let greaseNzdPrice = 0;
    if (config.includeGrease !== false && resolvedMode === 'manual' && hardwareItems) {
      const greaseIt = hardwareItems.find(isGreaseItem);
      if (greaseIt) {
        greaseNzdPrice = Number(greaseIt.price_nzd) || 0;
        greaseLivePrice = getLiveHardwarePrice(greaseIt, config.currency, pricing.exchangeRate);
        hardwareCostNZD += greaseNzdPrice;
        hardwareLiveSubtotal += greaseLivePrice;
        breakdownSubtotalNzd += greaseNzdPrice;
      }
    }

    const sailOnlyBaseNZD = fabricCostNZD + edgeCostNZD + cornerCostNZD;

    // Sail portion goes through market/DHL markup + FX; hardware uses Shopify
    // presentment price directly (already in buyer's currency).
    const markedUpSailNZD = sailOnlyBaseNZD * pricing.marketMarkup;
    const zonosSailNZD = sailOnlyBaseNZD * (pricing.zonosDhlMarkup - 1);
    const sailConverted = (markedUpSailNZD + zonosSailNZD) * pricing.exchangeRate;

    const markedUpFactor = pricing.marketMarkup * pricing.exchangeRate;
    const zonosFactor = (pricing.zonosDhlMarkup - 1) * pricing.exchangeRate;
    const combinedFactor = markedUpFactor + zonosFactor;

    const fabricCost = fabricCostNZD * combinedFactor;
    const edgeCost = edgeCostNZD * combinedFactor;
    const hardwareCost = cornerCostNZD * combinedFactor + hardwareLiveSubtotal;
    const computedTotal = Math.ceil(sailConverted + hardwareLiveSubtotal);
    // While a quote is locked, the saved on-screen total is the source of truth.
    // We never recompute it against current pricing tables / FX / markup.
    const useLocked =
      !!lockedOverride &&
      Number.isFinite(lockedOverride.total) &&
      lockedOverride.total > 0 &&
      lockedOverride.currency === config.currency;
    const totalPrice = useLocked ? lockedOverride!.total : computedTotal;
    const sailOnlyPriceNzd = sailOnlyBaseNZD;
    const hardwareOnlyPriceNzd = hardwareCostNZD;

    const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
    const fabricWeightPerSqm = selectedFabric?.weightPerSqm || 370;
    const areaSqm = area;

    const totalSailWeightGrams =
      (fabricWeightPerSqm * areaSqm) +
      (config.corners * 200);

    const perimeterWeightPerMeter = config.edgeType === 'cabled' ? 140 : 100;
    const perimeterWeightGrams = Math.round(perimeterM) * perimeterWeightPerMeter;

    const hardwareWeightGrams = resolvedMode !== 'none'
      ? config.corners * 380
      : 0;

    const totalWeightGrams = totalSailWeightGrams + perimeterWeightGrams + hardwareWeightGrams;

    return {
      area,
      perimeter: perimeterM,
      fabricCost,
      edgeCost,
      hardwareCost,
      hardwareBreakdown: {
        mode: breakdownMode,
        subtotalNzd: breakdownSubtotalNzd,
        perCornerNzd,
        sailOnlyPriceNzd,
        hardwareOnlyPriceNzd,
        liveCurrency: config.currency,
        hardwareOnlyLivePrice: hardwareLiveSubtotal,
        perCornerLivePrice,
        standardPackLivePrice,
        greaseLivePrice: greaseLivePrice > 0 ? greaseLivePrice : undefined,
        greaseIncluded: config.includeGrease !== false && resolvedMode !== 'none' && greaseLivePrice > 0,
        sailOnlyLivePrice: Math.ceil(sailConverted),
      },
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
    config.hardwareSelectionMode,
    config.cornerHardware,
    config.includeGrease,
    pricingSettingsMap,
    basePricingData,
    hardwarePacks,
    hardwareItems,
    lockedOverride?.total,
    lockedOverride?.currency,
    lockedOverride?.baseNzd
  ]);
}

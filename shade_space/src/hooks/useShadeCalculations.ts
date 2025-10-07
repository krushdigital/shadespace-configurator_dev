import { useMemo } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../types';
import { 
  WEBBING_FABRIC_PRICING, 
  CABLED_FABRIC_PRICING,
  CORNER_COSTS, 
  CABLED_CORNER_COSTS,
  HARDWARE_COSTS, 
  CABLED_HARDWARE_COSTS,
  EXCHANGE_RATES, 
  CURRENCY_MARKUPS, 
  BASE_PRICING_MARKUP,
  getFabricPriceFromPerimeter,
  getWebbingWidth,
  getWireThickness
} from '../data/pricing';
import { FABRICS } from '../data/fabrics';
import { calculatePolygonArea } from '../utils/geometry';

export function useShadeCalculations(config: ConfiguratorState): ShadeCalculations {
  return useMemo(() => {
    // Calculate perimeter from measurements
    let perimeterMM = 0;
    const edgeKeys = [];
    
    // Get edge measurements in mm
    for (let i = 0; i < config.corners; i++) {
      const nextIndex = (i + 1) % config.corners;
      const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
      edgeKeys.push(edgeKey);
      
      if (config.measurements[edgeKey]) {
        perimeterMM += config.measurements[edgeKey];
      }
    }
    
    // Only calculate pricing if all edge measurements are present
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
    
    // Convert to meters
    const perimeterM = perimeterMM / 1000;
    
    // Adjusted perimeter (rounded to 0.5m increments)
    const adjustedPerimeter = Math.round(perimeterM / 0.5) * 0.5;
    
    // Calculate accurate area using triangulation
    const area = calculatePolygonArea(config.measurements, config.corners);
    
    // Get webbing width based on perimeter
    const webbingWidth = getWebbingWidth(adjustedPerimeter);
    const wireThickness = getWireThickness(adjustedPerimeter);
    
    // Calculate costs based on edge type
    let fabricCostNZD = 0;
    let edgeCostNZD = 0;
    let cornerCostNZD = 0;
    let hardwareCostNZD = 0;
    
    if (config.edgeType === 'webbing') {
      // Use new webbing pricing logic
      fabricCostNZD = getFabricPriceFromPerimeter(adjustedPerimeter, config.fabricType, 'webbing');
      
      // Edge cost is now included in fabric cost for webbing
      edgeCostNZD = 0;
      
      // Corner cost based on number of corners
      cornerCostNZD = CORNER_COSTS[config.corners as keyof typeof CORNER_COSTS] || 0;
      
      // Hardware cost - only for 'adjust' measurement option
      if (config.measurementOption === 'adjust') {
        hardwareCostNZD = HARDWARE_COSTS[config.corners as keyof typeof HARDWARE_COSTS] || 0;
      }
    } else if (config.edgeType === 'cabled') {
      // Use new cabled edge pricing logic
      fabricCostNZD = getFabricPriceFromPerimeter(adjustedPerimeter, config.fabricType, 'cabled');
      
      // Edge cost is now included in fabric cost for cabled edge
      edgeCostNZD = 0;
      
      // Corner cost based on number of corners for cabled edge
      cornerCostNZD = CABLED_CORNER_COSTS[config.corners as keyof typeof CABLED_CORNER_COSTS] || 0;
      
      // Hardware cost - only for 'adjust' measurement option
      if (config.measurementOption === 'adjust') {
        hardwareCostNZD = CABLED_HARDWARE_COSTS[config.corners as keyof typeof CABLED_HARDWARE_COSTS] || 0;
      }
    }
    
    // Apply base markup to all costs
    const fabricCostWithMarkup = fabricCostNZD * BASE_PRICING_MARKUP;
    const edgeCostWithMarkup = edgeCostNZD * BASE_PRICING_MARKUP;
    const cornerCostWithMarkup = cornerCostNZD * BASE_PRICING_MARKUP;
    const hardwareCostWithMarkup = hardwareCostNZD * BASE_PRICING_MARKUP;
    
    const totalNZD = fabricCostWithMarkup + edgeCostWithMarkup + cornerCostWithMarkup + hardwareCostWithMarkup;
    
    // Apply currency-specific markup
    const currencyMarkup = CURRENCY_MARKUPS[config.currency] || CURRENCY_MARKUPS['USD'];
    const totalNZDWithCurrencyMarkup = totalNZD * currencyMarkup;
    
    // Convert to user's currency
    const exchangeRate = EXCHANGE_RATES[config.currency] || EXCHANGE_RATES['USD'];
    
    const fabricCost = fabricCostWithMarkup * currencyMarkup * exchangeRate;
    const edgeCost = edgeCostWithMarkup * currencyMarkup * exchangeRate;
    const hardwareCost = (cornerCostWithMarkup + hardwareCostWithMarkup) * currencyMarkup * exchangeRate;
    const totalPriceRaw = totalNZDWithCurrencyMarkup * exchangeRate;
    const totalPrice = Math.ceil(totalPriceRaw); // Round up to nearest dollar
    
    // Calculate weight
    const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
    const fabricWeightPerSqm = selectedFabric?.weightPerSqm || 370; // Default to Monotec 370 if not found
    
    // Use actual calculated area (already in m²)
    const areaSqm = area;
    
    // Calculate total sail weight
    const totalSailWeightGrams = 
      (fabricWeightPerSqm * areaSqm) + // Fabric weight based on actual area
      (config.corners * 200); // Fixing points weight
    
    // Calculate perimeter weight based on edge type
    const perimeterWeightPerMeter = config.edgeType === 'cabled' ? 140 : 100; // Wire: 140g/m, Webbing: 100g/m
    const perimeterWeightGrams = (Math.round(perimeterM) * perimeterWeightPerMeter) + 0; // Buffer weight
    
    // Calculate hardware weight (only if "adjust" option is selected)
    const hardwareWeightGrams = config.measurementOption === 'adjust' 
      ? config.corners * 380 
      : 0;
    
    // Total weight
    const totalWeightGrams = totalSailWeightGrams + perimeterWeightGrams + hardwareWeightGrams;
    
    return {
      area, // This is in m²
      perimeter: perimeterM, // This is in m
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
    config.unit
  ]);
}
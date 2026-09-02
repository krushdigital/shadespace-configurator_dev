import { Point, FixedShapeType } from '../types';

// Unit conversion constants
const MM_TO_INCHES = 0.0393701;
const INCHES_TO_MM = 25.4;

// Measurement range constants (4-5 digits in metric)
const MIN_MEASUREMENT_MM = 1000; // 1000mm = 39.4 inches (minimum 4-digit metric)
const MAX_MEASUREMENT_MM = 99999; // 99999mm = 3937 inches (maximum 5-digit metric)

// Expected typical ranges for shade sails
const TYPICAL_MIN_MM = 1800; // 1.8m - typical minimum edge length (allows better imperial typo detection)
const TYPICAL_MAX_MM = 15000; // 15m - typical maximum edge length
const TYPICAL_HEIGHT_MIN_MM = 900; // 0.9m - typical minimum height (allows better imperial typo detection)
const TYPICAL_HEIGHT_MAX_MM = 8000; // 8m - typical maximum height

// Imperial typical ranges (in inches)
const TYPICAL_MIN_INCHES = 79; // ~2m in inches - typical minimum edge length
const TYPICAL_MAX_INCHES = 591; // ~15m in inches - typical maximum edge length
const TYPICAL_HEIGHT_MIN_INCHES = 79; // ~2m in inches - typical minimum height
const TYPICAL_HEIGHT_MAX_INCHES = 315; // ~8m in inches - typical maximum height

export function convertMmToUnit(mm: number, unit: 'metric' | 'imperial'): number {
  return unit === 'imperial' ? mm * MM_TO_INCHES : mm;
}

export function convertUnitToMm(value: number, unit: 'metric' | 'imperial'): number {
  return unit === 'imperial' ? value * INCHES_TO_MM : value;
}

export function formatMeasurement(mm: number, unit: 'metric' | 'imperial', displayRawInches: boolean = false): string {
  if (unit === 'imperial') {
    const inches = mm * MM_TO_INCHES;

    // If displayRawInches is true, show only inches (for typo suggestions)
    if (displayRawInches) {
      return `${inches.toFixed(1)}"`;
    }

    let imperial: string;
    if (inches >= 12) {
      const feet = Math.floor(inches / 12);
      const remainingInches = inches % 12;
      imperial = parseFloat(remainingInches.toFixed(1)) > 0
        ? `${feet}'${remainingInches.toFixed(1)}"`
        : `${feet}'`;
    } else {
      imperial = `${inches.toFixed(1)}"`;
    }
    return `${imperial} (${Math.round(mm)}mm)`;
  }
  return `${Math.round(mm)}mm`;
}

/**
 * Format a secondary unit display for measurement inputs
 * @param mm Measurement in millimeters
 * @param unit Current unit mode
 * @returns Formatted secondary unit string (e.g., "2.5m" or "8'3\"")
 */
export function formatSecondaryUnit(mm: number, unit: 'metric' | 'imperial'): string {
  if (!mm || mm <= 0) return '';

  if (unit === 'metric') {
    // Convert mm to meters for secondary display
    const meters = mm / 1000;
    return `${meters.toFixed(2)}m`;
  } else {
    // Convert mm to inches, then to feet and inches for secondary display
    const inches = mm * MM_TO_INCHES;
    if (inches >= 12) {
      const feet = Math.floor(inches / 12);
      const remainingInches = inches % 12;
      if (parseFloat(remainingInches.toFixed(1)) > 0) {
        return `${feet}'${remainingInches.toFixed(1)}"`;
      }
      return `${feet}'`;
    }
    return `${inches.toFixed(1)}"`;
  }
}

export function formatArea(mm2: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const sqInches = mm2 * (MM_TO_INCHES * MM_TO_INCHES);
    const sqFeet = sqInches / 144;
    const m2 = mm2 / 1000000;
    const imperial = sqFeet >= 1 ? `${sqFeet.toFixed(1)} ft²` : `${Math.round(sqInches)} in²`;
    return `${imperial} (${m2.toFixed(2)} m²)`;
  }
  const m2 = mm2 / 1000000;
  return `${m2.toFixed(2)} m²`;
}

/**
 * Format measurement with both metric and imperial units for backend/fulfillment display
 * @param mm Measurement in millimeters
 * @param originalUnit The unit the customer originally entered
 * @returns Formatted string with both units (metric first)
 */
export function formatDualMeasurement(mm: number, originalUnit: 'metric' | 'imperial'): string {
  const metricValue = `${Math.round(mm)}mm`;
  const inches = mm * MM_TO_INCHES;

  let imperialValue: string;
  if (inches >= 12) {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    imperialValue = parseFloat(remainingInches.toFixed(1)) > 0
      ? `${feet}'${remainingInches.toFixed(1)}"`
      : `${feet}'`;
  } else {
    imperialValue = `${inches.toFixed(1)}"`;
  }

  const marker = originalUnit === 'imperial' ? ' *' : '';
  return `${metricValue} (${imperialValue}${marker})`;
}

/**
 * Get both metric and imperial measurements as separate values for backend storage
 * @param mm Measurement in millimeters
 * @returns Object with metric and imperial values
 */
export function getDualMeasurementValues(mm: number): { metric: string; imperial: string; metricRaw: number; imperialRaw: number } {
  const metricRaw = Math.round(mm);
  const imperialRaw = parseFloat((mm * MM_TO_INCHES).toFixed(2));

  const metricValue = `${metricRaw}mm`;
  const inches = mm * MM_TO_INCHES;

  let imperialValue: string;
  if (inches >= 12) {
    const feet = Math.floor(inches / 12);
    const remainingInches = inches % 12;
    imperialValue = parseFloat(remainingInches.toFixed(1)) > 0
      ? `${feet}'${remainingInches.toFixed(1)}"`
      : `${feet}'`;
  } else {
    imperialValue = `${inches.toFixed(1)}"`;
  }

  return {
    metric: metricValue,
    imperial: imperialValue,
    metricRaw,
    imperialRaw
  };
}

export function validateMeasurements(measurements: {[key: string]: number}, corners: number, unit: 'metric' | 'imperial'): {
  errors: {[key: string]: string};
  typoSuggestions: {[key: string]: number};
} {
  const errors: {[key: string]: string} = {};
  const typoSuggestions: {[key: string]: number} = {};
  
  // Check each measurement
  Object.keys(measurements).forEach(key => {
    const value = measurements[key];
    if (value && value > 0) {
      let hasTypoSuggestion = false;
      
      if (unit === 'metric') {
        // Enhanced typo detection for metric units (working in mm)
        // For very large numbers, try division by 100 first to get into typical range
        if (value >= 100000 && value / 100 >= TYPICAL_MIN_MM && value / 100 <= TYPICAL_MAX_MM) {
          typoSuggestions[key] = value / 100;
          hasTypoSuggestion = true;
        }
        // Single digit (1-9) -> multiply by 1000 (e.g., 5 -> 5000)
        else if (value >= 1 && value <= 9 && value * 1000 >= TYPICAL_MIN_MM && value * 1000 <= TYPICAL_MAX_MM) {
          typoSuggestions[key] = value * 1000;
          hasTypoSuggestion = true;
        }
        // Double digit (10-99) -> multiply by 100 (e.g., 50 -> 5000)
        else if (value >= 10 && value <= 99 && value * 100 >= TYPICAL_MIN_MM && value * 100 <= TYPICAL_MAX_MM) {
          typoSuggestions[key] = value * 100;
          hasTypoSuggestion = true;
        }
        // Triple digit (100-1999) -> multiply by 10 (e.g., 500 -> 5000)
        else if (value >= 100 && value < TYPICAL_MIN_MM && value * 10 >= TYPICAL_MIN_MM && value * 10 <= TYPICAL_MAX_MM) {
          typoSuggestions[key] = value * 10;
          hasTypoSuggestion = true;
        }
        // Six digit or larger (>15000) -> divide by 10 (e.g., 50000 -> 5000)
        else if (value > TYPICAL_MAX_MM && value >= 100000 && value / 10 >= TYPICAL_MIN_MM && value / 10 <= MAX_MEASUREMENT_MM) {
          typoSuggestions[key] = value / 10;
          hasTypoSuggestion = true;
        }
        // Five to six digit entries (16000-99999) -> divide by 10 (e.g., 30000 -> 3000)
        else if (value >= 16000 && value <= 99999 && value / 10 >= TYPICAL_MIN_MM && value / 10 <= MAX_MEASUREMENT_MM) {
          typoSuggestions[key] = value / 10;
          hasTypoSuggestion = true;
        }
      } else {
        // Imperial typo detection - value is stored in mm, convert to inches for logic
        const valueInInches = value * MM_TO_INCHES;
        
        // Enhanced imperial typo detection logic (mirroring metric logic but for inches)
        
        // For very large numbers (>10000"), try division by 100 to get into typical range
        if (valueInInches >= 10000 && valueInInches / 100 >= TYPICAL_MIN_INCHES && valueInInches / 100 <= TYPICAL_MAX_INCHES) {
          typoSuggestions[key] = (valueInInches / 100) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
        // Single digit (1-9") -> multiply by 12 (user entered feet instead of inches)
        else if (valueInInches >= 1 && valueInInches <= 9 && valueInInches * 12 >= TYPICAL_MIN_INCHES && valueInInches * 12 <= TYPICAL_MAX_INCHES) {
          typoSuggestions[key] = (valueInInches * 12) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
        // Double digit (10-50") -> could be feet instead of inches
        else if (valueInInches >= 10 && valueInInches <= 50 && valueInInches * 12 >= TYPICAL_MIN_INCHES && valueInInches * 12 <= TYPICAL_MAX_INCHES) {
          typoSuggestions[key] = (valueInInches * 12) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
        // Large values (1000-9999") -> divide by 10 (extra digit typo)
        else if (valueInInches > 1000 && valueInInches / 10 >= TYPICAL_MIN_INCHES && valueInInches / 10 <= TYPICAL_MAX_INCHES) {
          typoSuggestions[key] = (valueInInches / 10) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
        // Medium values (600-999") -> divide by 10 (e.g., 720" -> 72")
        else if (valueInInches >= 600 && valueInInches <= 999 && valueInInches / 10 >= TYPICAL_MIN_INCHES && valueInInches / 10 <= TYPICAL_MAX_INCHES) {
          typoSuggestions[key] = (valueInInches / 10) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
      }
      
      // Only show range errors if no typo suggestion was made
      if (!hasTypoSuggestion) {
        const actualValue = value; // value is already in mm
        
        if (actualValue < MIN_MEASUREMENT_MM) {
          if (unit === 'metric') {
            errors[key] = `Too small (min 1000mm) - Did you enter cm instead of mm?`;
          } else {
            errors[key] = `Too small (min ${formatMeasurement(MIN_MEASUREMENT_MM, 'imperial')}) - Did you enter feet instead of inches?`;
          }
        } else if (actualValue > MAX_MEASUREMENT_MM) {
          if (unit === 'metric') {
            errors[key] = `Too large (max 99999mm) - Check your measurement`;
          } else {
            errors[key] = `Too large (max ${formatMeasurement(MAX_MEASUREMENT_MM, 'imperial')}) - Check your measurement`;
          }
        }
      }
    }
  });
  
  return { errors, typoSuggestions };
}

export function getHeightRequirement(corners: number, _measurementOption: 'adjust' | 'exact'): 'none' | 'optional' | 'required-at-checkout' {
  if (corners === 3) {
    return 'none';
  }

  if (corners === 4) {
    return 'optional';
  }

  if (corners >= 5) {
    return 'required-at-checkout';
  }

  return 'none';
}

export function isHeightRequiredForCheckout(corners: number, _measurementOption: 'adjust' | 'exact'): boolean {
  return corners >= 5;
}

/**
 * Project a 3D tape-measure distance to its horizontal component using heights.
 * When measuring between fixing points at different heights, the tape captures the
 * hypotenuse. This function returns the horizontal leg.
 */
export function projectToHorizontal(measured3D: number, heightA: number, heightB: number): number {
  const heightDiff = Math.abs(heightA - heightB);
  if (measured3D <= heightDiff) return 0;
  return Math.sqrt(measured3D * measured3D - heightDiff * heightDiff);
}

/**
 * Check if a measurement is physically possible given the heights of its endpoints.
 * A tape-measure distance cannot be shorter than the vertical drop between the points.
 */
export function isPhysicallyPossible(measured3D: number, heightA: number, heightB: number): boolean {
  return measured3D >= Math.abs(heightA - heightB);
}

/**
 * Project all measurements to horizontal using heights (for 3D-aware reconstruction).
 * Returns a new measurements object with projected values.
 * Only projects if valid heights are provided for both endpoints.
 */
export function projectMeasurementsToHorizontal(
  measurements: { [key: string]: number },
  corners: number,
  heights: number[]
): { [key: string]: number } {
  if (!heights || heights.length < corners || heights.some(h => !h || h <= 0)) {
    return measurements;
  }

  const projected: { [key: string]: number } = {};

  for (const [key, value] of Object.entries(measurements)) {
    if (!value || value <= 0) continue;

    const iA = key.charCodeAt(0) - 65;
    const iB = key.charCodeAt(1) - 65;

    if (iA >= 0 && iA < corners && iB >= 0 && iB < corners) {
      const hA = heights[iA];
      const hB = heights[iB];
      if (hA > 0 && hB > 0) {
        const horiz = projectToHorizontal(value, hA, hB);
        projected[key] = horiz > 0 ? horiz : value;
      } else {
        projected[key] = value;
      }
    } else {
      projected[key] = value;
    }
  }

  return projected;
}

export interface ShapeConfidenceResult {
  percentage: number;
  bdDeviation: number;
  expectedBD: number;
  measuredBD: number;
  status: 'excellent' | 'good' | 'warning' | 'error' | 'pending';
  message: string;
  impossibleMeasurements: string[];
}

/**
 * Compute shape confidence by cross-validating the BD verification diagonal
 * against the shape reconstructed from fan diagonals.
 */
export function computeShapeConfidence(
  measurements: { [key: string]: number },
  corners: number,
  heights?: number[]
): ShapeConfidenceResult {
  const pending: ShapeConfidenceResult = {
    percentage: 0, bdDeviation: 0, expectedBD: 0, measuredBD: 0,
    status: 'pending', message: 'Enter all required measurements to see accuracy',
    impossibleMeasurements: []
  };

  if (corners < 4) return { ...pending, percentage: 100, status: 'excellent', message: 'Triangle is fully defined by edge lengths' };

  const impossibleMeasurements: string[] = [];
  if (heights && heights.length >= corners && heights.every(h => h > 0)) {
    for (const [key, value] of Object.entries(measurements)) {
      if (!value || value <= 0) continue;
      const iA = key.charCodeAt(0) - 65;
      const iB = key.charCodeAt(1) - 65;
      if (iA >= 0 && iA < corners && iB >= 0 && iB < corners) {
        if (!isPhysicallyPossible(value, heights[iA], heights[iB])) {
          impossibleMeasurements.push(key);
        }
      }
    }
  }

  if (impossibleMeasurements.length > 0) {
    return {
      percentage: 0, bdDeviation: 0, expectedBD: 0, measuredBD: 0,
      status: 'error',
      message: `Measurement${impossibleMeasurements.length > 1 ? 's' : ''} ${impossibleMeasurements.join(', ')} cannot be shorter than the height difference between endpoints`,
      impossibleMeasurements
    };
  }

  const hasHeights = heights && heights.length >= corners && heights.every(h => h > 0);
  const projMeasurements = hasHeights
    ? projectMeasurementsToHorizontal(measurements, corners, heights)
    : measurements;

  if (!hasRequiredMeasurements(projMeasurements, corners)) {
    return { ...pending, impossibleMeasurements: [] };
  }

  const points = reconstructPolygonRaw(projMeasurements, corners);
  if (!points) {
    return {
      percentage: 0, bdDeviation: 0, expectedBD: 0, measuredBD: 0,
      status: 'error', message: 'Shape could not be reconstructed from your measurements. Please re-check values.',
      impossibleMeasurements: []
    };
  }

  // Cross-check all measured distances against reconstructed shape
  let totalDeviation = 0;
  let checkCount = 0;
  let worstKey = '';
  let worstDeviation = 0;

  const allKeys = [
    ...getDiagonalKeysForCorners(corners),
    ...Array.from({ length: corners }, (_, i) => {
      const next = (i + 1) % corners;
      return `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + next)}`;
    })
  ];

  for (const key of allKeys) {
    const measured = measurements[key];
    if (!measured || measured <= 0) continue;
    const iA = key.charCodeAt(0) - 65;
    const iB = key.charCodeAt(1) - 65;
    if (iA < 0 || iA >= corners || iB < 0 || iB >= corners) continue;

    const pA = points[iA];
    const pB = points[iB];
    const reconstructedHorizontal = Math.sqrt((pA.x - pB.x) ** 2 + (pA.y - pB.y) ** 2);

    let expected3D: number;
    if (hasHeights) {
      const heightDiff = Math.abs(heights[iA] - heights[iB]);
      expected3D = Math.sqrt(reconstructedHorizontal * reconstructedHorizontal + heightDiff * heightDiff);
    } else {
      expected3D = reconstructedHorizontal;
    }

    if (expected3D > 0) {
      const dev = Math.abs(measured - expected3D) / expected3D * 100;
      totalDeviation += dev;
      checkCount++;
      if (dev > worstDeviation) {
        worstDeviation = dev;
        worstKey = key;
      }
    }
  }

  const avgDeviation = checkCount > 0 ? totalDeviation / checkCount : 0;
  const percentage = Math.max(0, Math.min(100, 100 - avgDeviation * 10));

  // Keep BD fields for backwards compatibility
  const measuredBD = measurements['BD'] || 0;
  const B = points[1];
  const D = corners >= 4 ? points[3] : points[1];
  const horizontalBD = Math.sqrt((B.x - D.x) ** 2 + (B.y - D.y) ** 2);
  let expectedBD3D = horizontalBD;
  if (hasHeights && corners >= 4) {
    const heightDiffBD = Math.abs(heights[1] - heights[3]);
    expectedBD3D = Math.sqrt(horizontalBD * horizontalBD + heightDiffBD * heightDiffBD);
  }

  let status: ShapeConfidenceResult['status'];
  let message: string;
  if (percentage >= 95) {
    status = 'excellent';
    message = 'Your measurements are consistent and the shape is well-defined';
  } else if (percentage >= 85) {
    status = 'good';
    message = 'Your measurements are consistent with minor variation';
  } else if (percentage >= 70) {
    status = 'warning';
    message = worstKey
      ? `Measurement ${worstKey.charAt(0)} to ${worstKey.charAt(1)} differs most from expected. Please double-check.`
      : 'Some measurements differ from expected. Please double-check your values.';
  } else {
    status = 'error';
    message = worstKey
      ? `Measurements appear inconsistent. ${worstKey.charAt(0)} to ${worstKey.charAt(1)} deviates most from expected.`
      : 'Your measurements appear inconsistent. Please re-check values.';
  }

  return { percentage, bdDeviation: avgDeviation, expectedBD: expectedBD3D, measuredBD, status, message, impossibleMeasurements: [] };
}

export function areHeightsProvided(heights: number[], corners: number): boolean {
  if (heights.length < corners) {
    return false;
  }

  for (let i = 0; i < corners; i++) {
    if (!heights[i] || heights[i] <= 0) {
      return false;
    }
  }

  return true;
}

export function validateHeights(heights: number[], unit: 'metric' | 'imperial'): {
  errors: {[key: string]: string};
  typoSuggestions: {[key: string]: number};
} {
  const errors: {[key: string]: string} = {};
  const typoSuggestions: {[key: string]: number} = {};
  
  heights.forEach((height, index) => {
    if (height && height > 0) {
      const heightKey = `height_${index}`;
      let hasTypoSuggestion = false;
      
      if (unit === 'metric') {
        // Enhanced typo detection for metric heights (working in mm)
        // For very large numbers, try division by 100 first to get into typical range
        if (height >= 100000 && height / 100 >= TYPICAL_HEIGHT_MIN_MM && height / 100 <= TYPICAL_HEIGHT_MAX_MM) {
          typoSuggestions[heightKey] = height / 100;
          hasTypoSuggestion = true;
        }
        // Single digit (1-9) -> multiply by 1000 (e.g., 3 -> 3000)
        else if (height >= 1 && height <= 9 && height * 1000 >= TYPICAL_HEIGHT_MIN_MM && height * 1000 <= TYPICAL_HEIGHT_MAX_MM) {
          typoSuggestions[heightKey] = height * 1000;
          hasTypoSuggestion = true;
        }
        // Double digit (10-99) -> multiply by 100 (e.g., 25 -> 2500)
        else if (height >= 10 && height <= 99 && height * 100 >= TYPICAL_HEIGHT_MIN_MM && height * 100 <= TYPICAL_HEIGHT_MAX_MM) {
          typoSuggestions[heightKey] = height * 100;
          hasTypoSuggestion = true;
        }
        // Triple digit (100-1999) -> multiply by 10 (e.g., 250 -> 2500)
        else if (height >= 100 && height < TYPICAL_HEIGHT_MIN_MM && height * 10 >= TYPICAL_HEIGHT_MIN_MM && height * 10 <= TYPICAL_HEIGHT_MAX_MM) {
          typoSuggestions[heightKey] = height * 10;
          hasTypoSuggestion = true;
        }
        // Six digit or larger (>8000) -> divide by 10 (e.g., 25000 -> 2500)
        else if (height > TYPICAL_HEIGHT_MAX_MM && height >= 100000 && height / 10 >= TYPICAL_HEIGHT_MIN_MM && height / 10 <= MAX_MEASUREMENT_MM) {
          typoSuggestions[heightKey] = height / 10;
          hasTypoSuggestion = true;
        }
        // Five to six digit entries (9000-99999) -> divide by 10 (e.g., 25000 -> 2500)
        else if (height >= 9000 && height <= 99999 && height / 10 >= TYPICAL_HEIGHT_MIN_MM && height / 10 <= MAX_MEASUREMENT_MM) {
          typoSuggestions[heightKey] = height / 10;
          hasTypoSuggestion = true;
        }
      } else {
        // Imperial typo detection for heights - height is stored in mm, convert to inches for logic
        const heightInInches = height * MM_TO_INCHES;
        
        // Enhanced imperial height typo detection logic (mirroring metric logic but for inches)
        
        // For very large numbers (>10000"), try division by 100 to get into typical range
        if (heightInInches >= 10000 && heightInInches / 100 >= TYPICAL_HEIGHT_MIN_INCHES && heightInInches / 100 <= TYPICAL_HEIGHT_MAX_INCHES) {
          typoSuggestions[heightKey] = (heightInInches / 100) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
        // Single digit (1-9") -> multiply by 12 (user entered feet instead of inches)
        else if (heightInInches >= 1 && heightInInches <= 9 && heightInInches * 12 >= TYPICAL_HEIGHT_MIN_INCHES && heightInInches * 12 <= TYPICAL_HEIGHT_MAX_INCHES) {
          typoSuggestions[heightKey] = (heightInInches * 12) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
        // Double digit (10-30") -> could be feet instead of inches
        else if (heightInInches >= 10 && heightInInches <= 30 && heightInInches * 12 >= TYPICAL_HEIGHT_MIN_INCHES && heightInInches * 12 <= TYPICAL_HEIGHT_MAX_INCHES) {
          typoSuggestions[heightKey] = (heightInInches * 12) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
        // Large values (500-9999") -> divide by 10 (extra digit typo)
        else if (heightInInches > 500 && heightInInches / 10 >= TYPICAL_HEIGHT_MIN_INCHES && heightInInches / 10 <= TYPICAL_HEIGHT_MAX_INCHES) {
          typoSuggestions[heightKey] = (heightInInches / 10) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
        // Medium values (316-499") -> divide by 10 (e.g., 360" -> 36")
        else if (heightInInches >= 316 && heightInInches <= 499 && heightInInches / 10 >= TYPICAL_HEIGHT_MIN_INCHES && heightInInches / 10 <= TYPICAL_HEIGHT_MAX_INCHES) {
          typoSuggestions[heightKey] = (heightInInches / 10) * INCHES_TO_MM;
          hasTypoSuggestion = true;
        }
      }
      
      // Only show range errors if no typo suggestion was made
      if (!hasTypoSuggestion) {
        const actualHeight = height; // height is already in mm
        
        if (actualHeight < MIN_MEASUREMENT_MM) {
          if (unit === 'metric') {
            errors[heightKey] = `Too small (min 1000mm) - Did you enter cm instead of mm?`;
          } else {
            errors[heightKey] = `Too small (min ${formatMeasurement(MIN_MEASUREMENT_MM, 'imperial')}) - Did you enter feet instead of inches?`;
          }
        } else if (actualHeight > MAX_MEASUREMENT_MM) {
          if (unit === 'metric') {
            errors[heightKey] = `Too large (max 99999mm) - Check your measurement`;
          } else {
            errors[heightKey] = `Too large (max ${formatMeasurement(MAX_MEASUREMENT_MM, 'imperial')}) - Check your measurement`;
          }
        }
      }
    }
  });
  
  return { errors, typoSuggestions };
}

export function getDiagonalKeysForCorners(corners: number): string[] {
  if (corners === 4) {
    return ['AC', 'BD'];
  } else if (corners === 5) {
    // All non-adjacent diagonals (5)
    return ['AC', 'AD', 'BD', 'BE', 'CE'];
  } else if (corners === 6) {
    // All non-adjacent diagonals (9)
    return ['AC', 'AD', 'AE', 'BD', 'BE', 'BF', 'CE', 'CF', 'DF'];
  } else if (corners === 7) {
    // Ring diagonals: each vertex to vertex+2 (7)
    return ['AC', 'BD', 'CE', 'DF', 'EG', 'AF', 'BG'];
  } else if (corners === 8) {
    // Ring diagonals: each vertex to vertex+2 (8)
    return ['AC', 'BD', 'CE', 'DF', 'EG', 'FH', 'AG', 'BH'];
  }
  return [];
}

export type ShapeAccuracy = 'exact' | 'approximate' | 'incomplete';

export function getShapeAccuracy(
  measurements: { [key: string]: number },
  corners: number
): { accuracy: ShapeAccuracy; message: string; hasDiagonals: boolean } {
  if (corners === 3) {
    const AB = measurements['AB'];
    const BC = measurements['BC'];
    const CA = measurements['CA'];

    if (AB && BC && CA) {
      return {
        accuracy: 'exact',
        message: 'Shape is accurate based on your measurements',
        hasDiagonals: true
      };
    }
    return {
      accuracy: 'incomplete',
      message: 'Enter all edge measurements to see your shape',
      hasDiagonals: true
    };
  }

  if (corners >= 4 && corners <= 8) {
    let edgeCount = 0;
    for (let i = 0; i < corners; i++) {
      const nextIndex = (i + 1) % corners;
      const edgeKey = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + nextIndex)}`;
      if (measurements[edgeKey] && measurements[edgeKey] > 0) {
        edgeCount++;
      }
    }

    if (edgeCount < corners) {
      return {
        accuracy: 'incomplete',
        message: 'Enter all edge measurements to see your shape',
        hasDiagonals: false
      };
    }

    const diagonalKeys = getDiagonalKeysForCorners(corners);
    const diagonalCount = diagonalKeys.filter(key =>
      measurements[key] && measurements[key] > 0
    ).length;

    if (diagonalCount === 0) {
      return {
        accuracy: 'approximate',
        message: 'Shape preview is approximate. Add diagonal measurements for an accurate preview.',
        hasDiagonals: false
      };
    }

    // Use hasRequiredMeasurements to determine if reconstruction can be exact
    if (hasRequiredMeasurements(measurements, corners)) {
      // Verify reconstruction actually succeeds (measurements may be geometrically impossible)
      const testPoints = reconstructPolygonFromMeasurements(measurements, corners, 600, 600);
      if (testPoints && testPoints.length === corners) {
        return {
          accuracy: 'exact',
          message: 'Shape preview matches your measurements',
          hasDiagonals: true
        };
      }
      return {
        accuracy: 'approximate',
        message: 'Shape could not be reconstructed from these measurements. Check that values are correct.',
        hasDiagonals: true
      };
    }

    // Has some diagonals but not enough for exact reconstruction
    const needed = getNextRequiredDiagonals(measurements, corners);
    const neededStr = needed.length > 0
      ? `Add diagonal ${needed[0].charAt(0)} to ${needed[0].charAt(1)} for an exact shape preview.`
      : 'Add more diagonal measurements for better accuracy.';
    return {
      accuracy: 'approximate',
      message: neededStr,
      hasDiagonals: diagonalCount > 0
    };
  }

  return {
    accuracy: 'incomplete',
    message: 'Select number of corners to begin',
    hasDiagonals: false
  };
}

export function getNextRequiredDiagonals(
  measurements: { [key: string]: number },
  corners: number
): string[] {
  const diagonalKeys = getDiagonalKeysForCorners(corners);
  return diagonalKeys.filter(key => !measurements[key] || measurements[key] <= 0);
}

/**
 * Calculate the area of a polygon from its vertex coordinates using the
 * Shoelace formula. Returns area in the same units squared as the input
 * coordinates (canvas units² if points are from the SVG canvas).
 */
function shoelaceArea(points: { x: number; y: number }[]): number {
  const n = points.length;
  if (n < 3) return 0;
  let sum = 0;
  for (let i = 0; i < n; i++) {
    const curr = points[i];
    const next = points[(i + 1) % n];
    sum += curr.x * next.y - next.x * curr.y;
  }
  return Math.abs(sum) / 2;
}

/**
 * Compute area in m² from canvas points + known edge measurements.
 * Uses Shoelace on the canvas shape, then scales by the ratio of
 * real edge lengths (mm) to canvas edge lengths (px).
 */
function areaFromPointsScaled(
  points: { x: number; y: number }[],
  measurements: { [key: string]: number },
  corners: number
): number {
  const edgeKeys = getEdgeKeys(corners);
  let totalRealMm = 0;
  let totalCanvasPx = 0;

  for (let i = 0; i < corners; i++) {
    const key = edgeKeys[i];
    const realMm = measurements[key] || 0;
    if (realMm <= 0) continue;
    const p1 = points[i];
    const p2 = points[(i + 1) % corners];
    const canvasDist = Math.hypot(p2.x - p1.x, p2.y - p1.y);
    if (canvasDist <= 0) continue;
    totalRealMm += realMm;
    totalCanvasPx += canvasDist;
  }

  if (totalCanvasPx === 0 || totalRealMm === 0) return 0;

  const scale = totalRealMm / totalCanvasPx;
  const canvasArea = shoelaceArea(points.slice(0, corners));
  return (canvasArea * scale * scale) / 1_000_000;
}

function getEdgeKeys(corners: number): string[] {
  const labels = ['A','B','C','D','E','F','G','H'];
  const keys: string[] = [];
  for (let i = 0; i < corners; i++) {
    keys.push(labels[i] + labels[(i + 1) % corners]);
  }
  return keys;
}

/**
 * Calculate the area of a triangle using Heron's formula
 * @param a Side length in mm
 * @param b Side length in mm
 * @param c Side length in mm
 * @returns Area in square mm, or 0 if triangle is invalid
 */
function calculateTriangleArea(a: number, b: number, c: number): number {
  // Check triangle inequality - all sides must be positive and satisfy triangle inequality
  if (a <= 0 || b <= 0 || c <= 0) return 0;
  if (a + b <= c || a + c <= b || b + c <= a) return 0;
  
  // Calculate semi-perimeter
  const s = (a + b + c) / 2;
  
  // Apply Heron's formula
  const areaSquared = s * (s - a) * (s - b) * (s - c);
  
  // Check for numerical errors (negative area under square root)
  if (areaSquared < 0) return 0;
  
  return Math.sqrt(areaSquared);
}

/**
 * Validate if three sides can form a valid triangle
 * @param a First side length
 * @param b Second side length
 * @param c Third side length
 * @param allowCollinear If true, allows collinear points (diagonal = sum of two edges)
 * @returns Object with isValid boolean and error message if invalid
 */
function validateTriangle(a: number, b: number, c: number, allowCollinear: boolean = false): { isValid: boolean; error?: string } {
  if (a <= 0 || b <= 0 || c <= 0) {
    return { isValid: false, error: 'All sides must be positive' };
  }

  if (allowCollinear) {
    const tolerance = 1.02;
    if (a + b < c / tolerance) {
      return { isValid: false, error: `These measurements are geometrically impossible. The diagonal is too long.` };
    }
    if (a + c < b / tolerance) {
      return { isValid: false, error: `These measurements are geometrically impossible. The diagonal is too long.` };
    }
    if (b + c < a / tolerance) {
      return { isValid: false, error: `These measurements are geometrically impossible. The diagonal is too long.` };
    }
    return { isValid: true };
  }

  const degenerateThreshold = 1.01;

  if (a + b < c * degenerateThreshold) {
    return { isValid: false, error: `These measurements create a flat or impossible triangle. Try increasing the sum of two shorter sides.` };
  }
  if (a + c < b * degenerateThreshold) {
    return { isValid: false, error: `These measurements create a flat or impossible triangle. Try increasing the sum of two shorter sides.` };
  }
  if (b + c < a * degenerateThreshold) {
    return { isValid: false, error: `These measurements create a flat or impossible triangle. Try increasing the sum of two shorter sides.` };
  }

  return { isValid: true };
}

/**
 * Calculate valid range for a triangle side given the other two sides
 * @param side1 First known side
 * @param side2 Second known side
 * @param allowCollinear If true, allows collinear points (third side = sum of other two)
 * @returns Object with min and max valid values for the third side
 */
export function calculateTriangleSideRange(side1: number, side2: number, allowCollinear: boolean = false): { min: number; max: number } {
  if (allowCollinear) {
    const tolerance = 1.02;
    const min = Math.abs(side1 - side2) / tolerance;
    const max = (side1 + side2) * tolerance;
    return { min: Math.floor(min), max: Math.ceil(max) };
  }

  const degenerateThreshold = 1.01;
  const min = Math.abs(side1 - side2) * degenerateThreshold;
  const max = (side1 + side2) / degenerateThreshold;

  return { min: Math.ceil(min), max: Math.floor(max) };
}

/**
 * Calculate the feasible range for a diagonal in a quadrilateral
 * @param side1 First adjacent side
 * @param side2 Second adjacent side
 * @param oppositeSide1 First opposite side
 * @param oppositeSide2 Second opposite side
 * @returns Object with min and max feasible diagonal lengths
 */
function calculateDiagonalRange(
  side1: number,
  side2: number,
  oppositeSide1: number,
  oppositeSide2: number
): { min: number; max: number } {
  // Minimum: The diagonal must satisfy triangle inequality with adjacent sides
  // For a diagonal connecting two corners, it must be greater than |side1 - side2|
  const minFromAdjacent = Math.abs(side1 - side2);

  // Maximum: The diagonal must be less than the sum of adjacent sides
  // Also, in a quadrilateral, no diagonal can exceed the perimeter
  const maxFromAdjacent = side1 + side2;

  // For opposite sides, the diagonal should generally be related to them as well
  // In most cases, diagonal < sum of all sides, but we use a practical bound
  const maxFromOpposite = oppositeSide1 + oppositeSide2;

  // The absolute minimum is the larger of the adjacent difference
  const min = minFromAdjacent;

  // The absolute maximum is the smaller of the sums (more restrictive bound)
  const max = Math.min(maxFromAdjacent, maxFromOpposite);

  return { min, max };
}

/**
 * Validate a diagonal measurement against edge measurements
 * @param diagonal Diagonal length
 * @param side1 First adjacent side
 * @param side2 Second adjacent side
 * @param oppositeSide1 First opposite side
 * @param oppositeSide2 Second opposite side
 * @param diagonalName Name of the diagonal (e.g., 'AC')
 * @returns Object with isValid boolean and error message if invalid
 */
function validateDiagonal(
  diagonal: number,
  side1: number,
  side2: number,
  oppositeSide1: number,
  oppositeSide2: number,
  diagonalName: string
): { isValid: boolean; error?: string; suggestedRange?: { min: number; max: number } } {
  if (diagonal <= 0) {
    return { isValid: false, error: 'Diagonal must be positive' };
  }

  const range = calculateDiagonalRange(side1, side2, oppositeSide1, oppositeSide2);

  // Add a generous tolerance (5%) to account for real-world measurement imprecision
  // Customers use tape measures, not laser precision tools
  const tolerance = 0.05;
  const minWithTolerance = range.min * (1 - tolerance);
  const maxWithTolerance = range.max * (1 + tolerance);

  if (diagonal < minWithTolerance) {
    return {
      isValid: false,
      error: `Diagonal ${diagonalName} (${diagonal.toFixed(0)}mm) is too short. With your edge measurements, it should be at least ${range.min.toFixed(0)}mm.`,
      suggestedRange: range
    };
  }

  if (diagonal > maxWithTolerance) {
    return {
      isValid: false,
      error: `Diagonal ${diagonalName} (${diagonal.toFixed(0)}mm) is too long. With your edge measurements, it cannot exceed ${range.max.toFixed(0)}mm.`,
      suggestedRange: range
    };
  }

  return { isValid: true };
}

/**
 * Format diagonal validation errors with helpful context
 * @param errors Array of error messages from validation
 * @returns Formatted error messages with context
 */
function formatDiagonalErrors(errors: string[]): string[] {
  if (errors.length === 0) return [];

  const formattedErrors: string[] = [];
  const hasDiagonalErrors = errors.some(err => err.includes('Diagonal'));

  if (hasDiagonalErrors) {
    formattedErrors.push(
      "We noticed some of your measurements don't quite add up. This is usually caused by a simple typo or mix-up when entering numbers. Please review the following:"
    );
    formattedErrors.push('');
    errors.forEach(err => {
      formattedErrors.push(`• ${err}`);
    });
    formattedErrors.push('');
    formattedErrors.push(
      "Tip: Check that your diagonal measurements are compatible with your edge measurements. If you're unsure, try re-measuring or double-check for typos."
    );
  } else {
    formattedErrors.push(...errors);
  }

  return formattedErrors;
}

/**
 * Validate polygon measurements for geometric feasibility
 * @param measurements Object containing all edge and diagonal measurements in mm
 * @param corners Number of corners (3, 4, 5, or 6)
 * @returns Object with isValid boolean and array of error messages
 */
export function validatePolygonGeometry(measurements: { [key: string]: number }, corners: number): {
  isValid: boolean;
  errors: string[]
} {
  const errors: string[] = [];

  if (corners < 3 || corners > 8) {
    return { isValid: false, errors: ['Invalid number of corners'] };
  }

  console.log(`Validating ${corners}-corner polygon geometry:`, {
    measurementKeys: Object.keys(measurements),
    measurementValues: measurements
  });

  if (corners === 3) {
    const AB = measurements['AB'] || 0;
    const BC = measurements['BC'] || 0;
    const CA = measurements['CA'] || 0;

    if (AB > 0 && BC > 0 && CA > 0) {
      const validation = validateTriangle(AB, BC, CA);
      if (!validation.isValid) {
        errors.push(`Triangle ABC: ${validation.error}`);
      }
    }
  } else if (corners === 4) {
    const AB = measurements['AB'] || 0;
    const BC = measurements['BC'] || 0;
    const CD = measurements['CD'] || 0;
    const DA = measurements['DA'] || 0;
    const AC = measurements['AC'] || 0;
    const BD = measurements['BD'] || 0;

    // Validate diagonal AC against edges AB, BC, CD, DA
    if (AC > 0 && AB > 0 && BC > 0 && CD > 0 && DA > 0) {
      const diagonalValidation = validateDiagonal(AC, AB, BC, CD, DA, 'AC');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal AC is invalid');
      }
    }

    // Validate diagonal BD against edges AB, BC, CD, DA
    if (BD > 0 && AB > 0 && BC > 0 && CD > 0 && DA > 0) {
      const diagonalValidation = validateDiagonal(BD, BC, CD, DA, AB, 'BD');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal BD is invalid');
      }
    }

    // Validate triangles formed by diagonals
    if (AB > 0 && BC > 0 && AC > 0) {
      const validation = validateTriangle(AB, BC, AC);
      if (!validation.isValid) {
        errors.push(`Triangle ABC: ${validation.error}`);
      }
    }
    if (AC > 0 && CD > 0 && DA > 0) {
      const validation = validateTriangle(AC, CD, DA);
      if (!validation.isValid) {
        errors.push(`Triangle ACD: ${validation.error}`);
      }
    }
    if (BD > 0 && AB > 0 && DA > 0) {
      const validation = validateTriangle(BD, AB, DA);
      if (!validation.isValid) {
        errors.push(`Triangle ABD: ${validation.error}`);
      }
    }
    if (BD > 0 && BC > 0 && CD > 0) {
      const validation = validateTriangle(BD, BC, CD);
      if (!validation.isValid) {
        errors.push(`Triangle BCD: ${validation.error}`);
      }
    }
  } else if (corners >= 5 && corners <= 8) {
    // Generic validation: for each diagonal, check the triangle inequality
    // against adjacent edges that form a triangle with it.
    // Allow collinear points (true) for wall-mounted installations.
    const vertexLabels = Array.from({ length: corners }, (_, i) => String.fromCharCode(65 + i));

    // Get all measurements as a map
    const getMeasurement = (a: number, b: number): number => {
      const key1 = vertexLabels[a] + vertexLabels[b];
      const key2 = vertexLabels[b] + vertexLabels[a];
      return measurements[key1] || measurements[key2] || 0;
    };

    // For each pair of vertices that form a diagonal or edge,
    // check if any triangle formed with an intermediate vertex is valid
    const diagonalKeys = getDiagonalKeysForCorners(corners);
    for (const key of diagonalKeys) {
      const iA = key.charCodeAt(0) - 65;
      const iB = key.charCodeAt(1) - 65;
      const diagDist = measurements[key] || 0;
      if (diagDist <= 0) continue;

      // Find adjacent edges that form a direct triangle:
      // If vertices iA and iB are connected through one intermediate vertex
      // along the edge path, validate that triangle
      const shortPath = Math.abs(iB - iA);
      const longPath = corners - shortPath;
      const pathLen = Math.min(shortPath, longPath);

      if (pathLen === 2) {
        // Direct triangle: iA → mid → iB via edges
        const mid = shortPath === 2
          ? (iA + 1) % corners
          : (iB + 1) % corners;
        const side1 = getMeasurement(iA, mid);
        const side2 = getMeasurement(mid, iB);
        if (side1 > 0 && side2 > 0) {
          const v = validateTriangle(side1, side2, diagDist, true);
          if (!v.isValid) {
            const range = calculateTriangleSideRange(side1, side2, true);
            errors.push(`Diagonal ${key} (${diagDist.toFixed(0)}mm) is incompatible with adjacent edges. Valid range: ${range.min}mm to ${range.max}mm.`);
          }
        }
      }
    }
  }

  return { isValid: errors.length === 0, errors };
}

/**
 * Calculate the area of a polygon using triangulation
 * @param measurements Object containing all edge and diagonal measurements in mm
 * @param corners Number of corners (3, 4, 5, or 6)
 * @returns Area in square meters
 */
export function calculatePolygonArea(measurements: { [key: string]: number }, corners: number, heights?: number[], points?: { x: number; y: number }[]): number {
  if (corners < 3 || corners > 8) return 0;

  // Project measurements to horizontal if heights available
  const m = (heights && heights.length >= corners && heights.every(h => h > 0))
    ? projectMeasurementsToHorizontal(measurements, corners, heights)
    : measurements;

  let totalAreaMm2 = 0;

  if (corners === 3) {
    // Triangle: use sides AB, BC, CA
    const AB = m['AB'] || 0;
    const BC = m['BC'] || 0;
    const CA = m['CA'] || 0;

    if (AB > 0 && BC > 0 && CA > 0) {
      totalAreaMm2 = calculateTriangleArea(AB, BC, CA);
    }
  } else if (corners === 4) {
    // Quadrilateral: triangulate into ABC and ACD using diagonal AC
    const AB = m['AB'] || 0;
    const BC = m['BC'] || 0;
    const CD = m['CD'] || 0;
    const DA = m['DA'] || 0;
    const AC = m['AC'] || 0;

    if (AB > 0 && BC > 0 && AC > 0) {
      totalAreaMm2 += calculateTriangleArea(AB, BC, AC);
    }
    if (AC > 0 && CD > 0 && DA > 0) {
      totalAreaMm2 += calculateTriangleArea(AC, CD, DA);
    }
  } else if (corners === 5) {
    // Pentagon: triangulate into ABC, ACD, ADE using diagonals AC and AD
    const AB = m['AB'] || 0;
    const BC = m['BC'] || 0;
    const CD = m['CD'] || 0;
    const DE = m['DE'] || 0;
    const EA = m['EA'] || 0;
    const AC = m['AC'] || 0;
    const AD = m['AD'] || 0;

    if (AB > 0 && BC > 0 && AC > 0) {
      totalAreaMm2 += calculateTriangleArea(AB, BC, AC);
    }
    if (AC > 0 && CD > 0 && AD > 0) {
      totalAreaMm2 += calculateTriangleArea(AC, CD, AD);
    }
    if (AD > 0 && DE > 0 && EA > 0) {
      totalAreaMm2 += calculateTriangleArea(AD, DE, EA);
    }
  } else if (corners === 6) {
    // Hexagon: triangulate into ABC, ACD, ADE, AEF using diagonals AC, AD, AE
    const AB = m['AB'] || 0;
    const BC = m['BC'] || 0;
    const CD = m['CD'] || 0;
    const DE = m['DE'] || 0;
    const EF = m['EF'] || 0;
    const FA = m['FA'] || 0;
    const AC = m['AC'] || 0;
    const AD = m['AD'] || 0;
    const AE = m['AE'] || 0;

    if (AB > 0 && BC > 0 && AC > 0) {
      totalAreaMm2 += calculateTriangleArea(AB, BC, AC);
    }
    if (AC > 0 && CD > 0 && AD > 0) {
      totalAreaMm2 += calculateTriangleArea(AC, CD, AD);
    }
    if (AD > 0 && DE > 0 && AE > 0) {
      totalAreaMm2 += calculateTriangleArea(AD, DE, AE);
    }
    if (AE > 0 && EF > 0 && FA > 0) {
      totalAreaMm2 += calculateTriangleArea(AE, EF, FA);
    }
  } else if (corners === 7) {
    const AB = m['AB'] || 0;
    const BC = m['BC'] || 0;
    const CD = m['CD'] || 0;
    const DE = m['DE'] || 0;
    const EF = m['EF'] || 0;
    const FG = m['FG'] || 0;
    const GA = m['GA'] || 0;
    const AC = m['AC'] || 0;
    const AD = m['AD'] || 0;
    const AE = m['AE'] || 0;
    const AF = m['AF'] || 0;

    if (AB > 0 && BC > 0 && AC > 0) totalAreaMm2 += calculateTriangleArea(AB, BC, AC);
    if (AC > 0 && CD > 0 && AD > 0) totalAreaMm2 += calculateTriangleArea(AC, CD, AD);
    if (AD > 0 && DE > 0 && AE > 0) totalAreaMm2 += calculateTriangleArea(AD, DE, AE);
    if (AE > 0 && EF > 0 && AF > 0) totalAreaMm2 += calculateTriangleArea(AE, EF, AF);
    if (AF > 0 && FG > 0 && GA > 0) totalAreaMm2 += calculateTriangleArea(AF, FG, GA);
  } else if (corners === 8) {
    const AB = m['AB'] || 0;
    const BC = m['BC'] || 0;
    const CD = m['CD'] || 0;
    const DE = m['DE'] || 0;
    const EF = m['EF'] || 0;
    const FG = m['FG'] || 0;
    const GH = m['GH'] || 0;
    const HA = m['HA'] || 0;
    const AC = m['AC'] || 0;
    const AD = m['AD'] || 0;
    const AE = m['AE'] || 0;
    const AF = m['AF'] || 0;
    const AG = m['AG'] || 0;

    if (AB > 0 && BC > 0 && AC > 0) totalAreaMm2 += calculateTriangleArea(AB, BC, AC);
    if (AC > 0 && CD > 0 && AD > 0) totalAreaMm2 += calculateTriangleArea(AC, CD, AD);
    if (AD > 0 && DE > 0 && AE > 0) totalAreaMm2 += calculateTriangleArea(AD, DE, AE);
    if (AE > 0 && EF > 0 && AF > 0) totalAreaMm2 += calculateTriangleArea(AE, EF, AF);
    if (AF > 0 && FG > 0 && AG > 0) totalAreaMm2 += calculateTriangleArea(AF, FG, AG);
    if (AG > 0 && GH > 0 && HA > 0) totalAreaMm2 += calculateTriangleArea(AG, GH, HA);
  }

  // If Heron's formula produced a valid area, use it
  if (totalAreaMm2 > 0) {
    return totalAreaMm2 / 1000000;
  }

  // Fallback: use Shoelace on canvas points scaled by edge measurements.
  // This handles 7/8-corner shapes where diagonals are missing.
  if (points && points.length >= corners) {
    const activePoints = points.slice(0, corners);
    const allPositioned = activePoints.some(p => p.x !== 0 || p.y !== 0);
    if (allPositioned) {
      const scaled = areaFromPointsScaled(activePoints, m, corners);
      if (scaled > 0) return scaled;
    }
  }

  return totalAreaMm2 / 1000000;
}

/**
 * Calculate Euclidean distance between two points
 */
function calculateDistance(p1: Point, p2: Point): number {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
}

/**
 * Calculate the centroid (center point) of a polygon
 */
function calculateCentroid(points: Point[]): Point {
  const sum = points.reduce((acc, point) => ({
    x: acc.x + point.x,
    y: acc.y + point.y
  }), { x: 0, y: 0 });

  return {
    x: sum.x / points.length,
    y: sum.y / points.length
  };
}

/**
 * Calculate position of third point using trilateration
 * Given two points A and B, and distances from A and C, find position of C
 */
function trilateratePoint(
  A: Point,
  B: Point,
  distAC: number,
  distBC: number
): Point | null {
  const distAB = calculateDistance(A, B);

  // Tolerance: allow up to 0.1% of the longest side or 2mm (whichever is larger)
  // to handle imperial-to-metric rounding and near-collinear fixing points
  const tol = Math.max(2, Math.max(distAC, distBC, distAB) * 0.001);

  if (distAC + distBC < distAB - tol || distAC + distAB < distBC - tol || distBC + distAB < distAC - tol) {
    return null;
  }

  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const angle = Math.atan2(dy, dx);

  const x = (distAC * distAC - distBC * distBC + distAB * distAB) / (2 * distAB);

  let ySquared = distAC * distAC - x * x;
  // Clamp near-zero negative values (collinear points from rounding)
  if (ySquared < 0) {
    if (ySquared > -(tol * tol)) {
      ySquared = 0;
    } else {
      return null;
    }
  }

  const y = Math.sqrt(ySquared);

  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return {
    x: A.x + x * cos - y * sin,
    y: A.y + x * sin + y * cos
  };
}

function trilateratePointBothSides(
  A: Point,
  B: Point,
  distAC: number,
  distBC: number
): [Point, Point] | null {
  const distAB = calculateDistance(A, B);

  const tol = Math.max(2, Math.max(distAC, distBC, distAB) * 0.001);

  if (distAC + distBC < distAB - tol || distAC + distAB < distBC - tol || distBC + distAB < distAC - tol) {
    return null;
  }

  const dx = B.x - A.x;
  const dy = B.y - A.y;
  const angle = Math.atan2(dy, dx);
  const x = (distAC * distAC - distBC * distBC + distAB * distAB) / (2 * distAB);
  let ySquared = distAC * distAC - x * x;
  if (ySquared < 0) {
    if (ySquared > -(tol * tol)) {
      ySquared = 0;
    } else {
      return null;
    }
  }

  const y = Math.sqrt(ySquared);
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);

  return [
    { x: A.x + x * cos - y * sin, y: A.y + x * sin + y * cos },
    { x: A.x + x * cos + y * sin, y: A.y + x * sin - y * cos },
  ];
}

function segmentsIntersect(
  p1: Point, p2: Point, p3: Point, p4: Point
): boolean {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = ((p3.x - p1.x) * d2y - (p3.y - p1.y) * d2x) / cross;
  const u = ((p3.x - p1.x) * d1y - (p3.y - p1.y) * d1x) / cross;
  return t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999;
}

function isSimplePolygon(points: Point[]): boolean {
  const n = points.length;
  for (let i = 0; i < n; i++) {
    const a = points[i];
    const b = points[(i + 1) % n];
    for (let j = i + 2; j < n; j++) {
      if (j === n - 1 && i === 0) continue;
      const c = points[j];
      const d = points[(j + 1) % n];
      if (segmentsIntersect(a, b, c, d)) return false;
    }
  }
  return true;
}

function polygonSignedArea(points: Point[]): number {
  let area = 0;
  for (let i = 0; i < points.length; i++) {
    const j = (i + 1) % points.length;
    area += points[i].x * points[j].y;
    area -= points[j].x * points[i].y;
  }
  return area / 2;
}

function pickValidPoint(
  candidates: [Point, Point],
  existingPoints: Point[],
  expectedEdgeFromLast: number | null
): Point {
  const [p1, p2] = candidates;
  const n = existingPoints.length;

  // Try candidate 1 first -- check if the resulting polygon remains simple
  const test1 = [...existingPoints, p1];
  const test2 = [...existingPoints, p2];

  const simple1 = isSimplePolygon(test1);
  const simple2 = isSimplePolygon(test2);

  if (simple1 && !simple2) return p1;
  if (simple2 && !simple1) return p2;

  // Both are simple or both fail - pick the one that maintains consistent winding
  // (positive signed area = counterclockwise in standard math coords)
  const area1 = polygonSignedArea(test1);
  const area2 = polygonSignedArea(test2);

  // Prefer the solution that gives larger absolute area (more "spread out" polygon)
  if (Math.abs(area1) > Math.abs(area2)) return p1;
  if (Math.abs(area2) > Math.abs(area1)) return p2;

  return p1;
}

/**
 * Find the best position for a new vertex given multiple distance constraints.
 * Uses least-squares: generates candidate positions from all pairs of constraints,
 * then picks the one minimizing total squared error against ALL constraints.
 */
function findBestPoint(
  constraints: { point: Point; distance: number }[],
  existingPoints: Point[]
): Point | null {
  if (constraints.length < 2) return null;

  const candidates: Point[] = [];

  // Generate candidates from all pairs of constraints
  for (let i = 0; i < constraints.length; i++) {
    for (let j = i + 1; j < constraints.length; j++) {
      const { point: P1, distance: d1 } = constraints[i];
      const { point: P2, distance: d2 } = constraints[j];
      const both = trilateratePointBothSides(P1, P2, d1, d2);
      if (both) {
        candidates.push(both[0], both[1]);
      }
    }
  }

  if (candidates.length === 0) return null;

  // Score each candidate by total squared error against all constraints
  let bestSimple: Point | null = null;
  let bestSimpleError = Infinity;
  let bestAny: Point | null = null;
  let bestAnyError = Infinity;

  for (const candidate of candidates) {
    let totalError = 0;
    for (const { point, distance } of constraints) {
      const actualDist = calculateDistance(candidate, point);
      totalError += (actualDist - distance) ** 2;
    }

    if (totalError < bestAnyError) {
      bestAnyError = totalError;
      bestAny = candidate;
    }

    // Prefer candidates that keep the polygon simple
    if (existingPoints.length >= 3) {
      const testPoly = [...existingPoints, candidate];
      if (isSimplePolygon(testPoly) && totalError < bestSimpleError) {
        bestSimpleError = totalError;
        bestSimple = candidate;
      }
    } else if (totalError < bestSimpleError) {
      bestSimpleError = totalError;
      bestSimple = candidate;
    }
  }

  return bestSimple || bestAny;
}

/**
 * Scale polygon to fit within canvas bounds
 */
function scalePolygonToCanvas(
  points: Point[],
  canvasWidth: number,
  canvasHeight: number,
  margin: number = 120
): Point[] {
  if (points.length === 0) return points;

  // Find bounding box
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  let width = maxX - minX;
  let height = maxY - minY;

  // Handle degenerate shapes (collinear points) by adding minimum dimension
  // This prevents division by zero and off-screen rendering
  const minDimension = 10; // Minimum dimension in coordinate space
  if (width < minDimension) width = minDimension;
  if (height < minDimension) height = minDimension;

  // Calculate scale to fit within canvas with margin
  const availableWidth = canvasWidth - 2 * margin;
  const availableHeight = canvasHeight - 2 * margin;
  const scale = Math.min(availableWidth / width, availableHeight / height);

  // Calculate center offset
  const centerX = canvasWidth / 2;
  const centerY = canvasHeight / 2;
  const polygonCenterX = (minX + maxX) / 2;
  const polygonCenterY = (minY + maxY) / 2;

  // Scale and center
  return points.map(p => ({
    x: centerX + (p.x - polygonCenterX) * scale,
    y: centerY + (p.y - polygonCenterY) * scale
  }));
}

/**
 * Check if all required measurements are present for reconstruction
 */
export function hasRequiredMeasurements(
  measurements: { [key: string]: number },
  corners: number
): boolean {
  if (corners === 3) {
    return !!(measurements['AB'] && measurements['BC'] && measurements['CA']);
  }
  if (corners < 4 || corners > 8) return false;

  // Check all edges
  for (let i = 0; i < corners; i++) {
    const next = (i + 1) % corners;
    const key = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + next)}`;
    if (!measurements[key] || measurements[key] <= 0) return false;
  }

  // Check all required diagonals
  const diagonalKeys = getDiagonalKeysForCorners(corners);
  for (const key of diagonalKeys) {
    if (!measurements[key] || measurements[key] <= 0) return false;
  }

  return true;
}

/**
 * Whether we have enough measurements to draw a shape at all (even an
 * approximate one). Triangles and quadrilaterals can be reconstructed from
 * edges alone (quads approximately, refining once a diagonal is added), while
 * 5-8 sided shapes need diagonals for the solver to place every vertex.
 */
export function canReconstructShape(
  measurements: { [key: string]: number },
  corners: number
): boolean {
  if (corners < 3 || corners > 8) return false;

  // All edges are required for any reconstruction
  for (let i = 0; i < corners; i++) {
    const next = (i + 1) % corners;
    const key = `${String.fromCharCode(65 + i)}${String.fromCharCode(65 + next)}`;
    if (!measurements[key] || measurements[key] <= 0) return false;
  }

  // Triangles and quads can be drawn from edges only.
  if (corners <= 4) return true;

  // 5+ sided shapes still need their diagonals to be solvable.
  return hasRequiredMeasurements(measurements, corners);
}

/**
 * Reconstruct polygon from edge and diagonal measurements
 */
export function reconstructPolygonFromMeasurements(
  measurements: { [key: string]: number },
  corners: number,
  canvasWidth: number = 600,
  canvasHeight: number = 600,
  heights?: number[]
): Point[] | null {
  // Project measurements to horizontal if heights are provided
  const projMeasurements = (heights && heights.length >= corners && heights.every(h => h > 0))
    ? projectMeasurementsToHorizontal(measurements, corners, heights)
    : measurements;

  // Check if we have enough measurements to draw a shape
  if (!canReconstructShape(projMeasurements, corners)) {
    console.log('Reconstruction skipped: missing required measurements', {
      corners,
      measurements: Object.keys(projMeasurements),
      canReconstruct: canReconstructShape(projMeasurements, corners)
    });
    return null;
  }

  // Validate geometry first
  const validation = validatePolygonGeometry(projMeasurements, corners);
  if (!validation.isValid) {
    console.warn('Reconstruction failed: geometry validation errors', {
      corners,
      errors: validation.errors
    });
    return null;
  }

  // Use projected measurements for reconstruction
  const m = projMeasurements;

  let points: Point[] = [];

  if (corners === 3) {
    // Reconstruct triangle
    const AB = m['AB'];
    const BC = m['BC'];
    const CA = m['CA'];

    // Place A at origin
    const A: Point = { x: 0, y: 0 };

    // Place B along x-axis
    const B: Point = { x: AB, y: 0 };

    // Calculate C using trilateration
    const C = trilateratePoint(A, B, CA, BC);
    if (!C) return null;

    points = [A, B, C];

  } else if (corners === 4) {
    // Reconstruct quadrilateral
    const AB = m['AB'];
    const BC = m['BC'];
    const CD = m['CD'];
    const DA = m['DA'];
    const AC = m['AC'];
    const BD = m['BD'];

    console.log('4-corner reconstruction:', {
      hasAC: !!AC,
      hasBD: !!BD,
      edges: { AB, BC, CD, DA }
    });

    // Place A at origin
    const A: Point = { x: 0, y: 0 };

    // Place B along x-axis
    const B: Point = { x: AB, y: 0 };

    // Calculate C using diagonal AC or approximate with edge BC
    let C: Point | null = null;
    if (AC) {
      // Precise placement using diagonal
      console.log('Using diagonal AC for precise C placement');
      C = trilateratePoint(A, B, AC, BC);
    } else {
      // Approximate placement: Use 90-degree angle for reasonable shape
      // This creates a roughly rectangular quadrilateral
      console.log('Using approximate C placement (no diagonal AC)');
      const angle = Math.PI / 2; // 90 degrees
      C = {
        x: B.x + BC * Math.cos(angle),
        y: B.y + BC * Math.sin(angle)
      };
    }
    if (!C) return null;

    // Calculate D using diagonals if available, otherwise approximate
    let D: Point | null = null;
    if (AC) {
      const candidates = trilateratePointBothSides(A, C, DA, CD);
      if (candidates) D = pickValidPoint(candidates, [A, B, C], null);
    } else if (BD) {
      const candidates = trilateratePointBothSides(A, B, DA, BD);
      if (candidates) D = pickValidPoint(candidates, [A, B, C], null);
    } else {
      const candidates = trilateratePointBothSides(A, C, DA, CD);
      if (candidates) D = pickValidPoint(candidates, [A, B, C], null);

      if (!D) {
        const directionX = C.x - B.x;
        const directionY = C.y - B.y;
        const len = Math.sqrt(directionX * directionX + directionY * directionY);
        const normalizedX = directionX / len;
        const normalizedY = directionY / len;

        D = {
          x: A.x + DA * normalizedX,
          y: A.y + DA * normalizedY
        };
      }
    }
    if (!D) return null;

    points = [A, B, C, D];

  } else if (corners >= 5 && corners <= 8) {
    // Generic N-corner reconstruction using least-squares point placement
    const vertexLabels = Array.from({ length: corners }, (_, i) => String.fromCharCode(65 + i));

    // Place A at origin, B on x-axis
    const AB = m['AB'];
    const A: Point = { x: 0, y: 0 };
    const B: Point = { x: AB, y: 0 };
    points = [A, B];

    // C is determined by AC and BC (positive y-side of AB line)
    const AC = m['AC'];
    const BC = m['BC'];
    const C = trilateratePoint(A, B, AC, BC);
    if (!C) return null;
    points.push(C);

    // For each subsequent vertex D, E, F, G, H...
    for (let vi = 3; vi < corners; vi++) {
      const vLabel = vertexLabels[vi];
      const constraints: { point: Point; distance: number }[] = [];

      // Gather all distance constraints from already-placed vertices to this one
      for (let pi = 0; pi < vi; pi++) {
        const pLabel = vertexLabels[pi];
        // Check both key orderings (e.g. "AD" and "DA")
        const key1 = pLabel + vLabel;
        const key2 = vLabel + pLabel;
        const dist = m[key1] || m[key2];
        if (dist && dist > 0) {
          constraints.push({ point: points[pi], distance: dist });
        }
      }

      // Also use edge from previous vertex
      const prevLabel = vertexLabels[vi - 1];
      const edgeKey = prevLabel + vLabel;
      const edgeDist = m[edgeKey];
      if (edgeDist && edgeDist > 0) {
        const alreadyHas = constraints.some(c => c.point === points[vi - 1]);
        if (!alreadyHas) {
          constraints.push({ point: points[vi - 1], distance: edgeDist });
        }
      }

      // For the last vertex, also add the closing edge back to A
      if (vi === corners - 1) {
        const closingKey = vLabel + 'A';
        const closingKey2 = 'A' + vLabel;
        const closingDist = m[closingKey] || m[closingKey2];
        if (closingDist && closingDist > 0) {
          const alreadyHas = constraints.some(c => c.point === points[0]);
          if (!alreadyHas) {
            constraints.push({ point: points[0], distance: closingDist });
          }
        }
      }

      if (constraints.length < 2) return null;

      const newPoint = findBestPoint(constraints, points);
      if (!newPoint) return null;
      points.push(newPoint);
    }

    if (!isSimplePolygon(points)) return null;
  }

  // Scale and center the polygon to fit canvas
  return scalePolygonToCanvas(points, canvasWidth, canvasHeight);
}

/**
 * Reconstruct polygon without scaling - returns raw coordinates in mm.
 * Used for confidence scoring and 3D position computation.
 */
function reconstructPolygonRaw(
  measurements: { [key: string]: number },
  corners: number
): Point[] | null {
  if (!hasRequiredMeasurements(measurements, corners)) return null;

  const validation = validatePolygonGeometry(measurements, corners);
  if (!validation.isValid) return null;

  let points: Point[] = [];

  if (corners === 3) {
    const AB = measurements['AB'];
    const BC = measurements['BC'];
    const CA = measurements['CA'];
    const A: Point = { x: 0, y: 0 };
    const B: Point = { x: AB, y: 0 };
    const C = trilateratePoint(A, B, CA, BC);
    if (!C) return null;
    points = [A, B, C];
  } else if (corners === 4) {
    const AB = measurements['AB'];
    const BC = measurements['BC'];
    const CD = measurements['CD'];
    const DA = measurements['DA'];
    const AC = measurements['AC'] || 0;
    const BD = measurements['BD'] || 0;
    const A: Point = { x: 0, y: 0 };
    const B: Point = { x: AB, y: 0 };
    let C: Point | null = null;
    if (AC > 0) {
      C = trilateratePoint(A, B, AC, BC);
    }
    if (!C) return null;
    let D: Point | null = null;
    if (BD > 0) {
      const dCands = trilateratePointBothSides(B, C, BD, CD);
      if (dCands) D = pickValidPoint(dCands, [A, B, C], null);
    }
    if (!D) {
      const dCands = trilateratePointBothSides(A, C, DA, CD);
      if (dCands) D = pickValidPoint(dCands, [A, B, C], null);
    }
    if (!D) return null;
    points = [A, B, C, D];
  } else if (corners >= 5 && corners <= 8) {
    const vertexLabels = Array.from({ length: corners }, (_, i) => String.fromCharCode(65 + i));
    const AB = measurements['AB'];
    const AC = measurements['AC'];
    const BC = measurements['BC'];
    const A: Point = { x: 0, y: 0 };
    const B: Point = { x: AB, y: 0 };
    const C = trilateratePoint(A, B, AC, BC);
    if (!C) return null;
    points = [A, B, C];

    for (let vi = 3; vi < corners; vi++) {
      const vLabel = vertexLabels[vi];
      const constraints: { point: Point; distance: number }[] = [];

      for (let pi = 0; pi < vi; pi++) {
        const pLabel = vertexLabels[pi];
        const key1 = pLabel + vLabel;
        const key2 = vLabel + pLabel;
        const dist = measurements[key1] || measurements[key2];
        if (dist && dist > 0) {
          constraints.push({ point: points[pi], distance: dist });
        }
      }

      const prevLabel = vertexLabels[vi - 1];
      const edgeKey = prevLabel + vLabel;
      const edgeDist = measurements[edgeKey];
      if (edgeDist && edgeDist > 0) {
        const alreadyHas = constraints.some(c => c.point === points[vi - 1]);
        if (!alreadyHas) {
          constraints.push({ point: points[vi - 1], distance: edgeDist });
        }
      }

      if (vi === corners - 1) {
        const closingKey = vLabel + 'A';
        const closingKey2 = 'A' + vLabel;
        const closingDist = measurements[closingKey] || measurements[closingKey2];
        if (closingDist && closingDist > 0) {
          const alreadyHas = constraints.some(c => c.point === points[0]);
          if (!alreadyHas) {
            constraints.push({ point: points[0], distance: closingDist });
          }
        }
      }

      if (constraints.length < 2) return null;
      const newPoint = findBestPoint(constraints, points);
      if (!newPoint) return null;
      points.push(newPoint);
    }
  }

  if (!isSimplePolygon(points)) return null;
  return points;
}

export function detectMatchingFixedShape(
  measurements: { [key: string]: number },
  corners: number
): FixedShapeType | null {
  if (corners === 3) {
    const ab = measurements['AB'], bc = measurements['BC'], ca = measurements['CA'];
    if (!ab || !bc || !ca) return null;
    const tol = Math.max(ab, bc, ca) * 0.02;
    if (Math.abs(ab - bc) <= tol && Math.abs(bc - ca) <= tol) return 'triangle';
    const sides = [ab, bc, ca].sort((a, b) => a - b);
    const hypSq = sides[2] * sides[2];
    const legSq = sides[0] * sides[0] + sides[1] * sides[1];
    if (Math.abs(hypSq - legSq) <= hypSq * 0.03) return 'right-angle-triangle';
    return null;
  }
  if (corners === 4) {
    const ab = measurements['AB'], bc = measurements['BC'], cd = measurements['CD'], da = measurements['DA'];
    if (!ab || !bc || !cd || !da) return null;
    const tol = Math.max(ab, bc, cd, da) * 0.02;
    const allEqual = Math.abs(ab - bc) <= tol && Math.abs(bc - cd) <= tol && Math.abs(cd - da) <= tol;
    if (allEqual) return 'square';
    const pairsMatch = Math.abs(ab - cd) <= tol && Math.abs(bc - da) <= tol;
    if (pairsMatch) return 'rectangle';
    return null;
  }
  return null;
}
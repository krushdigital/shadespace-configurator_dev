import { Point } from '../types';

// Unit conversion constants
const MM_TO_INCHES = 0.0393701;
const INCHES_TO_MM = 25.4;

// Measurement range constants (4-5 digits in metric)
export const MIN_MEASUREMENT_MM = 1000; // 1000mm = 39.4 inches (minimum 4-digit metric)
export const MAX_MEASUREMENT_MM = 99999; // 99999mm = 3937 inches (maximum 5-digit metric)

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
    
    // Otherwise, show feet and inches as before
    if (inches >= 12) {
      const feet = Math.floor(inches / 12);
      const remainingInches = inches % 12;
      return parseFloat(remainingInches.toFixed(1)) > 0
        ? `${feet}'${remainingInches.toFixed(1)}"` 
        : `${feet}'`;
    }
    return `${inches.toFixed(1)}"`;
  }
  return `${Math.round(mm)}mm`;
}

export function formatArea(mm2: number, unit: 'metric' | 'imperial'): string {
  if (unit === 'imperial') {
    const sqInches = mm2 * (MM_TO_INCHES * MM_TO_INCHES);
    const sqFeet = sqInches / 144;
    return sqFeet >= 1 ? `${sqFeet.toFixed(1)} ft²` : `${Math.round(sqInches)} in²`;
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
        // Small values (51-78") that might need multiplication by 10
        else if (valueInInches >= 51 && valueInInches <= 78 && valueInInches * 10 >= TYPICAL_MIN_INCHES && valueInInches * 10 <= TYPICAL_MAX_INCHES) {
          typoSuggestions[key] = (valueInInches * 10) * INCHES_TO_MM;
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
        // Small values (31-78") that might need multiplication by 10
        else if (heightInInches >= 31 && heightInInches <= 78 && heightInInches * 10 >= TYPICAL_HEIGHT_MIN_INCHES && heightInInches * 10 <= TYPICAL_HEIGHT_MAX_INCHES) {
          typoSuggestions[heightKey] = (heightInInches * 10) * INCHES_TO_MM;
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
  const diagonals: string[] = [];
  
  if (corners === 4) {
    diagonals.push('AC', 'BD');
  } else if (corners === 5) {
    diagonals.push('AC', 'AD', 'CE', 'BD', 'BE');
  } else if (corners === 6) {
    diagonals.push('AC', 'AD', 'AE', 'BD', 'BE', 'BF', 'CE', 'CF', 'DF');
  }
  
  return diagonals;
}
/**
 * Calculate the area of a triangle using Heron's formula
 * @param a Side length in mm
 * @param b Side length in mm  
 * @param c Side length in mm
 * @returns Area in square mm, or 0 if triangle is invalid
 */
export function calculateTriangleArea(a: number, b: number, c: number): number {
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
 * @returns Object with isValid boolean and error message if invalid
 */
export function validateTriangle(a: number, b: number, c: number): { isValid: boolean; error?: string } {
  if (a <= 0 || b <= 0 || c <= 0) {
    return { isValid: false, error: 'All sides must be positive' };
  }

  // Add 3% tolerance to account for real-world measurement imprecision
  const tolerance = 0.03;
  const toleranceMultiplier = 1 - tolerance;

  // Only flag if the violation is significant (beyond measurement error)
  if (a + b <= c * toleranceMultiplier) {
    return { isValid: false, error: `Triangle inequality violated: ${a.toFixed(0)} + ${b.toFixed(0)} = ${(a+b).toFixed(0)} ≤ ${c.toFixed(0)}` };
  }
  if (a + c <= b * toleranceMultiplier) {
    return { isValid: false, error: `Triangle inequality violated: ${a.toFixed(0)} + ${c.toFixed(0)} = ${(a+c).toFixed(0)} ≤ ${b.toFixed(0)}` };
  }
  if (b + c <= a * toleranceMultiplier) {
    return { isValid: false, error: `Triangle inequality violated: ${b.toFixed(0)} + ${c.toFixed(0)} = ${(b+c).toFixed(0)} ≤ ${a.toFixed(0)}` };
  }
  return { isValid: true };
}

/**
 * Calculate the feasible range for a diagonal in a quadrilateral
 * @param side1 First adjacent side
 * @param side2 Second adjacent side
 * @param oppositeSide1 First opposite side
 * @param oppositeSide2 Second opposite side
 * @returns Object with min and max feasible diagonal lengths
 */
export function calculateDiagonalRange(
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
export function validateDiagonal(
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
export function formatDiagonalErrors(errors: string[]): string[] {
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

  if (corners < 3 || corners > 6) {
    return { isValid: false, errors: ['Invalid number of corners'] };
  }

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
  } else if (corners === 5) {
    const AB = measurements['AB'] || 0;
    const BC = measurements['BC'] || 0;
    const CD = measurements['CD'] || 0;
    const DE = measurements['DE'] || 0;
    const EA = measurements['EA'] || 0;
    const AC = measurements['AC'] || 0;
    const AD = measurements['AD'] || 0;
    const BD = measurements['BD'] || 0;
    const BE = measurements['BE'] || 0;
    const CE = measurements['CE'] || 0;

    // Validate diagonal AC
    if (AC > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EA > 0) {
      const diagonalValidation = validateDiagonal(AC, AB, BC, DE, EA, 'AC');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal AC is invalid');
      }
    }

    // Validate diagonal AD
    if (AD > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EA > 0) {
      const diagonalValidation = validateDiagonal(AD, AB, BC + CD, DE, EA, 'AD');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal AD is invalid');
      }
    }

    // Validate diagonal BD
    if (BD > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EA > 0) {
      const diagonalValidation = validateDiagonal(BD, BC, CD, EA, AB, 'BD');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal BD is invalid');
      }
    }

    // Validate diagonal BE
    if (BE > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EA > 0) {
      const diagonalValidation = validateDiagonal(BE, BC, CD + DE, EA, AB, 'BE');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal BE is invalid');
      }
    }

    // Validate diagonal CE
    if (CE > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EA > 0) {
      const diagonalValidation = validateDiagonal(CE, CD, DE, AB, BC, 'CE');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal CE is invalid');
      }
    }

    // Validate triangles
    if (AB > 0 && BC > 0 && AC > 0) {
      const validation = validateTriangle(AB, BC, AC);
      if (!validation.isValid) {
        errors.push(`Triangle ABC: ${validation.error}`);
      }
    }
    if (AC > 0 && CD > 0 && AD > 0) {
      const validation = validateTriangle(AC, CD, AD);
      if (!validation.isValid) {
        errors.push(`Triangle ACD: ${validation.error}`);
      }
    }
    if (AD > 0 && DE > 0 && EA > 0) {
      const validation = validateTriangle(AD, DE, EA);
      if (!validation.isValid) {
        errors.push(`Triangle ADE: ${validation.error}`);
      }
    }
  } else if (corners === 6) {
    const AB = measurements['AB'] || 0;
    const BC = measurements['BC'] || 0;
    const CD = measurements['CD'] || 0;
    const DE = measurements['DE'] || 0;
    const EF = measurements['EF'] || 0;
    const FA = measurements['FA'] || 0;
    const AC = measurements['AC'] || 0;
    const AD = measurements['AD'] || 0;
    const AE = measurements['AE'] || 0;
    const BD = measurements['BD'] || 0;
    const BE = measurements['BE'] || 0;
    const BF = measurements['BF'] || 0;
    const CE = measurements['CE'] || 0;
    const CF = measurements['CF'] || 0;
    const DF = measurements['DF'] || 0;

    // Validate diagonal AC
    if (AC > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EF > 0 && FA > 0) {
      const diagonalValidation = validateDiagonal(AC, AB, BC, DE, EF + FA, 'AC');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal AC is invalid');
      }
    }

    // Validate diagonal AD
    if (AD > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EF > 0 && FA > 0) {
      const diagonalValidation = validateDiagonal(AD, AB, BC + CD, DE, EF + FA, 'AD');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal AD is invalid');
      }
    }

    // Validate diagonal AE
    if (AE > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EF > 0 && FA > 0) {
      const diagonalValidation = validateDiagonal(AE, AB, BC + CD + DE, EF, FA, 'AE');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal AE is invalid');
      }
    }

    // Validate diagonal BD
    if (BD > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EF > 0 && FA > 0) {
      const diagonalValidation = validateDiagonal(BD, BC, CD, EF, FA + AB, 'BD');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal BD is invalid');
      }
    }

    // Validate diagonal BE
    if (BE > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EF > 0 && FA > 0) {
      const diagonalValidation = validateDiagonal(BE, BC, CD + DE, EF, FA + AB, 'BE');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal BE is invalid');
      }
    }

    // Validate diagonal BF
    if (BF > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EF > 0 && FA > 0) {
      const diagonalValidation = validateDiagonal(BF, BC, CD + DE + EF, FA, AB, 'BF');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal BF is invalid');
      }
    }

    // Validate diagonal CE
    if (CE > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EF > 0 && FA > 0) {
      const diagonalValidation = validateDiagonal(CE, CD, DE, FA, AB + BC, 'CE');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal CE is invalid');
      }
    }

    // Validate diagonal CF
    if (CF > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EF > 0 && FA > 0) {
      const diagonalValidation = validateDiagonal(CF, CD, DE + EF, FA, AB + BC, 'CF');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal CF is invalid');
      }
    }

    // Validate diagonal DF
    if (DF > 0 && AB > 0 && BC > 0 && CD > 0 && DE > 0 && EF > 0 && FA > 0) {
      const diagonalValidation = validateDiagonal(DF, DE, EF, AB, BC + CD, 'DF');
      if (!diagonalValidation.isValid) {
        errors.push(diagonalValidation.error || 'Diagonal DF is invalid');
      }
    }

    // Validate triangles
    if (AB > 0 && BC > 0 && AC > 0) {
      const validation = validateTriangle(AB, BC, AC);
      if (!validation.isValid) {
        errors.push(`Triangle ABC: ${validation.error}`);
      }
    }
    if (AC > 0 && CD > 0 && AD > 0) {
      const validation = validateTriangle(AC, CD, AD);
      if (!validation.isValid) {
        errors.push(`Triangle ACD: ${validation.error}`);
      }
    }
    if (AD > 0 && DE > 0 && AE > 0) {
      const validation = validateTriangle(AD, DE, AE);
      if (!validation.isValid) {
        errors.push(`Triangle ADE: ${validation.error}`);
      }
    }
    if (AE > 0 && EF > 0 && FA > 0) {
      const validation = validateTriangle(AE, EF, FA);
      if (!validation.isValid) {
        errors.push(`Triangle AEF: ${validation.error}`);
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
export function calculatePolygonArea(measurements: { [key: string]: number }, corners: number): number {
  if (corners < 3 || corners > 6) return 0;

  let totalAreaMm2 = 0;

  if (corners === 3) {
    // Triangle: use sides AB, BC, CA
    const AB = measurements['AB'] || 0;
    const BC = measurements['BC'] || 0;
    const CA = measurements['CA'] || 0;

    if (AB > 0 && BC > 0 && CA > 0) {
      totalAreaMm2 = calculateTriangleArea(AB, BC, CA);
    }
  } else if (corners === 4) {
    // Quadrilateral: triangulate into ABC and ACD using diagonal AC
    const AB = measurements['AB'] || 0;
    const BC = measurements['BC'] || 0;
    const CD = measurements['CD'] || 0;
    const DA = measurements['DA'] || 0;
    const AC = measurements['AC'] || 0;

    if (AB > 0 && BC > 0 && AC > 0) {
      totalAreaMm2 += calculateTriangleArea(AB, BC, AC);
    }
    if (AC > 0 && CD > 0 && DA > 0) {
      totalAreaMm2 += calculateTriangleArea(AC, CD, DA);
    }
  } else if (corners === 5) {
    // Pentagon: triangulate into ABC, ACD, ADE using diagonals AC and AD
    const AB = measurements['AB'] || 0;
    const BC = measurements['BC'] || 0;
    const CD = measurements['CD'] || 0;
    const DE = measurements['DE'] || 0;
    const EA = measurements['EA'] || 0;
    const AC = measurements['AC'] || 0;
    const AD = measurements['AD'] || 0;
    
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
    const AB = measurements['AB'] || 0;
    const BC = measurements['BC'] || 0;
    const CD = measurements['CD'] || 0;
    const DE = measurements['DE'] || 0;
    const EF = measurements['EF'] || 0;
    const FA = measurements['FA'] || 0;
    const AC = measurements['AC'] || 0;
    const AD = measurements['AD'] || 0;
    const AE = measurements['AE'] || 0;
    
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
  }
  
  // Convert from mm² to m²
  return totalAreaMm2 / 1000000;
}
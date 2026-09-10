export interface ImperialParseResult {
  isValid: boolean;
  totalInches: number;
  feet?: number;
  inches?: number;
  originalInput: string;
  displayFormat?: string;
  errorMessage?: string;
}

/**
 * Parses various imperial measurement formats and converts to total inches
 * Supports formats like: 5'6", 5 feet 6 inches, 5ft 6in, 66", etc.
 */
export function parseImperialMeasurement(input: string): ImperialParseResult {
  if (!input || typeof input !== 'string') {
    return {
      isValid: false,
      totalInches: 0,
      originalInput: input || '',
      errorMessage: 'Please enter a measurement'
    };
  }

  const trimmedInput = input.trim().toLowerCase();

  if (!trimmedInput) {
    return {
      isValid: false,
      totalInches: 0,
      originalInput: input,
      errorMessage: 'Please enter a measurement'
    };
  }

  // Pattern 1: Feet and inches with symbols: 5'6", 5' 6", 5'6"
  const feetInchesSymbolPattern = /^(\d+(?:\.\d+)?)\s*['′]\s*(\d+(?:\.\d+)?)\s*["″]?$/;
  const matchSymbols = trimmedInput.match(feetInchesSymbolPattern);
  if (matchSymbols) {
    const feet = parseFloat(matchSymbols[1]);
    const inches = parseFloat(matchSymbols[2]);

    if (isNaN(feet) || isNaN(inches) || feet < 0 || inches < 0 || inches >= 12) {
      return {
        isValid: false,
        totalInches: 0,
        originalInput: input,
        errorMessage: 'Invalid measurement. Inches must be between 0-11.'
      };
    }

    const totalInches = (feet * 12) + inches;
    return {
      isValid: true,
      totalInches,
      feet,
      inches,
      originalInput: input,
      displayFormat: `${feet}' ${inches}"`
    };
  }

  // Pattern 2: Feet only with symbols: 5', 5 '
  const feetOnlySymbolPattern = /^(\d+(?:\.\d+)?)\s*['′]\s*$/;
  const matchFeetSymbol = trimmedInput.match(feetOnlySymbolPattern);
  if (matchFeetSymbol) {
    const feet = parseFloat(matchFeetSymbol[1]);

    if (isNaN(feet) || feet < 0) {
      return {
        isValid: false,
        totalInches: 0,
        originalInput: input,
        errorMessage: 'Invalid measurement'
      };
    }

    const totalInches = feet * 12;
    return {
      isValid: true,
      totalInches,
      feet,
      inches: 0,
      originalInput: input,
      displayFormat: `${feet}'`
    };
  }

  // Pattern 3: Inches only with symbols: 66", 66 "
  const inchesOnlySymbolPattern = /^(\d+(?:\.\d+)?)\s*["″]\s*$/;
  const matchInchesSymbol = trimmedInput.match(inchesOnlySymbolPattern);
  if (matchInchesSymbol) {
    const inches = parseFloat(matchInchesSymbol[1]);

    if (isNaN(inches) || inches < 0) {
      return {
        isValid: false,
        totalInches: 0,
        originalInput: input,
        errorMessage: 'Invalid measurement'
      };
    }

    return {
      isValid: true,
      totalInches: inches,
      originalInput: input,
      displayFormat: `${inches}"`
    };
  }

  // Pattern 4: Feet and inches with words: "5 feet 6 inches", "5ft 6in", "5 ft 6 in"
  const feetInchesWordPattern = /^(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\.?\s+(\d+(?:\.\d+)?)\s*(?:inches?|in)\.?\s*$/;
  const matchWords = trimmedInput.match(feetInchesWordPattern);
  if (matchWords) {
    const feet = parseFloat(matchWords[1]);
    const inches = parseFloat(matchWords[2]);

    if (isNaN(feet) || isNaN(inches) || feet < 0 || inches < 0 || inches >= 12) {
      return {
        isValid: false,
        totalInches: 0,
        originalInput: input,
        errorMessage: 'Invalid measurement. Inches must be between 0-11.'
      };
    }

    const totalInches = (feet * 12) + inches;
    return {
      isValid: true,
      totalInches,
      feet,
      inches,
      originalInput: input,
      displayFormat: `${feet}' ${inches}"`
    };
  }

  // Pattern 5: Feet only with words: "5 feet", "5ft", "5 ft"
  const feetOnlyWordPattern = /^(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\.?\s*$/;
  const matchFeetWord = trimmedInput.match(feetOnlyWordPattern);
  if (matchFeetWord) {
    const feet = parseFloat(matchFeetWord[1]);

    if (isNaN(feet) || feet < 0) {
      return {
        isValid: false,
        totalInches: 0,
        originalInput: input,
        errorMessage: 'Invalid measurement'
      };
    }

    const totalInches = feet * 12;
    return {
      isValid: true,
      totalInches,
      feet,
      inches: 0,
      originalInput: input,
      displayFormat: `${feet}'`
    };
  }

  // Pattern 6: Inches only with words: "66 inches", "66in", "66 in"
  const inchesOnlyWordPattern = /^(\d+(?:\.\d+)?)\s*(?:inches?|in)\.?\s*$/;
  const matchInchesWord = trimmedInput.match(inchesOnlyWordPattern);
  if (matchInchesWord) {
    const inches = parseFloat(matchInchesWord[1]);

    if (isNaN(inches) || inches < 0) {
      return {
        isValid: false,
        totalInches: 0,
        originalInput: input,
        errorMessage: 'Invalid measurement'
      };
    }

    return {
      isValid: true,
      totalInches: inches,
      originalInput: input,
      displayFormat: `${inches}"`
    };
  }

  // Pattern 7: Mixed formats: "5 feet 6"", "5' 6 inches"
  const mixedPattern1 = /^(\d+(?:\.\d+)?)\s*(?:feet|foot|ft)\.?\s+(\d+(?:\.\d+)?)\s*["″]\s*$/;
  const matchMixed1 = trimmedInput.match(mixedPattern1);
  if (matchMixed1) {
    const feet = parseFloat(matchMixed1[1]);
    const inches = parseFloat(matchMixed1[2]);

    if (isNaN(feet) || isNaN(inches) || feet < 0 || inches < 0 || inches >= 12) {
      return {
        isValid: false,
        totalInches: 0,
        originalInput: input,
        errorMessage: 'Invalid measurement. Inches must be between 0-11.'
      };
    }

    const totalInches = (feet * 12) + inches;
    return {
      isValid: true,
      totalInches,
      feet,
      inches,
      originalInput: input,
      displayFormat: `${feet}' ${inches}"`
    };
  }

  const mixedPattern2 = /^(\d+(?:\.\d+)?)\s*['′]\s*(\d+(?:\.\d+)?)\s*(?:inches?|in)\.?\s*$/;
  const matchMixed2 = trimmedInput.match(mixedPattern2);
  if (matchMixed2) {
    const feet = parseFloat(matchMixed2[1]);
    const inches = parseFloat(matchMixed2[2]);

    if (isNaN(feet) || isNaN(inches) || feet < 0 || inches < 0 || inches >= 12) {
      return {
        isValid: false,
        totalInches: 0,
        originalInput: input,
        errorMessage: 'Invalid measurement. Inches must be between 0-11.'
      };
    }

    const totalInches = (feet * 12) + inches;
    return {
      isValid: true,
      totalInches,
      feet,
      inches,
      originalInput: input,
      displayFormat: `${feet}' ${inches}"`
    };
  }

  // Pattern 8: Plain number (assume inches for backward compatibility)
  const plainNumberPattern = /^(\d+(?:\.\d+)?)\s*$/;
  const matchPlainNumber = trimmedInput.match(plainNumberPattern);
  if (matchPlainNumber) {
    const inches = parseFloat(matchPlainNumber[1]);

    if (isNaN(inches) || inches < 0) {
      return {
        isValid: false,
        totalInches: 0,
        originalInput: input,
        errorMessage: 'Invalid measurement'
      };
    }

    return {
      isValid: true,
      totalInches: inches,
      originalInput: input,
      displayFormat: `${inches}"`
    };
  }

  // No pattern matched
  return {
    isValid: false,
    totalInches: 0,
    originalInput: input,
    errorMessage: 'Invalid format. Try: 5\'6", 5 feet 6 inches, or 66"'
  };
}

/**
 * Converts inches to feet and inches display format
 */
export function inchesToFeetInches(totalInches: number): { feet: number; inches: number; display: string } {
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round((totalInches % 12) * 100) / 100;

  if (feet === 0) {
    return { feet: 0, inches, display: `${inches}"` };
  }

  if (inches === 0) {
    return { feet, inches: 0, display: `${feet}'` };
  }

  return { feet, inches, display: `${feet}' ${inches}"` };
}

/**
 * Validates if a measurement is within reasonable bounds
 */
function validateMeasurementRange(totalInches: number, min: number = 0, max: number = 600): boolean {
  return totalInches >= min && totalInches <= max;
}

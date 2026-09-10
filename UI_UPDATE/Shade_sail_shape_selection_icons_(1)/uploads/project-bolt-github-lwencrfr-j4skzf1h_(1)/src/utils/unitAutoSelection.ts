type MeasurementUnit = 'metric' | 'imperial';

interface CurrencyUnitMapping {
  unit: MeasurementUnit;
  confidence: 'high' | 'medium' | 'low';
  displayName: string;
}

const CURRENCY_TO_UNIT_MAP: { [key: string]: CurrencyUnitMapping } = {
  NZD: { unit: 'metric', confidence: 'high', displayName: 'New Zealand' },
  AUD: { unit: 'metric', confidence: 'high', displayName: 'Australia' },
  EUR: { unit: 'metric', confidence: 'high', displayName: 'Europe' },
  AED: { unit: 'metric', confidence: 'high', displayName: 'UAE' },
  USD: { unit: 'imperial', confidence: 'high', displayName: 'United States' },
  GBP: { unit: 'metric', confidence: 'medium', displayName: 'United Kingdom' },
  CAD: { unit: 'metric', confidence: 'medium', displayName: 'Canada' }
};

const UNIT_PREFERENCE_KEY = 'shadespace_unit_preference';
const UNIT_OVERRIDE_KEY = 'shadespace_unit_override';

interface UnitPreference {
  unit: MeasurementUnit;
  currency: string;
  timestamp: number;
  isOverride: boolean;
}

function getStoredUnitPreference(): UnitPreference | null {
  try {
    const stored = localStorage.getItem(UNIT_PREFERENCE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (error) {
    console.error('Error reading unit preference from localStorage:', error);
  }
  return null;
}

export function setStoredUnitPreference(
  unit: MeasurementUnit,
  currency: string,
  isOverride: boolean = false
): void {
  try {
    const preference: UnitPreference = {
      unit,
      currency,
      timestamp: Date.now(),
      isOverride
    };
    localStorage.setItem(UNIT_PREFERENCE_KEY, JSON.stringify(preference));
  } catch (error) {
    console.error('Error storing unit preference to localStorage:', error);
  }
}

function clearStoredUnitPreference(): void {
  try {
    localStorage.removeItem(UNIT_PREFERENCE_KEY);
  } catch (error) {
    console.error('Error clearing unit preference from localStorage:', error);
  }
}

export function determineUnit(
  currency: string,
  savedQuoteUnit?: MeasurementUnit,
  hasMeasurements: boolean = false
): {
  unit: MeasurementUnit;
  source: 'saved_quote' | 'user_preference' | 'currency_mapping' | 'default';
  autoSelected: boolean;
  confidence: 'high' | 'medium' | 'low';
} {
  if (savedQuoteUnit) {
    return {
      unit: savedQuoteUnit,
      source: 'saved_quote',
      autoSelected: false,
      confidence: 'high'
    };
  }

  const storedPreference = getStoredUnitPreference();

  if (storedPreference && storedPreference.currency === currency && !hasMeasurements) {
    return {
      unit: storedPreference.unit,
      source: 'user_preference',
      autoSelected: !storedPreference.isOverride,
      confidence: 'high'
    };
  }

  const mapping = CURRENCY_TO_UNIT_MAP[currency];
  if (mapping) {
    return {
      unit: mapping.unit,
      source: 'currency_mapping',
      autoSelected: true,
      confidence: mapping.confidence
    };
  }

  return {
    unit: 'metric',
    source: 'default',
    autoSelected: true,
    confidence: 'low'
  };
}

function shouldShowProminentToggle(
  confidence: 'high' | 'medium' | 'low',
  currency: string
): boolean {
  return confidence === 'medium' || confidence === 'low';
}

function getUnitDisplayMessage(
  unit: MeasurementUnit,
  currency: string,
  source: 'saved_quote' | 'user_preference' | 'currency_mapping' | 'default'
): string {
  const mapping = CURRENCY_TO_UNIT_MAP[currency];
  const unitName = unit === 'metric' ? 'Metric (mm/m)' : 'Imperial (in/ft)';

  switch (source) {
    case 'saved_quote':
      return `Using ${unitName} from saved quote`;
    case 'user_preference':
      return `Using your preferred ${unitName}`;
    case 'currency_mapping':
      if (mapping) {
        return `Using ${unitName} for ${mapping.displayName}`;
      }
      return `Using ${unitName}`;
    case 'default':
      return `Using ${unitName} (default)`;
    default:
      return `Using ${unitName}`;
  }
}

export function getAlternativeUnit(currentUnit: MeasurementUnit): MeasurementUnit {
  return currentUnit === 'metric' ? 'imperial' : 'metric';
}

export function getAlternativeUnitName(currentUnit: MeasurementUnit): string {
  return currentUnit === 'metric' ? 'Imperial (in/ft)' : 'Metric (mm/m)';
}

function trackUnitChange(
  fromUnit: MeasurementUnit,
  toUnit: MeasurementUnit,
  currency: string,
  wasAutoSelected: boolean
): void {
  const changeData = {
    from_unit: fromUnit,
    to_unit: toUnit,
    currency: currency,
    was_auto_selected: wasAutoSelected,
    timestamp: new Date().toISOString()
  };

  console.log('Unit change tracked:', changeData);
}

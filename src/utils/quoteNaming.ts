import { ConfiguratorState, ShadeCalculations } from '../types';
import { FABRICS } from '../data/fabrics';

export const MAX_QUOTE_NAME_LENGTH = 100;
export const MAX_REFERENCE_LENGTH = 50;

export function generateDefaultQuoteName(
  config: ConfiguratorState,
  calculations?: ShadeCalculations
): string {
  const corners = config.corners || 3;
  const fabricType = config.fabricType;
  const fabricColor = config.fabricColor;

  const selectedFabric = FABRICS.find(f => f.id === fabricType);
  const fabricLabel = selectedFabric?.label || 'Custom';

  const now = new Date();
  const month = now.toLocaleDateString('en-US', { month: 'short' });
  const day = now.getDate();
  const currentYear = now.getFullYear();

  let dateStr = `${month} ${day}`;

  let quoteName = `${corners}-Corner ${fabricLabel}`;

  if (fabricColor) {
    quoteName += ` ${fabricColor}`;
  }

  quoteName += ` Shade Sail - ${dateStr}`;

  if (quoteName.length > MAX_QUOTE_NAME_LENGTH) {
    quoteName = quoteName.substring(0, MAX_QUOTE_NAME_LENGTH - 3) + '...';
  }

  return quoteName;
}

export function sanitizeQuoteName(name: string): string {
  if (!name) return '';

  let sanitized = name.trim();

  if (sanitized.length > MAX_QUOTE_NAME_LENGTH) {
    sanitized = sanitized.substring(0, MAX_QUOTE_NAME_LENGTH);
  }

  return sanitized;
}

export function sanitizeCustomerReference(reference: string): string {
  if (!reference) return '';

  let sanitized = reference.trim();

  if (sanitized.length > MAX_REFERENCE_LENGTH) {
    sanitized = sanitized.substring(0, MAX_REFERENCE_LENGTH);
  }

  return sanitized;
}

export function sanitizeForFilename(name: string): string {
  if (!name) return '';

  let sanitized = name
    .trim()
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '')
    .replace(/\s+/g, '-')
    .replace(/\.+$/, '')
    .replace(/^\.+/, '')
    .substring(0, 100);

  if (!sanitized) {
    return 'quote';
  }

  return sanitized;
}

export function validateQuoteName(name: string): { valid: boolean; error?: string } {
  if (!name) {
    return { valid: true };
  }

  const trimmedName = name.trim();

  if (trimmedName.length > MAX_QUOTE_NAME_LENGTH) {
    return {
      valid: false,
      error: `Quote name must be ${MAX_QUOTE_NAME_LENGTH} characters or less`
    };
  }

  return { valid: true };
}

export function validateCustomerReference(reference: string): { valid: boolean; error?: string } {
  if (!reference) {
    return { valid: true };
  }

  const trimmedRef = reference.trim();

  if (trimmedRef.length > MAX_REFERENCE_LENGTH) {
    return {
      valid: false,
      error: `Customer reference must be ${MAX_REFERENCE_LENGTH} characters or less`
    };
  }

  return { valid: true };
}

export function getCharacterCount(text: string, maxLength: number): string {
  const length = text?.length || 0;
  return `${length}/${maxLength}`;
}

export function isNearLimit(text: string, maxLength: number, threshold: number = 0.9): boolean {
  const length = text?.length || 0;
  return length >= maxLength * threshold;
}

import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { ArrowRightLeft } from 'lucide-react';
import { parseImperialMeasurement, inchesToFeetInches } from '../../utils/imperialParser';

interface ImperialValue {
  feet?: number;
  inches?: number;
  totalInches?: number;
  format: 'feet-inches' | 'inches-only';
}

interface DualImperialInputProps {
  value: number;
  onChange: (value: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  isSuccess?: boolean;
  error?: string;
  errorKey?: string;
  label?: string;
  secondaryValue?: string;
  unit: 'metric' | 'imperial';
  showConversion?: boolean;
  allowFormatSwitch?: boolean;
}

export const DualImperialInput: React.FC<DualImperialInputProps> = ({
  value,
  onChange,
  onFocus,
  onBlur,
  className,
  isSuccess,
  error,
  errorKey,
  label,
  secondaryValue,
  unit,
  showConversion = true,
  allowFormatSwitch = true
}) => {
  const [displayMode, setDisplayMode] = useState<'feet-inches' | 'inches-only'>('feet-inches');
  const [feetInput, setFeetInput] = useState('');
  const [inchesInput, setInchesInput] = useState('');
  const [totalInchesInput, setTotalInchesInput] = useState('');
  const [inchesError, setInchesError] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);

  // Load saved preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('imperialInputFormat');
    if (savedPreference === 'inches-only' || savedPreference === 'feet-inches') {
      setDisplayMode(savedPreference);
    }
  }, []);

  // Initialize from prop value
  useEffect(() => {
    // Don't overwrite user input while they're typing
    if (isUserTyping) {
      return;
    }

    // Calculate what the current inputs would produce
    const currentFeet = parseFloat(feetInput) || 0;
    const currentInches = parseFloat(inchesInput) || 0;
    const currentTotal = (currentFeet * 12) + currentInches;

    // If the incoming value matches what we already have, don't update
    // This prevents circular updates when user types in the inches field
    if (Math.abs(currentTotal - value) < 0.01 && value > 0) {
      return;
    }

    if (value > 0) {
      if (unit === 'imperial') {
        const conversion = inchesToFeetInches(value);
        if (displayMode === 'feet-inches') {
          setFeetInput(conversion.feet > 0 ? String(conversion.feet) : '');
          setInchesInput(conversion.inches > 0 ? String(Math.round(conversion.inches * 100) / 100) : '');
        } else {
          setTotalInchesInput(String(Math.round(value * 100) / 100));
        }
      } else {
        setTotalInchesInput(Math.round(value).toString());
      }
    } else if (value === 0 && currentTotal === 0) {
      // Only clear if both are actually zero
      setFeetInput('');
      setInchesInput('');
      setTotalInchesInput('');
    }
  }, [value, unit, displayMode, isUserTyping, feetInput, inchesInput]);

  const handleFeetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setIsUserTyping(true);
    setFeetInput(newValue);

    if (newValue === '' && inchesInput === '') {
      onChange(0);
      setTimeout(() => setIsUserTyping(false), 100);
      return;
    }

    const feet = parseFloat(newValue) || 0;
    const inches = parseFloat(inchesInput) || 0;

    if (feet < 0) {
      setTimeout(() => setIsUserTyping(false), 100);
      return;
    }

    const totalInches = (feet * 12) + inches;
    onChange(totalInches);
    setTimeout(() => setIsUserTyping(false), 100);
  };

  const handleInchesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setIsUserTyping(true);
    setInchesInput(newValue);

    const inches = parseFloat(newValue);
    const feet = parseFloat(feetInput) || 0;

    if (newValue !== '' && (isNaN(inches) || inches < 0)) {
      setTimeout(() => setIsUserTyping(false), 100);
      return;
    }

    // Only validate inches range when feet are present
    // This allows users to enter large inch values (like 300) when feet field is empty
    if (feet > 0 && inches >= 12) {
      setInchesError('When using feet, inches must be less than 12');
      setTimeout(() => setIsUserTyping(false), 100);
      return;
    } else {
      setInchesError('');
    }

    if (newValue === '' && feetInput === '') {
      onChange(0);
      setTimeout(() => setIsUserTyping(false), 100);
      return;
    }

    const totalInches = (feet * 12) + (inches || 0);
    onChange(totalInches);
    setTimeout(() => setIsUserTyping(false), 100);
  };

  const handleTotalInchesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setIsUserTyping(true);
    setTotalInchesInput(newValue);

    if (newValue === '') {
      onChange(0);
      setTimeout(() => setIsUserTyping(false), 100);
      return;
    }

    if (unit === 'imperial') {
      const result = parseImperialMeasurement(newValue);
      if (result.isValid) {
        onChange(result.totalInches);

        // Only auto-populate feet+inches fields if mixed units were explicitly entered
        // (e.g., "4 feet 5 inches" or "7'10"", but NOT "200 inches" or "200")
        if (displayMode === 'feet-inches' && result.feet !== undefined && result.inches !== undefined) {
          setFeetInput(String(result.feet));
          setInchesInput(String(result.inches));
        }
      }
      setTimeout(() => setIsUserTyping(false), 100);
    } else {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && numValue >= 0) {
        onChange(numValue);
      }
      setTimeout(() => setIsUserTyping(false), 100);
    }
  };

  const toggleDisplayMode = () => {
    const newMode = displayMode === 'feet-inches' ? 'inches-only' : 'feet-inches';
    setDisplayMode(newMode);
    localStorage.setItem('imperialInputFormat', newMode);

    // Convert current value to new format
    if (value > 0) {
      if (newMode === 'inches-only') {
        setTotalInchesInput(String(Math.round(value * 100) / 100));
      } else {
        const conversion = inchesToFeetInches(value);
        setFeetInput(conversion.feet > 0 ? String(conversion.feet) : '');
        setInchesInput(conversion.inches > 0 ? String(Math.round(conversion.inches * 100) / 100) : '');
      }
    }
  };

  // Metric mode - use simple input
  if (unit === 'metric') {
    return (
      <div className="relative">
        <Input
          type="text"
          value={totalInchesInput}
          onChange={handleTotalInchesChange}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="3000"
          className={className}
          isSuccess={isSuccess}
          error={error}
          errorKey={errorKey}
          label={label}
          secondaryValue={secondaryValue}
        />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="block text-sm font-medium text-[#01312D] mb-1">
          {label}
        </label>
      )}

      <div className="relative">
        {displayMode === 'feet-inches' ? (
          <div className="flex items-start gap-2">
            <div className="flex-1 flex items-center gap-2">
              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={feetInput}
                  onChange={handleFeetChange}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder="10 (optional)"
                  className={`${className} ${isSuccess ? 'pr-16' : 'pr-12'}`}
                  isSuccess={isSuccess}
                  error={error}
                  errorKey={errorKey}
                />
                <span className={`absolute ${isSuccess ? 'right-10' : 'right-3'} top-1/2 -translate-y-1/2 text-xs text-[#01312D]/60 font-medium pointer-events-none`}>
                  ft
                </span>
              </div>

              <div className="flex-1 relative">
                <Input
                  type="text"
                  value={inchesInput}
                  onChange={handleInchesChange}
                  onFocus={onFocus}
                  onBlur={onBlur}
                  placeholder={feetInput ? "6" : "300 (or any value)"}
                  className={`${className} ${(isSuccess && !inchesError) ? 'pr-16' : 'pr-12'}`}
                  isSuccess={isSuccess && !inchesError}
                  error={inchesError}
                />
                <span className={`absolute ${(isSuccess && !inchesError) ? 'right-10' : 'right-3'} top-1/2 -translate-y-1/2 text-xs text-[#01312D]/60 font-medium pointer-events-none`}>
                  in
                </span>
              </div>
            </div>

            {allowFormatSwitch && (
              <button
                type="button"
                onClick={toggleDisplayMode}
                className="mt-2 p-2 text-[#01312D]/60 hover:text-[#01312D] hover:bg-slate-100 rounded transition-colors"
                title="Switch to inches only"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={totalInchesInput}
                onChange={handleTotalInchesChange}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="126"
                className={`${className} ${isSuccess ? 'pr-16' : 'pr-12'}`}
                isSuccess={isSuccess}
                error={error}
                errorKey={errorKey}
              />
              <span className={`absolute ${isSuccess ? 'right-10' : 'right-3'} top-1/2 -translate-y-1/2 text-xs text-[#01312D]/60 font-medium pointer-events-none`}>
                in
              </span>
            </div>

            {allowFormatSwitch && (
              <button
                type="button"
                onClick={toggleDisplayMode}
                className="mt-2 p-2 text-[#01312D]/60 hover:text-[#01312D] hover:bg-slate-100 rounded transition-colors"
                title="Switch to feet and inches"
              >
                <ArrowRightLeft className="w-4 h-4" />
              </button>
            )}
          </div>
        )}

        {/* Secondary unit display */}
        {secondaryValue && (
          <div className="text-xs text-[#01312D]/60 mt-1">
            {secondaryValue}
          </div>
        )}
      </div>
    </div>
  );
};

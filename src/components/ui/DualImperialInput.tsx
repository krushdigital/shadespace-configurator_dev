import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { Info, ArrowRightLeft } from 'lucide-react';
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
  const [showQuickInput, setShowQuickInput] = useState(false);

  // Load saved preference from localStorage
  useEffect(() => {
    const savedPreference = localStorage.getItem('imperialInputFormat');
    if (savedPreference === 'inches-only' || savedPreference === 'feet-inches') {
      setDisplayMode(savedPreference);
    }
  }, []);

  // Initialize from prop value
  useEffect(() => {
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
    } else {
      setFeetInput('');
      setInchesInput('');
      setTotalInchesInput('');
    }
  }, [value, unit, displayMode]);

  const handleFeetChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setFeetInput(newValue);

    if (newValue === '' && inchesInput === '') {
      onChange(0);
      return;
    }

    const feet = parseFloat(newValue) || 0;
    const inches = parseFloat(inchesInput) || 0;

    if (feet < 0) {
      return;
    }

    const totalInches = (feet * 12) + inches;
    onChange(totalInches);
  };

  const handleInchesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInchesInput(newValue);

    const inches = parseFloat(newValue);
    const feet = parseFloat(feetInput) || 0;

    if (newValue !== '' && (isNaN(inches) || inches < 0)) {
      return;
    }

    // Validate inches range when feet are present
    if (feet > 0 && inches >= 12) {
      setInchesError('Inches must be less than 12');
      return;
    } else {
      setInchesError('');
    }

    if (newValue === '' && feetInput === '') {
      onChange(0);
      return;
    }

    const totalInches = (feet * 12) + (inches || 0);
    onChange(totalInches);
  };

  const handleTotalInchesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setTotalInchesInput(newValue);

    if (newValue === '') {
      onChange(0);
      return;
    }

    if (unit === 'imperial') {
      const result = parseImperialMeasurement(newValue);
      if (result.isValid) {
        onChange(result.totalInches);

        // Update feet+inches fields if in that mode
        if (displayMode === 'feet-inches' && result.feet !== undefined) {
          setFeetInput(String(result.feet));
          setInchesInput(result.inches ? String(result.inches) : '');
        }
      }
    } else {
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && numValue >= 0) {
        onChange(numValue);
      }
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

  const getConversionText = () => {
    if (!showConversion || value === 0) return '';

    if (displayMode === 'feet-inches' && (feetInput || inchesInput)) {
      return `= ${Math.round(value * 100) / 100}"`;
    } else if (displayMode === 'inches-only' && value > 0) {
      const conversion = inchesToFeetInches(value);
      if (conversion.feet > 0) {
        return `= ${conversion.display}`;
      }
    }
    return '';
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
                  placeholder="10"
                  className={`${className} pr-12`}
                  isSuccess={isSuccess}
                  error={error}
                  errorKey={errorKey}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#01312D]/60 font-medium pointer-events-none">
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
                  placeholder="6"
                  className={`${className} pr-12`}
                  isSuccess={isSuccess && !inchesError}
                  error={inchesError}
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#01312D]/60 font-medium pointer-events-none">
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
                className={`${className} pr-12`}
                isSuccess={isSuccess}
                error={error}
                errorKey={errorKey}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#01312D]/60 font-medium pointer-events-none">
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

        {/* Conversion display */}
        {getConversionText() && (
          <div className="flex items-center gap-1 mt-1 text-xs text-[#01312D]/60">
            <Info className="w-3 h-3" />
            <span>{getConversionText()}</span>
          </div>
        )}

        {/* Secondary unit display */}
        {secondaryValue && (
          <div className="text-xs text-[#01312D]/60 mt-1">
            {secondaryValue}
          </div>
        )}
      </div>

      {/* Quick single-field input option */}
      {displayMode === 'feet-inches' && (
        <div className="mt-2">
          <button
            type="button"
            onClick={() => setShowQuickInput(!showQuickInput)}
            className="text-xs text-blue-600 hover:text-blue-700 underline"
          >
            {showQuickInput ? 'Hide' : 'Or enter as single value'}
          </button>

          {showQuickInput && (
            <div className="mt-2 relative">
              <Input
                type="text"
                value={totalInchesInput}
                onChange={(e) => {
                  handleTotalInchesChange(e);
                  const result = parseImperialMeasurement(e.target.value);
                  if (result.isValid && result.feet !== undefined) {
                    setFeetInput(String(result.feet));
                    setInchesInput(result.inches ? String(result.inches) : '0');
                  }
                }}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="e.g., 10'6&quot; or 126 or 10ft 6in"
                className="text-sm pr-12"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#01312D]/60 pointer-events-none">
                any format
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

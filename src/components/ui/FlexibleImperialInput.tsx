import React, { useState, useEffect } from 'react';
import { Input } from './Input';
import { parseImperialMeasurement, inchesToFeetInches } from '../../utils/imperialParser';

interface FlexibleImperialInputProps {
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
}

export const FlexibleImperialInput: React.FC<FlexibleImperialInputProps> = ({
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
  showConversion = true
}) => {
  const [inputMode, setInputMode] = useState<'combined' | 'single'>('combined');
  const [feetInput, setFeetInput] = useState('');
  const [inchesInput, setInchesInput] = useState('');
  const [singleInput, setSingleInput] = useState('');
  const [isUserTyping, setIsUserTyping] = useState(false);

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
    if (Math.abs(currentTotal - value) < 0.01 && value > 0) {
      return;
    }

    if (value > 0) {
      if (unit === 'imperial') {
        const conversion = inchesToFeetInches(value);

        // Smart default: if value is over 144 inches (12 feet), default to single input
        if (value > 144 && !feetInput && !inchesInput) {
          setInputMode('single');
          setSingleInput(String(Math.round(value * 100) / 100));
        } else if (inputMode === 'combined') {
          // For smaller values or when user is in combined mode, show feet+inches
          setFeetInput(conversion.feet > 0 ? String(conversion.feet) : '');
          setInchesInput(conversion.inches > 0 ? String(Math.round(conversion.inches * 100) / 100) : '');
        } else {
          setSingleInput(String(Math.round(value * 100) / 100));
        }
      } else {
        setSingleInput(Math.round(value).toString());
      }
    } else if (value === 0 && currentTotal === 0) {
      setFeetInput('');
      setInchesInput('');
      setSingleInput('');
    }
  }, [value, unit, isUserTyping, feetInput, inchesInput, inputMode]);

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

    if (newValue === '' && feetInput === '') {
      onChange(0);
      setTimeout(() => setIsUserTyping(false), 100);
      return;
    }

    // Allow any inch value - no restriction to < 12
    // This allows users to enter "300 inches" directly
    const totalInches = (feet * 12) + (inches || 0);
    onChange(totalInches);
    setTimeout(() => setIsUserTyping(false), 100);
  };

  const handleSingleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setIsUserTyping(true);
    setSingleInput(newValue);

    if (newValue === '') {
      onChange(0);
      setTimeout(() => setIsUserTyping(false), 100);
      return;
    }

    if (unit === 'imperial') {
      const result = parseImperialMeasurement(newValue);
      if (result.isValid) {
        onChange(result.totalInches);
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

  const switchMode = (mode: 'combined' | 'single') => {
    setInputMode(mode);

    if (value > 0) {
      if (mode === 'single') {
        setSingleInput(String(Math.round(value * 100) / 100));
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
          value={singleInput}
          onChange={handleSingleInputChange}
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

      {/* Mode Selection Tabs */}
      <div className="flex gap-2 mb-2">
        <button
          type="button"
          onClick={() => switchMode('combined')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            inputMode === 'combined'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Feet + Inches
        </button>
        <button
          type="button"
          onClick={() => switchMode('single')}
          className={`px-3 py-1.5 text-xs font-medium rounded transition-colors ${
            inputMode === 'single'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
          }`}
        >
          Inches Only
        </button>
      </div>

      {/* Input Fields Based on Mode */}
      <div className="relative">
        {inputMode === 'combined' ? (
          <div className="flex items-start gap-2">
            <div className="flex-1 relative">
              <Input
                type="text"
                value={feetInput}
                onChange={handleFeetChange}
                onFocus={onFocus}
                onBlur={onBlur}
                placeholder="10"
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
                placeholder="6"
                className={`${className} ${isSuccess ? 'pr-16' : 'pr-12'}`}
                isSuccess={isSuccess}
              />
              <span className={`absolute ${isSuccess ? 'right-10' : 'right-3'} top-1/2 -translate-y-1/2 text-xs text-[#01312D]/60 font-medium pointer-events-none`}>
                in
              </span>
            </div>
          </div>
        ) : (
          <div className="relative">
            <Input
              type="text"
              value={singleInput}
              onChange={handleSingleInputChange}
              onFocus={onFocus}
              onBlur={onBlur}
              placeholder="126 or 10'6&quot; or 10ft 6in"
              className={`${className} ${isSuccess ? 'pr-16' : 'pr-12'}`}
              isSuccess={isSuccess}
              error={error}
              errorKey={errorKey}
            />
            <span className={`absolute ${isSuccess ? 'right-10' : 'right-3'} top-1/2 -translate-y-1/2 text-xs text-[#01312D]/60 font-medium pointer-events-none`}>
              in
            </span>
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

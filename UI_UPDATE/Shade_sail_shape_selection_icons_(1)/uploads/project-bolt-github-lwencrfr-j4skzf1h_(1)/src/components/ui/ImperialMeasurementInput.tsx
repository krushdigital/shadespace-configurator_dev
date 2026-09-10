import React, { useState, useEffect, forwardRef } from 'react';
import { Input } from './Input';
import { parseImperialMeasurement, inchesToFeetInches } from '../../utils/imperialParser';
import { Info } from 'lucide-react';

interface ImperialMeasurementInputProps {
  value: number;
  onChange: (value: number) => void;
  onFocus?: () => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  isSuccess?: boolean;
  isSuggestedTypo?: boolean;
  error?: string;
  errorKey?: string;
  label?: string;
  secondaryValue?: string;
  unit: 'metric' | 'imperial';
  min?: string;
  step?: string;
  autoComplete?: string;
}

export const ImperialMeasurementInput = forwardRef<HTMLInputElement, ImperialMeasurementInputProps>(({
  value,
  onChange,
  onFocus,
  onBlur,
  placeholder,
  className,
  isSuccess,
  isSuggestedTypo,
  error,
  errorKey,
  label,
  secondaryValue,
  unit,
  min,
  step,
  autoComplete
}, ref) => {
  const [inputValue, setInputValue] = useState('');
  const [showConversionHint, setShowConversionHint] = useState(false);
  const [parsedInfo, setParsedInfo] = useState<string>('');

  // Initialize input value from prop
  useEffect(() => {
    if (value > 0) {
      if (unit === 'imperial') {
        // Show as decimal inches by default
        setInputValue(String(Math.round(value * 100) / 100));
      } else {
        setInputValue(Math.round(value).toString());
      }
    } else {
      setInputValue('');
    }
  }, [value, unit]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);

    if (newValue === '') {
      onChange(0);
      setShowConversionHint(false);
      setParsedInfo('');
      return;
    }

    if (unit === 'imperial') {
      // Try to parse the imperial input
      const result = parseImperialMeasurement(newValue);

      if (result.isValid) {
        onChange(result.totalInches);

        // Show conversion hint if feet were used
        if (result.feet !== undefined && result.feet > 0) {
          const conversion = inchesToFeetInches(result.totalInches);
          setParsedInfo(`${conversion.display} = ${Math.round(result.totalInches * 100) / 100}"`);
          setShowConversionHint(true);
        } else {
          setShowConversionHint(false);
          setParsedInfo('');
        }
      } else {
        // Invalid format, but still update the input display
        // Don't update the value until it's valid
        setShowConversionHint(false);
        setParsedInfo('');
      }
    } else {
      // Metric mode - simple number parsing
      const numValue = parseFloat(newValue);
      if (!isNaN(numValue) && numValue >= 0) {
        onChange(numValue);
      }
      setShowConversionHint(false);
      setParsedInfo('');
    }
  };

  const handleBlur = () => {
    // On blur, clean up the display format
    if (unit === 'imperial' && inputValue && value > 0) {
      const result = parseImperialMeasurement(inputValue);
      if (result.isValid) {
        // Keep the user's preferred format but ensure it's valid
        if (result.displayFormat) {
          setInputValue(result.displayFormat);
        }
      }
    }

    setShowConversionHint(false);
    if (onBlur) onBlur();
  };

  const handleFocus = () => {
    if (onFocus) onFocus();
  };

  return (
    <div className="relative">
      <Input
        ref={ref}
        type="text"
        value={inputValue}
        onChange={handleInputChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={className}
        isSuccess={isSuccess}
        isSuggestedTypo={isSuggestedTypo}
        error={error}
        errorKey={errorKey}
        label={label}
        secondaryValue={secondaryValue}
      />

      {/* Conversion hint tooltip */}
      {showConversionHint && parsedInfo && unit === 'imperial' && (
        <div className="absolute left-0 top-full mt-1 z-10 bg-blue-600 text-white text-xs px-2 py-1 rounded shadow-lg whitespace-nowrap flex items-center gap-1">
          <Info className="w-3 h-3" />
          <span>{parsedInfo}</span>
        </div>
      )}
    </div>
  );
});

ImperialMeasurementInput.displayName = 'ImperialMeasurementInput';

import React from 'react';
import { Check, AlertCircle } from 'lucide-react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  errorKey?: string;
  isSuccess?: boolean;
  isSuggestedTypo?: boolean;
}

export function Input({ label, error, errorKey, isSuccess = false, isSuggestedTypo = false, className = '', ...props }: InputProps) {
  // Prevent scroll wheel from changing number input values
  const handleWheel = (e: React.WheelEvent<HTMLInputElement>) => {
    if (props.type === 'number') {
      e.currentTarget.blur();
    }
  };

  return (
    <div>
      {label && (
        <label className="block text-sm font-medium text-[#01312D] mb-2 flex items-center gap-2">
          {label}
          {isSuccess && (
            <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-500 text-white">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
          )}
          {error && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-red-500">
              <AlertCircle className="w-4 h-4" strokeWidth={2} />
            </span>
          )}
          {isSuggestedTypo && !error && (
            <span className="inline-flex items-center justify-center w-4 h-4 text-amber-500">
              <AlertCircle className="w-4 h-4" strokeWidth={2} />
            </span>
          )}
        </label>
      )}
      <div className="relative">
        <input
          className={`w-full px-4 py-3 border-2 rounded-lg focus:ring-2 transition-all duration-200 text-[#01312D] shadow-sm hover:shadow-md ${
            props.type === 'number' ? 'no-spin-arrows ' : ''
          }${
            error ? 'border-red-500 bg-red-50 focus:ring-red-500 focus:border-red-500' :
            isSuggestedTypo ? 'border-amber-500 bg-amber-50 focus:ring-amber-500 focus:border-amber-500' :
            isSuccess ? 'border-emerald-500 bg-emerald-50/30 focus:ring-emerald-500 focus:border-emerald-500' :
            'border-slate-300 bg-white focus:ring-[#BFF102] focus:border-[#BFF102]'
          } ${className}`}
          {...(error && errorKey ? { 'data-error': errorKey } : {})}
          onWheel={handleWheel}
          {...props}
        />
        {isSuccess && !error && !isSuggestedTypo && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-emerald-500 text-white">
              <Check className="w-3 h-3" strokeWidth={3} />
            </span>
          </div>
        )}
      </div>
      {error && (
        <p className="mt-1 text-sm text-red-600 flex items-center gap-1">
          <AlertCircle className="w-4 h-4 flex-shrink-0" strokeWidth={2} />
          {error}
        </p>
      )}
    </div>
  );
}
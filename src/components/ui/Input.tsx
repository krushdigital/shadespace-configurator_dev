import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps) {
  return (
    <div className="w-full">
      {label && (
        <label className="block text-sm font-medium text-slate-700 mb-1">
          {label}
        </label>
      )}
      <input
        className={`w-full px-3 py-2 border rounded-lg transition-colors ${
          error
            ? 'border-red-500 focus:border-red-600 focus:ring-red-500'
            : 'border-slate-300 focus:border-[#01312D] focus:ring-[#01312D]'
        } focus:outline-none focus:ring-2 focus:ring-opacity-50 ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

import React from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean;
}

export function Input({
  className = '',
  error = false,
  ...props
}: InputProps) {
  const baseStyles = 'w-full px-4 py-2 border rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1';
  const errorStyles = error
    ? 'border-red-500 focus:ring-red-500'
    : 'border-slate-300 focus:ring-[#BFF102] focus:border-[#BFF102]';

  return (
    <input
      className={`${baseStyles} ${errorStyles} ${className}`}
      {...props}
    />
  );
}

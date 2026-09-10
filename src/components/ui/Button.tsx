import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
  fullWidth?: boolean;
}

export function Button({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  fullWidth = false,
  ...props
}: ButtonProps) {
  const baseClasses = fullWidth
    ? 'flex w-full items-center justify-center font-bold rounded-btn transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 disabled:bg-state-disabled disabled:text-white disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none'
    : 'inline-flex items-center justify-center font-bold rounded-btn transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-lime focus-visible:ring-offset-2 disabled:bg-state-disabled disabled:text-white disabled:cursor-not-allowed disabled:shadow-none disabled:transform-none';

  const variantClasses = {
    primary: 'bg-brand-green text-white hover:bg-[#012a26] active:bg-[#001f1c] shadow-sm hover:shadow-md',
    secondary: 'bg-white text-brand-green border-2 border-border-card hover:border-brand-green hover:bg-surface-soft shadow-sm',
    outline: 'border-2 border-border-card text-brand-green bg-white hover:bg-surface-soft hover:border-brand-mid shadow-sm'
  };

  const sizeClasses = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-[16px]',
    lg: 'px-8 py-4 text-[17px]'
  };

  return (
    <button
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

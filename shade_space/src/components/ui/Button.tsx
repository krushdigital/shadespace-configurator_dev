import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({
  variant = 'primary',
  size = 'md',
  className = '',
  children,
  disabled,
  ...props
}: ButtonProps) {
  const baseStyles = 'font-bold rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';

  const variantStyles = {
    primary: 'bg-[#BFF102] text-[#01312D] hover:bg-[#caee41] focus:ring-[#BFF102] disabled:bg-slate-300 disabled:text-slate-500',
    secondary: 'bg-[#307C31] text-white hover:bg-[#01312D] focus:ring-[#307C31] disabled:bg-slate-300 disabled:text-slate-500',
    outline: 'border-2 border-[#307C31] text-[#307C31] hover:bg-[#307C31] hover:text-white focus:ring-[#307C31] disabled:border-slate-300 disabled:text-slate-400'
  };

  const sizeStyles = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

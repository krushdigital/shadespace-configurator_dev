import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export function Button({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}: ButtonProps) {
  const baseClasses = 'inline-flex items-center justify-center font-semibold rounded-lg transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-[#01312D] to-[#307C31] text-white hover:from-[#012a26] hover:to-[#2a6b2b] focus:ring-[#BFF102] shadow-lg hover:shadow-xl transform hover:-translate-y-0.5',
    secondary: 'bg-white text-[#01312D] border-2 border-[#307C31] hover:bg-[#BFF102]/20 hover:border-[#01312D] focus:ring-[#BFF102] shadow-md hover:shadow-lg',
    outline: 'border-2 border-[#307C31] text-[#307C31] bg-white hover:bg-[#307C31] hover:text-white focus:ring-[#BFF102] shadow-md hover:shadow-lg'
  };
  
  const sizeClasses = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base font-medium',
    lg: 'px-8 py-4 text-lg font-semibold'
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
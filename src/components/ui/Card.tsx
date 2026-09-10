import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  selected?: boolean;
}

export function Card({ children, className = '', onClick, selected }: CardProps) {
  const selectedStyles = selected
    ? 'bg-brand-green text-white border-brand-green shadow-md'
    : 'bg-white border-border-card hover:border-brand-mid';

  return (
    <div
      className={`border-2 rounded-card transition-all duration-200 ${selectedStyles} ${onClick ? 'cursor-pointer' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}

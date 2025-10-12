import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = '', onClick }: CardProps) {
  return (
    <div
      className={`bg-white border border-slate-200 rounded-xl shadow-sm hover:shadow-md transition-all duration-300 ${onClick ? 'cursor-pointer hover:border-[#BFF102] hover:shadow-lg transform hover:-translate-y-1' : ''} ${className}`}
      onClick={onClick}
    >
      {children}
    </div>
  );
}
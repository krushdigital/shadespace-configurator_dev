import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-sm p-6 ${className}`}>
      {children}
    </div>
  );
}

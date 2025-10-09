import React, { useState } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);

  return (
    <div className="relative inline-block">
      <div
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onClick={() => setIsVisible(!isVisible)}
      >
        {children}
      </div>
      {isVisible && (
        <div className="absolute z-50 bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-64 bg-white border border-slate-200 rounded-lg shadow-xl p-4">
          <div className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-2">
            <div className="border-8 border-transparent border-t-white"></div>
          </div>
          {content}
        </div>
      )}
    </div>
  );
}

import React, { useState } from 'react';

interface AccordionItemProps {
  trigger: string;
  children: React.ReactNode;
}

export function AccordionItem({ trigger, children }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-t border-slate-200 pt-3 mt-3">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left text-sm font-medium text-[#01312D] hover:text-[#024038] transition-colors flex items-center justify-between"
      >
        <span>{trigger}</span>
        <svg
          className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-3">
          {children}
        </div>
      )}
    </div>
  );
}

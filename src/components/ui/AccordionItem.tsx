import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function AccordionItem({ trigger, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-slate-200 first:border-t-0">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full py-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded px-2"
      >
        <span className="text-sm font-medium text-[#01312D]">{trigger}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#01312D] transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>
      <div
        className={`transition-all duration-200 ease-in-out overflow-hidden ${
          isOpen ? 'max-h-[800px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="px-2 pb-3">
          {children}
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
  onOpenChange?: (isOpen: boolean) => void;
}

export function AccordionItem({ trigger, children, defaultOpen = false, onOpenChange }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onOpenChange) {
      onOpenChange(newState);
    }
  };

  return (
    <div className="mt-1">
      <button
        onClick={handleToggle}
        className={`w-full py-2.5 sm:py-3 flex items-center justify-between text-left rounded-lg px-3 sm:px-4 touch-manipulation transition-all duration-200 border ${
          isOpen
            ? 'bg-slate-50 border-slate-300 shadow-sm'
            : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 active:bg-slate-100 shadow-sm'
        }`}
      >
        <span className="text-sm font-medium text-[#01312D]">{trigger}</span>
        <div className={`flex items-center justify-center w-6 h-6 rounded-full flex-shrink-0 ml-2 transition-colors duration-200 ${
          isOpen ? 'bg-slate-200' : 'bg-slate-100'
        }`}>
          <ChevronDown
            className={`w-3.5 h-3.5 text-[#01312D] transition-transform duration-200 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </div>
      </button>

      <div
        className={`transition-[grid-template-rows,opacity] duration-300 ease-in-out grid ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-1 pb-3 pt-2" ref={contentRef}>
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}

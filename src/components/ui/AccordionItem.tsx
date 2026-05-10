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
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleToggle = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    if (onOpenChange) {
      onOpenChange(newState);
    }
  };

  return (
    <div className="border-t border-slate-200 first:border-t-0">
      <button
        onClick={handleToggle}
        className="w-full py-2 flex items-center justify-between text-left hover:bg-slate-50 transition-colors rounded px-2 touch-manipulation active:bg-slate-100"
      >
        <span className="text-sm font-medium text-[#01312D]">{trigger}</span>
        <ChevronDown
          className={`w-4 h-4 text-[#01312D] transition-transform duration-200 flex-shrink-0 ml-2 ${
            isOpen ? 'transform rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`transition-[grid-template-rows,opacity] duration-300 ease-in-out grid ${
          isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="px-2 pb-3 pt-1" ref={contentRef}>
            {children}
          </div>
          {isMobile && isOpen && (
            <div className="flex justify-center pb-2">
              <div className="animate-bounce text-slate-400">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

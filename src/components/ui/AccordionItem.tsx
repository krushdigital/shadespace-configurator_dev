import React, { useState, useEffect } from 'react';
import { ChevronDown } from 'lucide-react';

interface AccordionItemProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function AccordionItem({ trigger, children, defaultOpen = false }: AccordionItemProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [hasBeenOpened, setHasBeenOpened] = useState(defaultOpen);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;

  const handleToggle = () => {
    if (!isOpen && !hasBeenOpened) {
      setHasBeenOpened(true);
    }
    setIsOpen(!isOpen);
  };

  // Determine the max height based on state and device
  const getMaxHeight = () => {
    if (isOpen) return 'max-h-[800px]';
    if (isMobile && hasBeenOpened && !isOpen) return 'max-h-[70px]';
    return 'max-h-0';
  };

  return (
    <div className="border-t border-slate-200 first:border-t-0">
      <button
        onClick={handleToggle}
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
        className={`transition-all duration-300 ease-in-out overflow-hidden ${
          getMaxHeight()
        } ${
          isOpen ? 'opacity-100' : hasBeenOpened && isMobile ? 'opacity-60' : 'opacity-0'
        }`}
      >
        <div className="px-2 pb-3 relative">
          {children}
          {hasBeenOpened && !isOpen && isMobile && (
            <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white via-white/80 to-transparent pointer-events-none" />
          )}
        </div>
      </div>
    </div>
  );
}

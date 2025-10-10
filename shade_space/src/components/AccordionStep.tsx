import React from 'react';
import { ChevronDown, ChevronRight, Check } from 'lucide-react';

interface AccordionStepProps {
  title: string;
  subtitle: string;
  stepNumber: number;
  isCompleted: boolean;
  isCurrent: boolean;
  isOpen: boolean;
  canOpen: boolean;
  selection?: string;
  onToggle: () => void;
  children: React.ReactNode;
}

export function AccordionStep({
  title,
  subtitle,
  stepNumber,
  isCompleted,
  isCurrent,
  isOpen,
  canOpen,
  selection,
  onToggle,
  children
}: AccordionStepProps) {
  return (
    <div 
      id={`step-${stepNumber}`}
      className={`bg-white border rounded-xl shadow-sm overflow-hidden transition-all duration-300 ${
      isOpen ? 'border-[#BFF102] shadow-xl ring-2 ring-[#BFF102]/20' : 'border-slate-200 hover:border-[#307C31] hover:shadow-md'
    }`}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        disabled={!canOpen}
        className={`w-full ${isOpen ? 'p-6' : 'p-5'} text-left transition-all duration-300 ${
          canOpen ? 'hover:bg-slate-50 cursor-pointer' : 'cursor-not-allowed opacity-60'
        } ${isOpen ? 'bg-gradient-to-r from-[#BFF102]/10 to-white' : ''}`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4 flex-grow">
            {/* Step Number/Check */}
            <div className={`
              flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 shadow-md flex-shrink-0
              ${isCompleted 
                ? 'bg-[#307C31] border-[#307C31] text-white' 
                : isCurrent
                ? 'bg-[#01312D] border-[#01312D] text-white'
                : 'bg-white border-[#307C31] text-[#307C31]'
              }
            `}>
              {isCompleted ? (
                <Check className="w-6 h-6" />
              ) : (
                <span className="text-base font-bold">{stepNumber}</span>
              )}
            </div>
            
            {/* Title and Subtitle */}
            <div className="flex flex-col">
              <h3 className={`text-lg sm:text-xl font-bold transition-all duration-200 ${
                isCurrent || isCompleted ? 'text-[#01312D]' : 'text-[#307C31]'
              }`}>
                {title}
              </h3>
              
              {/* Mobile Selection Display - Below Title */}
              {selection && !isOpen && (
                <div className="sm:hidden mt-1">
                  <div className="text-xs sm:text-sm font-semibold text-[#01312D] bg-[#BFF102]/20 px-2 sm:px-3 py-1 rounded-full inline-block">
                    {selection}
                  </div>
                </div>
              )}
              
              {isOpen && (
                <p className={`text-sm sm:text-base transition-all duration-200 mt-1 ${
                  isCurrent || isCompleted ? 'text-[#01312D]/70' : 'text-[#307C31]/70'
                }`}>
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          
          {/* Selection Display */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Desktop Selection Display - Side by Side */}
            {selection && !isOpen && (
              <div className="text-right hidden sm:block">
                <div className="text-xs sm:text-sm font-semibold text-[#01312D] max-w-32 sm:max-w-48 truncate bg-[#BFF102]/20 px-2 sm:px-3 py-1 rounded-full">
                  {selection}
                </div>
              </div>
            )}
            
            {/* Chevron */}
            {canOpen && (
              <div className="transition-transform duration-200">
                {isOpen ? (
                  <ChevronDown className="w-5 h-5 sm:w-6 sm:h-6 text-[#307C31]" />
                ) : (
                  <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5 text-[#307C31]" />
                )}
              </div>
            )}
          </div>
        </div>
      </button>
      
      {/* Content */}
      <div className={`transition-all duration-300 ease-in-out ${
        isOpen ? 'max-h-none opacity-100' : 'max-h-0 opacity-0'
      } ${isOpen ? 'overflow-visible' : 'overflow-hidden'}`}
      style={{ zIndex: isOpen ? 1000 : 'auto' }}
      >
        <div className="border-t border-slate-200">
          {children}
        </div>
      </div>
    </div>
  );
}
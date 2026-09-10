import React from 'react';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { SaveProgressButton } from './SaveProgressButton';

interface StepNavigationFooterProps {
  onNext?: () => void;
  onPrev?: () => void;
  showBack?: boolean;
  nextLabel?: string;
  nextSubLabel?: string;
  disableNext?: boolean;
  onSaveQuote?: () => void;
  mobileGuidance?: { isHighlighting?: boolean; clearHighlight?: () => void };
  className?: string;
}

export function StepNavigationFooter({
  onNext,
  onPrev,
  showBack = true,
  nextLabel = 'Continue',
  nextSubLabel,
  disableNext = false,
  onSaveQuote,
  mobileGuidance,
  className = '',
}: StepNavigationFooterProps) {
  const handleNext = () => {
    mobileGuidance?.clearHighlight?.();
    onNext?.();
  };

  return (
    <div className={`flex items-center justify-between gap-3 pt-6 mt-6 border-t border-border-card ${className}`}>
      <div className="flex items-center gap-3">
        {showBack && onPrev && (
          <button
            onClick={onPrev}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-[15px] font-semibold text-text-muted hover:text-brand-green rounded-btn transition-colors duration-200 min-h-[44px]"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}
        {onSaveQuote && (
          <SaveProgressButton onSave={onSaveQuote} />
        )}
      </div>

      {onNext && (
        <div className={mobileGuidance?.isHighlighting ? 'energy-border-chase-btn rounded-btn' : ''}>
          <button
            onClick={handleNext}
            disabled={disableNext}
            className="inline-flex items-center gap-2 px-6 py-3 bg-brand-green text-white text-[16px] font-bold rounded-btn hover:bg-[#012a26] active:bg-[#001f1c] disabled:bg-state-disabled disabled:cursor-not-allowed transition-all duration-200 min-h-[44px] shadow-sm hover:shadow-md"
          >
            <span className="flex flex-col items-start">
              <span>{nextLabel}</span>
              {nextSubLabel && (
                <span className="text-xs font-normal text-white/60">{nextSubLabel}</span>
              )}
            </span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}

import React from 'react';
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
  priceDisplay?: string;
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
  priceDisplay,
}: StepNavigationFooterProps) {
  const handleNext = () => {
    mobileGuidance?.clearHighlight?.();
    onNext?.();
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      {/* Back button */}
      {showBack && onPrev && (
        <button
          onClick={onPrev}
          className="inline-flex items-center justify-center px-5 py-3 text-[15px] font-bold text-brand-green border-2 border-brand-green rounded-[14px] hover:bg-brand-green hover:text-white transition-all duration-200 min-h-[44px]"
        >
          Back
        </button>
      )}

      {/* Price in center (mobile only, when right panel not visible) */}
      {priceDisplay && (
        <div className="flex-1 text-center desktop:hidden">
          <div className="text-[11px] font-medium text-text-muted leading-tight">Estimated</div>
          <div className="text-[17px] font-extrabold text-brand-green leading-tight">{priceDisplay}</div>
        </div>
      )}

      {!priceDisplay && <div className="flex-1" />}

      {/* Save */}
      {onSaveQuote && (
        <SaveProgressButton onSave={onSaveQuote} />
      )}

      {/* Continue button */}
      {onNext && (
        <button
          onClick={handleNext}
          disabled={disableNext}
          className="inline-flex items-center justify-center gap-1.5 px-6 py-3 bg-brand-green text-white text-[16px] font-bold rounded-[14px] hover:bg-[#012a26] active:bg-[#001f1c] disabled:bg-state-disabled disabled:cursor-not-allowed transition-all duration-200 min-h-[44px] shadow-sm"
        >
          <span className="flex flex-col items-center leading-tight">
            <span>{nextLabel}</span>
            {nextSubLabel && (
              <span className="text-[11px] font-normal text-white/60">{nextSubLabel}</span>
            )}
          </span>
        </button>
      )}
    </div>
  );
}

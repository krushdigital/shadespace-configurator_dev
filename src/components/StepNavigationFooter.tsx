import React from 'react';

interface StepNavigationFooterProps {
  onNext?: () => void;
  onPrev?: () => void;
  showBack?: boolean;
  nextLabel?: string;
  disableNext?: boolean;
  disabledHint?: string;
  priceDisplay?: string;
  isReview?: boolean;
  className?: string;
}

export function StepNavigationFooter({
  onNext,
  onPrev,
  showBack = true,
  nextLabel = 'Continue',
  disableNext = false,
  disabledHint,
  priceDisplay,
  isReview = false,
  className = '',
}: StepNavigationFooterProps) {
  return (
    <div
      className={`sticky bottom-0 z-30 bg-white border-t border-border-card ${className}`}
      style={{ padding: '14px 24px 18px' }}
    >
      <div className="flex items-center gap-[14px] max-w-content mx-auto">
        {showBack && onPrev ? (
          <button
            onClick={onPrev}
            className="inline-flex items-center justify-center px-[22px] py-[14px] text-[16px] font-bold text-brand-green border-2 border-brand-green rounded-btn hover:bg-brand-green hover:text-white transition-all duration-200 min-h-[44px] flex-shrink-0"
          >
            Back
          </button>
        ) : null}

        {priceDisplay ? (
          <div className="flex-shrink-0">
            <div className="text-[12px] font-bold text-text-muted leading-tight">Estimated</div>
            <div className="text-[22px] font-extrabold text-brand-green leading-tight" style={{ letterSpacing: '-0.02em' }}>{priceDisplay}</div>
          </div>
        ) : null}

        {onNext && !disableNext && (
          <button
            onClick={onNext}
            className="flex-1 inline-flex items-center justify-center px-6 py-[16px] text-white text-[17px] font-bold rounded-btn transition-all duration-200 min-h-[44px] shadow-sm bg-brand-green hover:bg-[#0a4a41] active:bg-[#001f1c]"
          >
            {nextLabel}
          </button>
        )}

        {onNext && disableNext && disabledHint && (
          <div className="flex-1 bg-state-disabled text-white rounded-btn py-[16px] px-4 font-bold text-[16px] text-center">
            {disabledHint}
          </div>
        )}

        {onNext && disableNext && !disabledHint && (
          <button
            disabled
            className="flex-1 inline-flex items-center justify-center px-6 py-[16px] text-white text-[17px] font-bold rounded-btn min-h-[44px] bg-state-disabled cursor-not-allowed"
          >
            {nextLabel}
          </button>
        )}
      </div>
    </div>
  );
}

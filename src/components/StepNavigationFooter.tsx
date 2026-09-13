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
  isMobile?: boolean;
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
  isMobile = false,
  className = '',
}: StepNavigationFooterProps) {
  return (
    <div
      className={`sticky bottom-0 z-30 bg-white border-t border-border-card ${className}`}
      style={{ padding: isMobile ? '10px 16px 14px' : '14px 24px 18px' }}
    >
      <div className="flex flex-col gap-2 max-w-content mx-auto">
        {priceDisplay && isMobile && (
          <div className="flex items-baseline gap-2">
            <span className="text-[12px] font-bold text-text-muted">Estimated</span>
            <span className="text-[20px] font-extrabold text-brand-green leading-tight" style={{ letterSpacing: '-0.02em' }}>{priceDisplay}</span>
          </div>
        )}

        <div className="flex items-center gap-3">
          {showBack && onPrev ? (
            <button
              onClick={onPrev}
              className="inline-flex items-center justify-center px-5 py-3 text-[15px] font-bold text-brand-green border-2 border-brand-green rounded-btn hover:bg-brand-green hover:text-white transition-all duration-200 min-h-[44px] flex-shrink-0"
            >
              Back
            </button>
          ) : null}

          {priceDisplay && !isMobile ? (
            <div className="flex-shrink-0">
              <div className="text-[12px] font-bold text-text-muted leading-tight">Estimated</div>
              <div className="text-[22px] font-extrabold text-brand-green leading-tight" style={{ letterSpacing: '-0.02em' }}>{priceDisplay}</div>
            </div>
          ) : null}

          {onNext && !disableNext && (
            <button
              onClick={onNext}
              className="flex-1 inline-flex items-center justify-center px-4 py-3 text-white text-[16px] font-bold rounded-btn transition-all duration-200 min-h-[44px] shadow-sm bg-brand-green hover:bg-[#0a4a41] active:bg-[#001f1c]"
            >
              {nextLabel}
            </button>
          )}

          {onNext && disableNext && disabledHint && (
            <button
              onClick={onNext}
              className="flex-1 inline-flex items-center justify-center bg-state-disabled text-white rounded-btn py-3 px-4 font-bold text-[15px] text-center min-h-[44px] transition-all duration-200 hover:opacity-90"
            >
              {disabledHint}
            </button>
          )}

          {onNext && disableNext && !disabledHint && (
            <button
              disabled
              className="flex-1 inline-flex items-center justify-center px-4 py-3 text-white text-[16px] font-bold rounded-btn min-h-[44px] bg-state-disabled cursor-not-allowed"
            >
              {nextLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

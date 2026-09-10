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
      <div className="flex items-center gap-3 max-w-content mx-auto">
        {/* Back button */}
        {showBack && onPrev ? (
          <button
            onClick={onPrev}
            className="inline-flex items-center justify-center px-5 py-3 text-[15px] font-bold text-brand-green border-2 border-brand-green rounded-btn hover:bg-brand-green hover:text-white transition-all duration-200 min-h-[44px] flex-shrink-0"
          >
            Back
          </button>
        ) : (
          <div className="w-[72px] flex-shrink-0" />
        )}

        {/* Price display - center */}
        <div className="flex-1 text-center desktop:text-center">
          {priceDisplay ? (
            <>
              <div className="text-[11px] font-medium text-text-muted leading-tight">Estimated</div>
              <div className="text-[17px] font-extrabold text-brand-green leading-tight">{priceDisplay}</div>
            </>
          ) : (
            <div className="text-[12px] text-text-muted">Price appears after sizing</div>
          )}
        </div>

        {/* Continue / Add to cart button */}
        {onNext && (
          <button
            onClick={onNext}
            disabled={disableNext}
            className={`inline-flex items-center justify-center gap-1.5 px-6 py-3 text-white text-[16px] font-bold rounded-btn transition-all duration-200 min-h-[44px] shadow-sm flex-shrink-0 ${
              isReview ? 'flex-1 max-w-[280px]' : ''
            } ${
              disableNext
                ? 'bg-state-disabled cursor-not-allowed'
                : 'bg-brand-green hover:bg-[#012a26] active:bg-[#001f1c]'
            }`}
          >
            <span className="flex flex-col items-center leading-tight">
              <span>{nextLabel}</span>
              {disableNext && disabledHint && (
                <span className="text-[11px] font-normal text-white/60">{disabledHint}</span>
              )}
            </span>
          </button>
        )}
      </div>
    </div>
  );
}

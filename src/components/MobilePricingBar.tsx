import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/currencyFormatter';

interface MobilePricingBarProps {
  totalPrice: number;
  currency: string;
  isVisible: boolean;
  quoteReference?: string;
  onContinue?: () => void;
  onSaveQuote?: () => void;
}

export function MobilePricingBar({
  totalPrice,
  currency,
  isVisible,
  quoteReference,
  onContinue,
  onSaveQuote,
}: MobilePricingBarProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      // Hide when scrolling down, show when scrolling up
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }

      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  if (!isVisible || totalPrice <= 0) return null;

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${
        isHidden ? 'translate-y-full' : 'translate-y-0'
      }`}
    >
      <div className="bg-white border-t-2 border-[#307C31] shadow-2xl">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <div className="text-xs font-medium text-slate-600">
                  {quoteReference ? `Quote ${quoteReference}` : 'Your Quote'}
                </div>
              </div>
              <div className="text-lg font-bold text-[#01312D]">
                {formatCurrency(totalPrice, currency)}
              </div>
              <div className="text-xs text-[#307C31] font-medium">
                Quote Ready
              </div>
            </div>

            <div className="flex items-center gap-2">
              {onSaveQuote && (
                <button
                  onClick={onSaveQuote}
                  className="flex-shrink-0 p-3 bg-white border-2 border-[#307C31] text-[#307C31] rounded-lg hover:bg-[#307C31] hover:text-white transition-all duration-200 shadow-md hover:shadow-lg"
                  aria-label="Save Quote"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                  </svg>
                </button>
              )}

              {onContinue && (
                <button
                  onClick={onContinue}
                  className="flex-shrink-0 px-6 py-3 bg-[#BFF102] text-[#01312D] font-bold rounded-lg hover:bg-[#caee41] transition-all duration-200 shadow-lg hover:shadow-xl whitespace-nowrap"
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

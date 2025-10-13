import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/currencyFormatter';

interface MobilePricingBarProps {
  totalPrice: number;
  currency: string;
  isVisible: boolean;
  quoteReference?: string;
  onContinue?: () => void;
}

export function MobilePricingBar({
  totalPrice,
  currency,
  isVisible,
  quoteReference,
  onContinue,
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
            <div className="flex-1">
              <div className="text-xs font-medium text-slate-600 mb-0.5">
                {quoteReference ? `Quote ${quoteReference}` : 'Your Quote'}
              </div>
              <div className="text-lg font-bold text-[#01312D]">
                {formatCurrency(totalPrice, currency)}
              </div>
              <div className="text-xs text-[#307C31] font-medium">
                Quote Ready
              </div>
            </div>

            {onContinue && (
              <button
                onClick={onContinue}
                className="flex-shrink-0 px-6 py-3 bg-[#BFF102] text-[#01312D] font-bold rounded-lg hover:bg-[#caee41] transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                Continue
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

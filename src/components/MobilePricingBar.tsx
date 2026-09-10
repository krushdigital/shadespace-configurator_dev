import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/currencyFormatter';
import { ArrowLeft, ArrowRight, Bookmark } from 'lucide-react';

interface MobilePricingBarProps {
  totalPrice: number;
  currency: string;
  isVisible: boolean;
  quoteReference?: string;
  onContinue?: () => void;
  onBack?: () => void;
  onSaveQuote?: () => void;
  isLocked?: boolean;
  isNewQuote?: boolean;
  hasInvalidMeasurements?: boolean;
  area?: number;
}

export function MobilePricingBar({
  totalPrice,
  currency,
  isVisible,
  onContinue,
  onBack,
  onSaveQuote,
  isLocked = false,
  isNewQuote = false,
  hasInvalidMeasurements = false,
}: MobilePricingBarProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  useEffect(() => {
    if (isLocked) {
      setIsHidden(false);
      return;
    }

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setIsHidden(true);
      } else {
        setIsHidden(false);
      }
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY, isLocked]);

  if (!isVisible) return null;
  if (totalPrice <= 0 && !hasInvalidMeasurements) return null;

  return (
    <div
      className={`desktop:hidden fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${
        isHidden ? 'translate-y-full' : 'translate-y-0'
      } ${isNewQuote ? 'animate-slideUpBounce' : ''}`}
    >
      <div className="bg-brand-green shadow-2xl">
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            {/* Back button */}
            {onBack ? (
              <button
                onClick={onBack}
                className="flex-shrink-0 p-2.5 text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
            ) : onSaveQuote ? (
              <button
                onClick={onSaveQuote}
                className="flex-shrink-0 p-2.5 text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                aria-label="Save Progress"
              >
                <Bookmark className="w-5 h-5" />
              </button>
            ) : (
              <div className="w-11" />
            )}

            {/* Price center */}
            <div className="flex-1 text-center min-w-0">
              <div className={`text-lg font-extrabold ${hasInvalidMeasurements ? 'text-red-300' : 'text-white'}`}>
                {hasInvalidMeasurements ? 'Error' : formatCurrency(totalPrice, currency)}
              </div>
              <div className={`text-[11px] font-medium ${hasInvalidMeasurements ? 'text-red-300/70' : 'text-white/50'}`}>
                {hasInvalidMeasurements ? 'Invalid measurements' : 'incl. freight, taxes & duties'}
              </div>
            </div>

            {/* Continue button */}
            {onContinue ? (
              <button
                onClick={onContinue}
                className="flex-shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-lime text-brand-green font-bold text-[15px] rounded-btn hover:bg-[#c8f05e] transition-all duration-200 shadow-lg min-h-[44px]"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <div className="w-11" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

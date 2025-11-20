import React, { useState, useEffect } from 'react';
import { formatCurrency } from '../utils/currencyFormatter';
import { formatArea } from '../utils/geometry';
import { Tooltip } from './ui/Tooltip';

interface MobilePricingBarProps {
  totalPrice: number;
  currency: string;
  isVisible: boolean;
  quoteReference?: string;
  onContinue?: () => void;
  onSaveQuote?: () => void;
  isLocked?: boolean;
  isNewQuote?: boolean;
  hasInvalidMeasurements?: boolean;
  area?: number;
  corners?: number;
  allDiagonalsEntered?: boolean;
  unit?: 'metric' | 'imperial';
}

export function MobilePricingBar({
  totalPrice,
  currency,
  isVisible,
  quoteReference,
  onContinue,
  onSaveQuote,
  isLocked = false,
  isNewQuote = false,
  hasInvalidMeasurements = false,
  area = 0,
  corners = 0,
  allDiagonalsEntered = true,
  unit = 'metric',
}: MobilePricingBarProps) {
  const [isHidden, setIsHidden] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);

  // Determine if area should be displayed
  // Show area when:
  // - Shape has less than 4 corners (triangles don't need diagonals), OR
  // - Shape has 4+ corners AND all diagonals are entered AND area is greater than 0
  const shouldShowArea = corners < 4 || (corners >= 4 && allDiagonalsEntered && area > 0);

  useEffect(() => {
    if (isLocked) {
      setIsHidden(false);
      return;
    }

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
  }, [lastScrollY, isLocked]);

  if (!isVisible) return null;

  // Don't show if no price and no error to display
  if (totalPrice <= 0 && !hasInvalidMeasurements) return null;

  return (
    <div
      className={`lg:hidden fixed bottom-0 left-0 right-0 z-30 transition-transform duration-300 ${
        isHidden ? 'translate-y-full' : 'translate-y-0'
      } ${
        isNewQuote ? 'animate-slideUpBounce' : ''
      }`}
    >
      <div className={`bg-white border-t-2 shadow-2xl ${
        isNewQuote ? 'border-[#BFF102] shadow-[#BFF102]/30' : 'border-[#307C31]'
      }`}>
        <div className="px-4 py-3">
          <div className="flex items-center justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <div>
                  <div className="text-xs font-medium text-slate-600 mb-0.5">
                    Order Total
                  </div>
                  <div className={`text-2xl font-bold ${hasInvalidMeasurements ? 'text-red-600' : 'text-[#01312D]'}`}>
                    {hasInvalidMeasurements ? 'Cannot Calculate' : formatCurrency(totalPrice, currency)}
                  </div>
                </div>
                <div className="text-right">
                  {shouldShowArea && (
                    <div className="text-sm text-slate-600 mb-0.5">
                      {formatArea(area * 1000000, unit)}
                    </div>
                  )}
                  {corners > 0 && (
                    <div className="text-sm text-slate-600">
                      {corners} corners
                    </div>
                  )}
                </div>
              </div>
              <div className={`text-xs font-medium ${hasInvalidMeasurements ? 'text-red-600' : 'text-[#307C31]'}`}>
                {hasInvalidMeasurements ? 'Invalid measurements - see error above' : 'Includes express freight, taxes & duties (to your door)'}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-shrink-0">
              {onSaveQuote && (
                <Tooltip
                  content={
                    <div className="text-slate-700">
                      <p className="font-semibold mb-1">Save Your Progress</p>
                      <p>Save your configuration at any point and return later when you're ready to continue.</p>
                    </div>
                  }
                >
                  <button
                    onClick={onSaveQuote}
                    className="flex-shrink-0 p-3 bg-white border-2 border-[#307C31] text-[#307C31] rounded-lg hover:bg-[#307C31] hover:text-white transition-all duration-200 shadow-md hover:shadow-lg"
                    aria-label="Save Progress"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  </button>
                </Tooltip>
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

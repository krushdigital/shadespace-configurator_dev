import React from 'react';
import { ConfiguratorState, ShadeCalculations, Fabric } from '../types';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { FABRICS as FALLBACK_FABRICS } from '../data/fabrics';
import { formatCurrency } from '../utils/currencyFormatter';

// Hardware pack image mapping
const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
  3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
  4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
  5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
  6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
  7: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
  8: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
};

interface PriceSummaryDisplayProps {
  config: ConfiguratorState;
  calculations: ShadeCalculations;
  onSaveQuote?: () => void;
  isMobile?: boolean;
  allAcknowledgmentsChecked?: boolean;
  canAddToCart?: boolean;
  handleAddToCart?: () => void;
  loading?: boolean;
  fabrics?: Fabric[];
  isEmailMode?: boolean;
}

export function PriceSummaryDisplay({
  config,
  calculations,
  onSaveQuote,
  isMobile = false,
  allAcknowledgmentsChecked = false,
  canAddToCart = false,
  handleAddToCart,
  loading = false,
  fabrics,
  isEmailMode = false,
}: PriceSummaryDisplayProps) {
  const FABRICS = fabrics && fabrics.length > 0 ? fabrics : FALLBACK_FABRICS;
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);

  return (
    <div className={`bg-white border border-slate-200 rounded-xl shadow-lg p-6 ${
      isMobile ? 'lg:bg-white bg-gradient-to-br from-[#307C31]/5 to-[#BFF102]/5' : ''
    }`}>
      {calculations.totalPrice > 0 ? (
        <>
          <div className={`mb-6 ${
            isMobile ? 'bg-[#01312D] -mx-6 -mt-6 px-6 pt-6 pb-5 rounded-t-xl' : ''
          }`}>
            <h3 className={`text-xl font-bold mb-3 ${
              isMobile ? 'text-white' : 'text-[#01312D]'
            }`}>
              All-Inclusive Price to Your Door
            </h3>
            <div className={`text-4xl font-extrabold mb-3 whitespace-nowrap ${
              isMobile ? 'text-white' : 'text-[#01312D]'
            }`}>
              {formatCurrency(calculations.totalPrice, config.currency)}
            </div>
            <div className="space-y-1">
              <p className={`text-sm font-semibold ${
                isMobile ? 'text-[#BFF102]' : 'text-[#307C31] font-medium'
              }`}>
                <a
                  href="https://shadespace.com/pages/shipping"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={isMobile ? 'text-[#BFF102] hover:underline' : 'text-[#307C31] hover:underline'}
                >
                  ✓ Express freight to your door included
                </a>
              </p>
              <p className={`text-sm font-semibold ${
                isMobile ? 'text-[#BFF102]' : 'text-[#307C31] font-medium'
              }`}>
                <a
                  href="https://shadespace.com/pages/shipping"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={isMobile ? 'text-[#BFF102] hover:underline' : 'text-[#307C31] hover:underline'}
                >
                  ✓ All taxes & duties included
                </a>
              </p>
              <p className={`text-sm font-semibold ${
                isMobile ? 'text-[#BFF102]' : 'text-[#307C31] font-medium'
              }`}>
                <a
                  href="https://shadespace.com/pages/shipping"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={isMobile ? 'text-[#BFF102] hover:underline' : 'text-[#307C31] hover:underline'}
                >
                  ✓ No hidden costs or tariffs
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#01312D]/60">Tensioning hardware & fittings:</span>
                {config.measurementOption === 'adjust' ? (
                  <span className="text-[#01312D] font-semibold flex items-center gap-1">
                    <Tooltip
                      content={
                        <div>
                          <h4 className="font-bold text-slate-900 mb-2">Tensioning Hardware Pack Included</h4>
                          {config.corners > 0 && HARDWARE_PACK_IMAGES[config.corners] && (
                            <img 
                              src={HARDWARE_PACK_IMAGES[config.corners]} 
                              alt={`${config.corners} Corner Hardware Pack`}
                              className="w-full h-auto object-cover rounded-lg mb-3"
                            />
                          )}
                          <p className="text-sm text-slate-600 mb-3">
                            Included stainless steel hardware kit included with your sail.
                          </p>
                          <div className="bg-[#BFF102]/10 border border-[#BFF102] rounded-lg p-3">
                            <a 
                              href="https://shadespace.com/pages/hardware" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 bg-[#BFF102] text-[#01312D] text-xs font-bold rounded-full shadow-sm hover:bg-[#caee41] transition-colors"
                            >
                              More information about hardware
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </a>
                          </div>
                        </div>
                      }
                    >
                      <span className="cursor-help">Included</span>
                    </Tooltip>
                  </span>
                ) : (
                  <span className="text-[#01312D] font-semibold">
                    Not included
                  </span>
                )}
              </div>
            </div>

            {!isMobile && (
              <div className="bg-gradient-to-r from-[#BFF102]/20 to-[#307C31]/10 border border-[#BFF102] rounded-lg p-4 mt-6">
                <div className="text-sm font-bold text-[#01312D] mb-2">
                  Premium Quality Guarantee
                </div>
                <ul className="text-xs text-[#01312D]/80 space-y-1">
                  <li>
                    ✓ <a
                      href="https://shadespace.com/pages/warranty"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[#01312D]/80 hover:underline"
                    >
                      {selectedFabric?.warrantyYears || 10}-year Fabric & Workmanship Warranty
                    </a>
                  </li>
                  <li>✓ Weather-resistant materials</li>
                  <li>✓ Professional installation guide</li>
                </ul>
              </div>
            )}
          </div>

          {/* Quote Actions - Desktop Only */}
          {onSaveQuote && (
            <div className="mt-5 pt-5 border-t border-slate-200">
              <Tooltip
                content={
                  <div className="text-slate-700">
                    <p className="font-semibold mb-1">
                      {isEmailMode ? 'Save & Email PDF Quote' : 'Save Your Progress'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {isEmailMode
                        ? 'Save your configuration and receive a detailed PDF quote with pricing via email.'
                        : 'Save your configuration and return anytime within 30 days to continue.'}
                    </p>
                  </div>
                }
                fullWidth
              >
                <Button
                  variant="outline"
                  onClick={onSaveQuote}
                  fullWidth
                  className="flex items-center justify-center gap-2 border-2 !bg-gradient-to-r !from-[#d4f763] !to-[#BFF102] hover:!from-[#BFF102] hover:!to-[#a8d902] !text-[#01312D] hover:!text-[#01312D] !border-[#BFF102] hover:!border-[#a8d902] transition-colors font-semibold"
                >
                  {isEmailMode ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                  )}
                  <span>{isEmailMode ? 'Save & Email Quote' : 'Save Progress'}</span>
                </Button>
              </Tooltip>
              <p className="text-xs text-center text-slate-500 mt-2">
                {isEmailMode ? 'Your price is locked for 30 days' : 'Return anytime to continue where you left off'}
              </p>

              {/* Add to Cart button - Show when all acknowledgments are checked */}
              {allAcknowledgmentsChecked && handleAddToCart && (
                <div className="mt-4">
                  <Button
                    onClick={() => handleAddToCart()}
                    fullWidth
                    disabled={loading || !canAddToCart}
                    className={`flex items-center justify-center gap-2 !bg-[#01312D] hover:!bg-[#024f3a] !text-white font-bold ${
                      allAcknowledgmentsChecked && !loading ? 'pulsate-cta' : ''
                    }`}
                  >
                    {loading ? (
                      'ADDING TO CART...'
                    ) : (
                      <>
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                        <span>Add to Cart - {formatCurrency(calculations.totalPrice, config.currency)}</span>
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-8">
          <h3 className="text-xl font-bold text-[#01312D] mb-3">
            Your Shade Sail Price
          </h3>
          <p className="text-sm text-[#01312D]/60">
            Complete configuration to see pricing
          </p>
        </div>
      )}
    </div>
  );
}
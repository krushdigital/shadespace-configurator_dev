import React from 'react';
import { ConfiguratorState, ShadeCalculations } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Tooltip } from './ui/Tooltip';
import { FABRICS } from '../data/fabrics';
import { formatCurrency } from '../utils/currencyFormatter';

// Hardware pack image mapping
const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
  3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
  4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
  5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
  6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
};

interface PriceSummaryDisplayProps {
  config: ConfiguratorState;
  calculations: ShadeCalculations;
  onSaveQuote?: () => void;
  onGeneratePDF?: () => void;
  isGeneratingPDF?: boolean;
  showEmailInput?: boolean;
  email?: string;
  setEmail?: (email: string) => void;
  onEmailSummary?: () => void;
  onCancelEmailInput?: () => void;
}

export function PriceSummaryDisplay({
  config,
  calculations,
  onSaveQuote,
  onGeneratePDF,
  isGeneratingPDF = false,
  showEmailInput = false,
  email = '',
  setEmail,
  onEmailSummary,
  onCancelEmailInput,
}: PriceSummaryDisplayProps) {
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);

  return (
    <div className="bg-white border border-slate-200 rounded-xl shadow-lg p-6">
      {calculations.totalPrice > 0 ? (
        <>
          <div className="mb-6">
            <h3 className="text-xl font-bold text-[#01312D] mb-3">
              Your Shade Sail Price
            </h3>
            <div className="text-3xl font-bold text-[#01312D] mb-2 whitespace-nowrap">
              {formatCurrency(calculations.totalPrice, config.currency)}
            </div>
            <div className="space-y-1">
              <p className="text-sm text-[#307C31] font-medium">
                <a
                  href="https://shadespace.com/pages/shipping"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#307C31] hover:underline"
                >
                  ✓ Free worldwide shipping included
                </a>
              </p>
              <p className="text-sm text-[#307C31] font-medium">
                <a
                  href="https://shadespace.com/pages/shipping"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#307C31] hover:underline"
                >
                  ✓ No hidden costs, taxes or duties
                </a>
              </p>
            </div>
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-4">
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-[#01312D]/60">Hardware & fittings:</span>
                {config.measurementOption === 'adjust' ? (
                  <span className="text-[#01312D] font-semibold flex items-center gap-1">
                    <Tooltip
                      content={
                        <div>
                          <h4 className="font-bold text-slate-900 mb-2">Hardware Pack Included</h4>
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
          </div>

          {/* Quote Actions - Desktop Only */}
          {onSaveQuote && (
            <div className="space-y-3 mt-6 pt-6 border-t border-slate-200">
              <Button
                variant="outline"
                size="sm"
                onClick={onSaveQuote}
                className="w-full flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                </svg>
                Save Quote
              </Button>

              {onGeneratePDF && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onGeneratePDF}
                  disabled={isGeneratingPDF}
                  className="w-full"
                >
                  {isGeneratingPDF ? 'Generating...' : 'Download PDF Quote'}
                </Button>
              )}

              {onEmailSummary && !showEmailInput && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={onEmailSummary}
                  className="w-full"
                >
                  Email Summary
                </Button>
              )}

              {showEmailInput && setEmail && onEmailSummary && onCancelEmailInput && (
                <div className="space-y-2">
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email address"
                    className="w-full"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={onEmailSummary}
                      className="w-full"
                    >
                      Send
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={onCancelEmailInput}
                      className="w-full"
                    >
                      Cancel
                    </Button>
                  </div>
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
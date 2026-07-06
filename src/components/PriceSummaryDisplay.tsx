import React, { useMemo } from 'react';
import { Info, Package } from 'lucide-react';
import { ConfiguratorState, ShadeCalculations, Fabric } from '../types';
import { Button } from './ui/Button';
import { Tooltip } from './ui/Tooltip';
import { FABRICS as FALLBACK_FABRICS } from '../data/fabrics';
import { formatCurrency } from '../utils/currencyFormatter';
import { useHardwareCatalog, getDefaultPack } from '../hooks/useHardwareCatalog';

function stripHardwareSize(name: string): string {
  return name.replace(/\s+SS\s+316-\d+mm$/i, '').replace(/\s+-\s*\d+mm$/i, '');
}

const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
  3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
  4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
  5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
  6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
  7: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/7_Corner_Hardware_kit_3.png?v=1779146929',
  8: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/8_Corner_Hardware_kit_2.png?v=1779138488',
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
  adminMode?: boolean;
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
  adminMode = false,
}: PriceSummaryDisplayProps) {
  const FABRICS = fabrics && fabrics.length > 0 ? fabrics : FALLBACK_FABRICS;
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);

  const { items: hardwareItems, packs: hardwarePacks } = useHardwareCatalog();
  const hardwareItemsById = useMemo(() => {
    const m = new Map<string, typeof hardwareItems[number]>();
    for (const it of hardwareItems) m.set(it.id, it);
    return m;
  }, [hardwareItems]);
  const hardwareEdgeType = (config.edgeType as 'webbing' | 'cabled') || 'webbing';
  const hardwarePack = getDefaultPack(hardwarePacks, hardwareEdgeType, config.corners);
  const packLines = hardwarePack
    ? hardwarePack.items
        .map(p => ({ item: hardwareItemsById.get(p.catalog_id), qty: p.qty }))
        .filter((row): row is { item: typeof hardwareItems[number]; qty: number } => !!row.item)
    : [];
  const packImage = HARDWARE_PACK_IMAGES[config.corners];

  const hardwareMode =
    config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none');
  const hardwareOnlyDisplay = calculations.hardwareBreakdown?.hardwareOnlyLivePrice
    ?? (calculations.hardwareBreakdown?.hardwareOnlyPriceNzd || 0);
  const sailOnlyDisplay = hardwareMode !== 'none'
    ? calculations.totalPrice - Math.round(hardwareOnlyDisplay)
    : calculations.totalPrice;

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
            {calculations.totalPrice > 0 && hardwareMode === 'manual' && (
              <div className={`mt-4 pt-3 border-t space-y-1.5 ${
                isMobile ? 'border-white/20' : 'border-slate-200'
              }`}>
                <div className="flex justify-between text-sm">
                  <span className={isMobile ? 'text-white/70' : 'text-slate-600'}>Shade sail:</span>
                  <span className={`font-semibold ${isMobile ? 'text-white' : 'text-slate-900'}`}>
                    {formatCurrency(sailOnlyDisplay, config.currency)}
                  </span>
                </div>
                {hardwareOnlyDisplay > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className={isMobile ? 'text-white/70' : 'text-slate-600'}>Hardware:</span>
                    <span className={`font-semibold ${isMobile ? 'text-white' : 'text-slate-900'}`}>
                      {formatCurrency(Math.round(hardwareOnlyDisplay), config.currency)}
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4 border-t border-slate-200 pt-4">
            {(config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none')) === 'standard' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-start gap-3 mb-3">
                  {packImage ? (
                    <img
                      src={packImage}
                      alt={`${config.corners} Corner Hardware Tensioning Kit`}
                      className="h-14 w-14 flex-shrink-0 rounded-lg object-cover border border-slate-200 bg-white"
                    />
                  ) : (
                    <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-white border border-slate-200 flex items-center justify-center">
                      <Package className="h-6 w-6 text-[#307C31]" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-bold text-slate-900">Hardware Tensioning Kit</span>
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
                              Stainless steel hardware kit included with your sail.
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
                        <button
                          type="button"
                          aria-label="Hardware kit details"
                          className="inline-flex items-center justify-center text-slate-400 hover:text-[#307C31] focus:outline-none focus:ring-2 focus:ring-[#307C31] focus:ring-offset-1 rounded-full"
                        >
                          <Info className="h-4 w-4" />
                        </button>
                      </Tooltip>
                    </div>
                    <div className="mt-0.5 text-xs font-semibold text-[#307C31]">
                      Included in sail price
                    </div>
                  </div>
                </div>
                {packLines.length > 0 && (
                  <div className="pt-3 border-t border-slate-200">
                    <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-2">
                      What's included
                    </div>
                    <ul className="space-y-1.5">
                      {packLines.map(({ item, qty }) => (
                        <li key={item.id} className="flex items-center gap-2 text-xs">
                          {item.image_url && (
                            <img src={item.image_url} alt="" className="h-7 w-7 rounded object-cover flex-shrink-0 bg-white border border-slate-200" />
                          )}
                          <span className="flex-1 min-w-0 truncate text-slate-800">{stripHardwareSize(item.name)}</span>
                          <span className="flex-shrink-0 font-semibold text-slate-600">x {qty}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (config.hardwareSelectionMode ?? (config.measurementOption === 'adjust' ? 'standard' : 'none')) === 'manual' ? null : (
              <div className="flex justify-between text-sm">
                <span className="text-[#01312D]/60">Tensioning hardware & fittings:</span>
                <span className="text-[#01312D] font-semibold">
                  Not included
                </span>
              </div>
            )}

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
                      {adminMode ? 'Save Quote' : isEmailMode ? 'Save & Email PDF Quote' : 'Save Your Progress'}
                    </p>
                    <p className="text-sm text-slate-600">
                      {adminMode
                        ? 'Save this configuration and get a shareable link and PDF for your customer.'
                        : isEmailMode
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
                  <span>{adminMode ? 'Save Quote' : isEmailMode ? 'Save & Email Quote' : 'Save Progress'}</span>
                </Button>
              </Tooltip>
              <p className="text-xs text-center text-slate-500 mt-2">
                {adminMode ? 'Get a share link and PDF for your customer' : isEmailMode ? 'Your price is locked for 30 days' : 'Return anytime to continue where you left off'}
              </p>

              {/* Add to Cart button - Show when all acknowledgments are checked (hidden in admin mode) */}
              {!adminMode && allAcknowledgmentsChecked && handleAddToCart && (
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
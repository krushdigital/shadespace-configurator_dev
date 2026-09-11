import React, { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { getPortalRoot } from '../../utils/appScope';
import { ConfiguratorState, Fabric } from '../../types';
import { FABRICS as FALLBACK_FABRICS } from '../../data/fabrics';
import { Tooltip } from '../ui/Tooltip';
import { AccordionItem } from '../ui/AccordionItem';
import { Info, GitCompare, X, Search } from 'lucide-react';
import { analytics } from '../../utils/analytics';
import { FabricComparison } from '../FabricComparison';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface MaterialFinishContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: { [key: string]: string };
  onNext: () => void;
  onPrev?: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  isStepOpen?: boolean;
  onSaveQuote?: () => void;
  fabrics?: Fabric[];
  mobileGuidance?: {
    isGuidanceActive: boolean;
    currentHighlightTarget: string | null;
    scrollToElement: (elementId: string, delay?: number, offset?: number, alignToTop?: boolean) => void;
    setHighlightTarget: (targetId: string | null, duration?: number) => void;
    clearHighlight: () => void;
  };
}

export function MaterialFinishContent({
  config,
  updateConfig,
  onNext,
  onPrev,
  nextStepTitle = '',
  showBackButton = false,
  validationErrors = {},
  isStepOpen = true,
  onSaveQuote,
  fabrics,
  mobileGuidance,
}: MaterialFinishContentProps) {
  const FABRICS = fabrics && fabrics.length > 0 ? fabrics : FALLBACK_FABRICS;
  const selectedFabric = FABRICS.find((f) => f.id === config.fabricType);
  const stepStartTime = useRef(Date.now());
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonInitialId, setComparisonInitialId] = useState<string | undefined>(undefined);
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; label: string } | null>(null);

  // Fabric collapse/expand state
  const [fabricsExpanded, setFabricsExpanded] = useState(!config.fabricType);
  const [hoveredPillId, setHoveredPillId] = useState<string | null>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 900;

  // Color zoom modal state
  const [zoomColor, setZoomColor] = useState<{ fabric: Fabric; color: Fabric['colors'][0] } | null>(null);

  // Hover tooltip state for swatches
  const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null);

  useBodyScrollLock(!!enlargedImage || !!zoomColor);

  const openComparison = (fabricId?: string) => {
    setComparisonInitialId(fabricId || config.fabricType || FABRICS[0]?.id);
    setComparisonOpen(true);
  };

  useEffect(() => {
    analytics.stepViewed(1, 'material_and_finish');
  }, []);

  // Collapse cards after fabric is selected
  useEffect(() => {
    if (config.fabricType) {
      const timer = setTimeout(() => setFabricsExpanded(false), 350);
      return () => clearTimeout(timer);
    } else {
      setFabricsExpanded(true);
    }
  }, [config.fabricType]);

  useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && config.fabricType && !config.fabricColor) {
      mobileGuidance.scrollToElement('color-selection', 400, 140, true);
      mobileGuidance.setHighlightTarget('color-selection');
    }
  }, [config.fabricType, config.fabricColor, mobileGuidance?.isGuidanceActive]);

  useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && config.fabricType && config.fabricColor) {
      mobileGuidance.scrollToElement('continue-button-material', 400);
      mobileGuidance.setHighlightTarget('continue-button-material');
    }
  }, [config.fabricType, config.fabricColor, mobileGuidance?.isGuidanceActive]);

  useEffect(() => {
    if (!enlargedImage && !zoomColor) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setEnlargedImage(null); setZoomColor(null); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enlargedImage, zoomColor]);

  // Desktop: hover on pill re-expands cards
  const handlePillMouseEnter = useCallback((fabricId: string) => {
    if (isMobile) return;
    clearTimeout(hoverTimeoutRef.current);
    setHoveredPillId(fabricId);
    if (fabricId !== config.fabricType) {
      setFabricsExpanded(true);
    }
  }, [config.fabricType, isMobile]);

  const handlePillMouseLeave = useCallback(() => {
    if (isMobile) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPillId(null);
      if (config.fabricType) setFabricsExpanded(false);
    }, 300);
  }, [config.fabricType, isMobile]);

  const handleCardAreaMouseEnter = useCallback(() => {
    if (isMobile) return;
    clearTimeout(hoverTimeoutRef.current);
  }, [isMobile]);

  const handleCardAreaMouseLeave = useCallback(() => {
    if (isMobile) return;
    hoverTimeoutRef.current = setTimeout(() => {
      setHoveredPillId(null);
      if (config.fabricType) setFabricsExpanded(false);
    }, 300);
  }, [config.fabricType, isMobile]);

  useEffect(() => {
    return () => clearTimeout(hoverTimeoutRef.current);
  }, []);

  // Mobile: tap pill row to expand
  const handlePillRowTap = () => {
    if (!isMobile) return;
    setFabricsExpanded(prev => !prev);
  };

  return (
    <div className="space-y-6">
      {/* Fabric type section */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-1 flex-wrap">
          <h4 className="text-[19px] font-extrabold text-brand-green">
            <a href="https://shadespace.com/pages/our-fabrics" target="_blank" rel="noopener noreferrer" className="text-brand-green hover:text-brand-mid transition-colors">
              Fabric Material
            </a>
          </h4>
          <button
            type="button"
            onClick={() => openComparison()}
            className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold text-brand-green border-2 border-border-card hover:bg-brand-green hover:text-white px-3 py-1.5 rounded-btn transition-colors min-h-[44px]"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare fabrics
          </button>
        </div>
        {fabricsExpanded && !config.fabricType && (
          <p className="text-[15px] text-text-muted mb-4">Select the fabric that best suits your project.</p>
        )}
        {fabricsExpanded && config.fabricType && (
          <div className="mb-4" />
        )}

        {/* Pill row - shown when fabric selected and cards collapsed */}
        {config.fabricType && (
          <div className="mb-4">
            <div
              className="flex items-center gap-2 flex-wrap"
              onClick={handlePillRowTap}
            >
              <span className="text-[14px] font-semibold text-text-muted mr-1">Fabric:</span>
              {FABRICS.map((fabric) => {
                const isPillSelected = config.fabricType === fabric.id;
                return (
                  <button
                    key={fabric.id}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isPillSelected) {
                        analytics.fabricTypeSelected(fabric.id, fabric.label);
                        updateConfig({ fabricType: fabric.id, fabricColor: '' });
                      }
                    }}
                    onMouseEnter={() => handlePillMouseEnter(fabric.id)}
                    onMouseLeave={handlePillMouseLeave}
                    className={`px-3.5 py-1.5 rounded-full text-[14px] font-bold transition-all duration-200 min-h-[36px] ${
                      isPillSelected
                        ? 'bg-brand-green text-white'
                        : 'bg-white border-2 border-border-card text-brand-green hover:border-brand-green'
                    }`}
                  >
                    {fabric.label}
                  </button>
                );
              })}
              <span className="text-[13px] text-text-muted ml-2 hidden sm:inline">
                {isMobile ? 'Tap to change fabric' : 'Hover another fabric to compare'}
              </span>
            </div>
          </div>
        )}

        {/* Fabric cards with collapse/expand animation */}
        <div
          className="overflow-hidden transition-all duration-[450ms] ease-in-out"
          style={{
            maxHeight: fabricsExpanded ? '2000px' : '0px',
            opacity: fabricsExpanded ? 1 : 0,
          }}
          onMouseEnter={handleCardAreaMouseEnter}
          onMouseLeave={handleCardAreaMouseLeave}
        >
          <div className="grid gap-4" style={{ gridTemplateColumns: config.fabricType ? 'repeat(auto-fill, minmax(230px, 1fr))' : 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {FABRICS.map((fabric) => {
              const isSelected = config.fabricType === fabric.id;
              return (
                <button
                  key={fabric.id}
                  type="button"
                  onClick={() => {
                    analytics.fabricTypeSelected(fabric.id, fabric.label);
                    updateConfig({ fabricType: fabric.id, fabricColor: '' });
                  }}
                  className={`relative text-left rounded-card transition-all duration-200 cursor-pointer min-h-[44px] ${!config.fabricType ? 'p-5' : 'p-4'} ${
                    isSelected
                      ? 'bg-brand-green text-white border-2 border-brand-green'
                      : 'bg-white border-2 border-border-card hover:border-[#7bb08f]'
                  }`}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand-lime text-brand-green text-sm font-extrabold flex items-center justify-center">
                      &#10003;
                    </div>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mb-1.5 pr-8">
                    <span className={`font-extrabold leading-tight ${!config.fabricType ? 'text-[19px]' : 'text-[17px]'}`}>{fabric.label}</span>
                    {fabric.isFireRetardant && (
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">FR</span>
                    )}
                    {fabric.badgeText && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-lime text-brand-green">{fabric.badgeText}</span>
                    )}
                    <Tooltip
                      onOpen={() => analytics.fabricDetailsViewed(fabric.id)}
                      content={
                        <div className="max-w-lg">
                          <div className="mb-3">
                            <a href="https://shadespace.com/pages/our-fabrics" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 bg-brand-lime text-brand-green text-xs font-bold rounded-full hover:opacity-80 transition-opacity" onClick={() => analytics.fabricLinkClicked(fabric.id, 'https://shadespace.com/pages/our-fabrics')}>
                              View All Fabrics
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                            </a>
                          </div>
                          <h4 className="font-bold text-brand-green mb-2">{fabric.label}</h4>
                          <div className={`grid ${fabric.id === 'monotec370' ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-3 p-3 bg-surface-soft rounded-lg`}>
                            <div>
                              <div className="text-xs text-text-muted mb-1">Weight</div>
                              <div className="font-semibold text-brand-green">{fabric.weightPerSqm} g/m&sup2;</div>
                            </div>
                            <div>
                              <div className="text-xs text-text-muted mb-1">Warranty</div>
                              <div className="font-semibold text-brand-green">
                                <a href="https://shadespace.com/pages/warranty" target="_blank" rel="noopener noreferrer" className="hover:underline">{fabric.warrantyYears} Years</a>
                              </div>
                            </div>
                            {fabric.id === 'monotec370' && (
                              <div>
                                <div className="text-xs text-text-muted mb-1">Wind rating</div>
                                <div className="font-semibold text-brand-green">85 mph</div>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-text-muted mb-3 leading-relaxed">{fabric.detailedDescription}</p>
                          {fabric.isFireRetardant && (
                            <div className="flex items-center justify-center mb-3">
                              <img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Fire_Retardant.png?v=1755470964" alt="Fire Retardant Certified" className="w-12 h-12 mr-2" />
                              <p className="text-xs text-brand-green font-semibold">Fire Retardant Certified</p>
                            </div>
                          )}
                          <AccordionItem trigger="Learn More" defaultOpen={false}>
                            <div className="space-y-3 mt-2">
                              <div><h5 className="font-semibold text-brand-green mb-1">Made In:</h5><p className="text-sm text-text-muted">{fabric.madeIn}</p></div>
                              <div><h5 className="font-semibold text-brand-green mb-1">Key Benefits:</h5><ul className="text-xs text-text-muted space-y-1">{fabric.benefits.filter(b => !b.toLowerCase().includes('uv protection')).map((b, i) => <li key={i}>&#8226; {b}</li>)}<li>&#8226; Sewn with SolarFix&reg; PTFE thread</li></ul></div>
                              <div><h5 className="font-semibold text-brand-green mb-1">Best For:</h5><ul className="text-xs text-text-muted space-y-1">{fabric.bestFor.map((u, i) => <li key={i}>&#8226; {u}</li>)}</ul></div>
                            </div>
                          </AccordionItem>
                          <button type="button" onClick={(e) => { e.stopPropagation(); openComparison(fabric.id); }} className="mt-3 inline-flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-white bg-brand-mid hover:bg-brand-green px-3 py-2 rounded-full transition-colors">
                            <GitCompare className="w-3.5 h-3.5" />Compare all fabrics
                          </button>
                        </div>
                      }
                    >
                      <span className="w-[18px] h-[18px] inline-flex items-center justify-center text-[10px] font-bold bg-brand-green/15 text-brand-green rounded-full cursor-help hover:bg-brand-green hover:text-white transition-colors">?</span>
                    </Tooltip>
                  </div>
                  <p className={`leading-[1.45] ${!config.fabricType ? 'text-[15px] line-clamp-3' : 'text-[14px] line-clamp-2'} ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>{fabric.description}</p>

                  <div className={`mt-2 font-semibold ${!config.fabricType ? 'text-[14px]' : 'text-[13px]'} ${isSelected ? 'text-white/70' : 'text-text-muted'}`}>
                    {fabric.weightPerSqm} g/m&sup2; &middot; {fabric.warrantyYears} year warranty
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Mobile compare button */}
        {fabricsExpanded && (
          <button
            type="button"
            onClick={() => openComparison()}
            className="sm:hidden mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm font-bold text-brand-green border-2 border-border-card hover:bg-brand-green hover:text-white px-3 py-2.5 rounded-btn transition-colors min-h-[44px]"
          >
            <GitCompare className="w-4 h-4" />
            Compare fabrics
          </button>
        )}
      </div>

      {/* Color section with fadeUp animation */}
      {selectedFabric && (
        <div
          id="color-selection"
          data-guidance-id="color-selection"
          className="animate-[fadeUp_0.4s_ease-out]"
        >
          <h4 className="text-[19px] font-extrabold text-brand-green mb-2">Choose Color</h4>
          <p className="text-[15px] text-text-muted mb-4">Tap a swatch to select your colour. Hover to see shade factor.</p>

          {selectedFabric.isFireRetardant && (
            <div className="mb-4 p-3 bg-surface-soft border border-brand-mid/30 rounded-card">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-brand-mid flex-shrink-0" />
                <p className="text-sm text-brand-green">
                  <strong>Important:</strong> Not all {selectedFabric.label} colors are fire retardant. Look for the <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">FR</span> badge.
                </p>
              </div>
            </div>
          )}

          {/* Color swatch grid */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: '14px 12px' }}>
            {selectedFabric.colors.map((color) => {
              const isColorSelected = config.fabricColor === color.name;
              const isHovered = hoveredSwatch === color.name;
              return (
                <div key={color.name} className="relative">
                  <button
                    type="button"
                    onClick={() => {
                      analytics.fabricColorSelected(config.fabricType, color.name, color.shadeFactor);
                      updateConfig({ fabricColor: color.name });
                    }}
                    onMouseEnter={() => setHoveredSwatch(color.name)}
                    onMouseLeave={() => setHoveredSwatch(null)}
                    className="w-full rounded-[14px] overflow-hidden transition-all duration-200"
                    style={isColorSelected ? {
                      outline: '3px solid #01312d',
                      outlineOffset: '3px',
                    } : undefined}
                  >
                    <div className="relative aspect-square overflow-hidden bg-border-card rounded-[14px]">
                      <img
                        src={color.imageUrl}
                        alt={color.name}
                        className="absolute inset-0 w-full h-full object-cover scale-[2.6] origin-center transition-transform hover:scale-[2.8]"
                        loading="lazy"
                      />
                      {/* Centered checkmark for selected */}
                      {isColorSelected && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-[30px] h-[30px] rounded-full bg-brand-green flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-brand-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        </div>
                      )}
                      {/* FR badge */}
                      {selectedFabric.isFireRetardant && color.isFireRetardant && (
                        <div className="absolute top-1.5 left-1.5 z-10">
                          <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">FR</span>
                        </div>
                      )}
                      {/* Magnifier icon */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setZoomColor({ fabric: selectedFabric, color });
                        }}
                        className="absolute bottom-1.5 right-1.5 w-[20px] h-[20px] rounded-full bg-white/55 hover:bg-white flex items-center justify-center z-10 transition-opacity opacity-55 hover:opacity-100"
                      >
                        <Search className="w-3 h-3 text-brand-green" />
                      </button>
                    </div>
                    <div className="text-[13px] font-semibold mt-2.5 leading-tight text-center text-brand-green">{color.name}</div>
                  </button>

                  {/* Hover tooltip below swatch */}
                  {isHovered && !isColorSelected && (
                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 z-20 pointer-events-none">
                      <div className="bg-brand-green text-white rounded-xl p-2.5 shadow-xl min-w-[140px] text-center">
                        <div className="text-[12px] font-bold mb-0.5">{color.name}</div>
                        {color.shadeFactor && (
                          <div className="text-[11px]">
                            Shade <span className="text-brand-lime font-bold">{color.shadeFactor}%</span>
                          </div>
                        )}
                        {color.uvBlock && (
                          <div className="text-[11px] text-white/70">UV Block {color.uvBlock}%</div>
                        )}
                        {selectedFabric.isFireRetardant && color.isFireRetardant && (
                          <div className="text-[10px] text-orange-300 mt-0.5">Fire Retardant</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Color zoom modal */}
      {zoomColor && typeof document !== 'undefined' &&
        createPortal(
          <div
            data-lenis-prevent
            className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(1,49,45,0.72)] p-5"
            onClick={() => setZoomColor(null)}
            role="dialog"
            aria-modal="true"
            aria-label={`${zoomColor.color.name} color detail`}
          >
            <div
              className="bg-white rounded-2xl shadow-2xl max-w-[700px] w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="grid grid-cols-1 sm:grid-cols-2">
                {/* Texture image */}
                <div className="aspect-square bg-border-card rounded-tl-2xl sm:rounded-bl-2xl overflow-hidden">
                  <img
                    src={zoomColor.color.imageUrl}
                    alt={zoomColor.color.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                {/* Specs */}
                <div className="p-6 flex flex-col">
                  <button
                    type="button"
                    onClick={() => setZoomColor(null)}
                    className="absolute top-3 right-3 sm:relative sm:top-auto sm:right-auto sm:self-end w-8 h-8 inline-flex items-center justify-center rounded-full text-text-muted hover:text-brand-green hover:bg-surface-soft transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-5 h-5" />
                  </button>

                  <div className="text-[13px] text-text-muted font-medium">{zoomColor.fabric.label}</div>
                  <h3 className="text-[22px] font-extrabold text-brand-green mt-1 mb-3">{zoomColor.color.name}</h3>

                  {zoomColor.fabric.isFireRetardant && zoomColor.color.isFireRetardant && (
                    <span className="inline-flex self-start bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded mb-3">Fire Retardant</span>
                  )}

                  <div className="grid grid-cols-2 gap-3 mb-4 p-3 bg-surface-soft rounded-xl">
                    {zoomColor.color.shadeFactor && (
                      <div>
                        <div className="text-[11px] text-text-muted mb-0.5">Shade factor</div>
                        <div className="text-[15px] font-bold text-brand-green">{zoomColor.color.shadeFactor}%</div>
                      </div>
                    )}
                    {zoomColor.color.uvBlock && (
                      <div>
                        <div className="text-[11px] text-text-muted mb-0.5">UV Block</div>
                        <div className="text-[15px] font-bold text-brand-green">{zoomColor.color.uvBlock}%</div>
                      </div>
                    )}
                    <div>
                      <div className="text-[11px] text-text-muted mb-0.5">Weight</div>
                      <div className="text-[15px] font-bold text-brand-green">{zoomColor.fabric.weightPerSqm} g/m&sup2;</div>
                    </div>
                    <div>
                      <div className="text-[11px] text-text-muted mb-0.5">Warranty</div>
                      <div className="text-[15px] font-bold text-brand-green">{zoomColor.fabric.warrantyYears} Years</div>
                    </div>
                  </div>

                  {zoomColor.fabric.description && (
                    <p className="text-[13px] text-text-muted leading-relaxed mb-3">{zoomColor.fabric.description}</p>
                  )}

                  <p className="text-[11px] text-text-muted/60 mb-4">Actual fabric color may vary slightly from screen display.</p>

                  <button
                    type="button"
                    onClick={() => {
                      analytics.fabricColorSelected(zoomColor.fabric.id, zoomColor.color.name, zoomColor.color.shadeFactor);
                      updateConfig({ fabricType: zoomColor.fabric.id, fabricColor: zoomColor.color.name });
                      setZoomColor(null);
                    }}
                    className="mt-auto w-full py-3 bg-brand-green text-white text-[16px] font-bold rounded-btn hover:bg-[#012a26] transition-colors min-h-[44px]"
                  >
                    Choose {zoomColor.color.name}
                  </button>
                </div>
              </div>
            </div>
          </div>,
          getPortalRoot()
        )}

      {/* Enlarged image portal */}
      {enlargedImage && typeof document !== 'undefined' &&
        createPortal(
          <div data-lenis-prevent className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(1,49,45,0.72)] p-5" onClick={() => setEnlargedImage(null)} role="dialog" aria-modal="true" aria-label={`${enlargedImage.label} enlarged image`}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }} className="absolute top-4 right-4 w-10 h-10 inline-flex items-center justify-center rounded-full border-2 border-white/30 text-white hover:bg-white/10 transition-colors" aria-label="Close enlarged image"><X className="w-5 h-5" /></button>
            <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              <img src={enlargedImage.url} alt={`${enlargedImage.label} - enlarged view`} className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-white" />
              <p className="mt-3 text-center text-white font-semibold text-lg">{enlargedImage.label}</p>
            </div>
          </div>,
          getPortalRoot()
        )}

      <FabricComparison fabrics={FABRICS} open={comparisonOpen} onClose={() => setComparisonOpen(false)} initialFabricId={comparisonInitialId} onSelectFabric={(id) => { analytics.fabricTypeSelected(id, FABRICS.find(f => f.id === id)?.label || id); updateConfig({ fabricType: id, fabricColor: '' }); }} />
    </div>
  );
}

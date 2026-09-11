import React, { useState, useEffect, useRef } from 'react';
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

  const [zoomColor, setZoomColor] = useState<{ fabric: Fabric; color: Fabric['colors'][0] } | null>(null);
  const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null);

  useBodyScrollLock(!!enlargedImage || !!zoomColor);

  const openComparison = (fabricId?: string) => {
    setComparisonInitialId(fabricId || config.fabricType || FABRICS[0]?.id);
    setComparisonOpen(true);
  };

  useEffect(() => {
    analytics.stepViewed(1, 'material_and_finish');
  }, []);

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

        {!config.fabricType && (
          <p className="text-[15px] text-text-muted mb-4">Select the fabric that best suits your project.</p>
        )}

        {/* Fabric type tabs - always 2x2 grid (panel max-width is 760px) */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          {FABRICS.map((fabric) => {
            const isSelected = config.fabricType === fabric.id;
            return (
              <button
                key={fabric.id}
                type="button"
                onClick={() => {
                  if (!isSelected) {
                    analytics.fabricTypeSelected(fabric.id, fabric.label);
                    updateConfig({ fabricType: fabric.id, fabricColor: '' });
                  }
                }}
                className={`relative flex flex-col items-center justify-center gap-1 px-2 py-2.5 rounded-xl text-[13px] font-bold transition-all duration-200 min-h-[56px] border-2 ${
                  isSelected
                    ? 'bg-brand-green text-white border-brand-green shadow-md'
                    : 'bg-white text-brand-green border-border-card hover:border-brand-green/50 hover:shadow-sm'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-brand-lime text-brand-green text-[10px] font-extrabold flex items-center justify-center flex-shrink-0">
                      &#10003;
                    </span>
                  )}
                  <span>{fabric.label}</span>
                </span>
                {(fabric.isFireRetardant || fabric.badgeText) && (
                  <span className="flex items-center gap-1 flex-wrap justify-center">
                    {fabric.isFireRetardant && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${isSelected ? 'bg-orange-400 text-white' : 'bg-orange-500 text-white'}`}>FR</span>
                    )}
                    {fabric.badgeText && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${isSelected ? 'bg-brand-lime/30 text-brand-lime' : 'bg-brand-lime text-brand-green'}`}>{fabric.badgeText}</span>
                    )}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Detail card for the selected fabric */}
        {selectedFabric && (
          <div className="bg-white border-2 border-border-card rounded-card p-5 animate-[fadeUp_0.3s_ease-out]">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div className="flex items-center gap-2 flex-wrap">
                <h5 className="text-[17px] font-extrabold text-brand-green">{selectedFabric.label}</h5>
                {selectedFabric.isFireRetardant && (
                  <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">FR</span>
                )}
                {selectedFabric.badgeText && (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-lime text-brand-green">{selectedFabric.badgeText}</span>
                )}
                <Tooltip
                  onOpen={() => analytics.fabricDetailsViewed(selectedFabric.id)}
                  content={
                    <div className="max-w-lg">
                      <div className="mb-3">
                        <a href="https://shadespace.com/pages/our-fabrics" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 bg-brand-lime text-brand-green text-xs font-bold rounded-full hover:opacity-80 transition-opacity" onClick={() => analytics.fabricLinkClicked(selectedFabric.id, 'https://shadespace.com/pages/our-fabrics')}>
                          View All Fabrics
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                        </a>
                      </div>
                      <h4 className="font-bold text-brand-green mb-2">{selectedFabric.label}</h4>
                      <div className={`grid ${selectedFabric.id === 'monotec370' ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-3 p-3 bg-surface-soft rounded-lg`}>
                        <div>
                          <div className="text-xs text-text-muted mb-1">Weight</div>
                          <div className="font-semibold text-brand-green">{selectedFabric.weightPerSqm} g/m&sup2;</div>
                        </div>
                        <div>
                          <div className="text-xs text-text-muted mb-1">Warranty</div>
                          <div className="font-semibold text-brand-green">
                            <a href="https://shadespace.com/pages/warranty" target="_blank" rel="noopener noreferrer" className="hover:underline">{selectedFabric.warrantyYears} Years</a>
                          </div>
                        </div>
                        {selectedFabric.id === 'monotec370' && (
                          <div>
                            <div className="text-xs text-text-muted mb-1">Wind rating</div>
                            <div className="font-semibold text-brand-green">85 mph</div>
                          </div>
                        )}
                      </div>
                      <p className="text-sm text-text-muted mb-3 leading-relaxed">{selectedFabric.detailedDescription}</p>
                      {selectedFabric.isFireRetardant && (
                        <div className="flex items-center justify-center mb-3">
                          <img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Fire_Retardant.png?v=1755470964" alt="Fire Retardant Certified" className="w-12 h-12 mr-2" />
                          <p className="text-xs text-brand-green font-semibold">Fire Retardant Certified</p>
                        </div>
                      )}
                      <AccordionItem trigger="Learn More" defaultOpen={false}>
                        <div className="space-y-3 mt-2">
                          <div><h5 className="font-semibold text-brand-green mb-1">Made In:</h5><p className="text-sm text-text-muted">{selectedFabric.madeIn}</p></div>
                          <div><h5 className="font-semibold text-brand-green mb-1">Key Benefits:</h5><ul className="text-xs text-text-muted space-y-1">{selectedFabric.benefits.filter(b => !b.toLowerCase().includes('uv protection')).map((b, i) => <li key={i}>&#8226; {b}</li>)}<li>&#8226; Sewn with SolarFix&reg; PTFE thread</li></ul></div>
                          <div><h5 className="font-semibold text-brand-green mb-1">Best For:</h5><ul className="text-xs text-text-muted space-y-1">{selectedFabric.bestFor.map((u, i) => <li key={i}>&#8226; {u}</li>)}</ul></div>
                        </div>
                      </AccordionItem>
                      <button type="button" onClick={(e) => { e.stopPropagation(); openComparison(selectedFabric.id); }} className="mt-3 inline-flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-white bg-brand-mid hover:bg-brand-green px-3 py-2 rounded-full transition-colors">
                        <GitCompare className="w-3.5 h-3.5" />Compare all fabrics
                      </button>
                    </div>
                  }
                >
                  <span className="w-[18px] h-[18px] inline-flex items-center justify-center text-[10px] font-bold bg-brand-green/15 text-brand-green rounded-full cursor-help hover:bg-brand-green hover:text-white transition-colors">?</span>
                </Tooltip>
              </div>
            </div>

            <p className="text-[15px] text-text-muted leading-[1.45] mb-3">{selectedFabric.description}</p>

            <div className="flex items-center gap-4 text-[13px] font-semibold text-text-muted">
              <span>{selectedFabric.weightPerSqm} g/m&sup2;</span>
              <span className="w-1 h-1 rounded-full bg-text-muted/40" />
              <span>{selectedFabric.warrantyYears} year warranty</span>
              {selectedFabric.id === 'monotec370' && (
                <>
                  <span className="w-1 h-1 rounded-full bg-text-muted/40" />
                  <span>85 mph wind rated</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Initial state: show full cards when no fabric selected */}
        {!selectedFabric && (
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {FABRICS.map((fabric) => (
              <button
                key={fabric.id}
                type="button"
                onClick={() => {
                  analytics.fabricTypeSelected(fabric.id, fabric.label);
                  updateConfig({ fabricType: fabric.id, fabricColor: '' });
                }}
                className="relative text-left rounded-card transition-all duration-200 cursor-pointer min-h-[44px] p-5 bg-white border-2 border-border-card hover:border-[#7bb08f] hover:shadow-sm"
              >
                <div className="flex items-center gap-2 flex-wrap mb-1.5">
                  <span className="font-extrabold leading-tight text-[19px]">{fabric.label}</span>
                  {fabric.isFireRetardant && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">FR</span>
                  )}
                  {fabric.badgeText && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-lime text-brand-green">{fabric.badgeText}</span>
                  )}
                </div>
                <p className="text-[15px] leading-[1.45] line-clamp-3 text-text-muted">{fabric.description}</p>
                <div className="mt-2 font-semibold text-[14px] text-text-muted">
                  {fabric.weightPerSqm} g/m&sup2; &middot; {fabric.warrantyYears} year warranty
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Mobile compare button */}
        <button
          type="button"
          onClick={() => openComparison()}
          className="sm:hidden mt-3 w-full inline-flex items-center justify-center gap-1.5 text-sm font-bold text-brand-green border-2 border-border-card hover:bg-brand-green hover:text-white px-3 py-2.5 rounded-btn transition-colors min-h-[44px]"
        >
          <GitCompare className="w-4 h-4" />
          Compare fabrics
        </button>
      </div>

      {/* Color section */}
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
                      {isColorSelected && (
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <div className="w-[30px] h-[30px] rounded-full bg-brand-green flex items-center justify-center shadow-lg">
                            <svg className="w-4 h-4 text-brand-lime" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                          </div>
                        </div>
                      )}
                      {selectedFabric.isFireRetardant && color.isFireRetardant && (
                        <div className="absolute top-1.5 left-1.5 z-10">
                          <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">FR</span>
                        </div>
                      )}
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
                <div className="aspect-square bg-border-card rounded-tl-2xl sm:rounded-bl-2xl overflow-hidden">
                  <img
                    src={zoomColor.color.imageUrl}
                    alt={zoomColor.color.name}
                    className="w-full h-full object-cover"
                  />
                </div>
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

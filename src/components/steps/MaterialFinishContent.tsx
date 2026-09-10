import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getPortalRoot } from '../../utils/appScope';
import { ConfiguratorState, Fabric } from '../../types';
import { FABRICS as FALLBACK_FABRICS } from '../../data/fabrics';
import { Tooltip } from '../ui/Tooltip';
import { AccordionItem } from '../ui/AccordionItem';
import { Info, GitCompare, X } from 'lucide-react';
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

  useBodyScrollLock(!!enlargedImage);

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
    if (!enlargedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEnlargedImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enlargedImage]);

  return (
    <div className="space-y-6">
      {/* Fabric type cards */}
      <div>
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
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

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
                className={`relative text-left rounded-card p-4 transition-all duration-200 cursor-pointer min-h-[44px] ${
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
                  <span className="font-extrabold text-[17px] leading-tight">{fabric.label}</span>
                  {fabric.isFireRetardant && (
                    <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded">FR</span>
                  )}
                  {fabric.badgeText && (
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      isSelected ? 'bg-brand-lime text-brand-green' : 'bg-brand-lime text-brand-green'
                    }`}>{fabric.badgeText}</span>
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
                    <span className="w-4.5 h-4.5 inline-flex items-center justify-center text-[10px] bg-brand-mid text-white rounded-full cursor-help hover:bg-brand-green transition-colors">?</span>
                  </Tooltip>
                </div>
                <p className={`text-[14px] leading-[1.45] line-clamp-2 ${isSelected ? 'text-white/80' : 'text-text-muted'}`}>{fabric.description}</p>

                {/* Stats bar */}
                <div className={`hidden sm:flex mt-3 rounded-xl p-2 transition-all duration-200 ${isSelected ? 'bg-white/10' : 'bg-surface-soft'}`}>
                  <div className="flex justify-between items-center gap-2 w-full text-[12px]">
                    <div className="min-w-0">
                      <div className={`mb-0.5 ${isSelected ? 'text-white/60' : 'text-text-muted'}`}>Weight</div>
                      <div className={`font-bold ${isSelected ? 'text-white' : 'text-brand-green'}`}>{fabric.weightPerSqm} g/m&sup2;</div>
                    </div>
                    {fabric.id === 'monotec370' && (
                      <div className="min-w-0 text-center">
                        <div className={`mb-0.5 ${isSelected ? 'text-white/60' : 'text-text-muted'}`}>Wind</div>
                        <div className={`font-bold ${isSelected ? 'text-white' : 'text-brand-green'}`}>85 mph</div>
                      </div>
                    )}
                    <div className="min-w-0 text-right">
                      <div className={`mb-0.5 ${isSelected ? 'text-white/60' : 'text-text-muted'}`}>Warranty</div>
                      <div className={`font-bold ${isSelected ? 'text-white' : 'text-brand-green'}`}>{fabric.warrantyYears} Yrs</div>
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

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

      {/* Fabric chosen pill + color grid */}
      {selectedFabric && (
        <div id="color-selection" data-guidance-id="color-selection">
          {/* Selected fabric pill */}
          <div className="flex items-center gap-2.5 mb-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-brand-green text-white text-[15px] font-bold rounded-full">
              <span>{selectedFabric.label}</span>
              <span className="text-white/50">&middot;</span>
              <span className="text-brand-lime text-[13px]">selected</span>
            </div>
          </div>

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
          <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-2.5">
            {selectedFabric.colors.map((color) => {
              const isColorSelected = config.fabricColor === color.name;
              return (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => {
                    analytics.fabricColorSelected(config.fabricType, color.name, color.shadeFactor);
                    updateConfig({ fabricColor: color.name });
                  }}
                  className={`group relative rounded-[14px] overflow-hidden transition-all duration-200 ${
                    isColorSelected
                      ? 'ring-[3px] ring-brand-green ring-offset-2'
                      : 'ring-1 ring-border-card hover:ring-brand-mid'
                  }`}
                >
                  <div className="relative aspect-square overflow-hidden bg-border-card">
                    <img
                      src={color.imageUrl}
                      alt={color.name}
                      className="absolute inset-0 w-full h-full object-cover scale-[2.6] origin-center transition-transform group-hover:scale-[2.8]"
                      loading="lazy"
                    />
                    {isColorSelected && (
                      <div className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-brand-lime flex items-center justify-center z-10">
                        <svg className="w-3 h-3 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                      </div>
                    )}
                    {selectedFabric.isFireRetardant && color.isFireRetardant && (
                      <div className="absolute top-1.5 left-1.5 z-10">
                        <span className="bg-orange-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded">FR</span>
                      </div>
                    )}
                    {/* Shade factor on hover */}
                    {color.shadeFactor && (
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity px-2 pt-4 pb-1.5">
                        <span className="text-[11px] font-bold text-white">SF {color.shadeFactor}%</span>
                      </div>
                    )}
                  </div>
                  <div className={`px-1.5 py-1.5 text-center ${isColorSelected ? 'bg-brand-green' : 'bg-white'}`}>
                    <span className={`text-[12px] font-bold leading-tight block truncate ${isColorSelected ? 'text-white' : 'text-brand-green'}`}>{color.name}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
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

import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { ConfiguratorState, Fabric } from '../../types';
import { FABRICS as FALLBACK_FABRICS } from '../../data/fabrics';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';
import { AccordionItem } from '../ui/AccordionItem';
import { Info, AlertCircle, GitCompare } from 'lucide-react';
import { analytics } from '../../utils/analytics';
import { FabricComparison } from '../FabricComparison';

interface FabricSelectionContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: {[key: string]: string};
  onNext: () => void;
  onPrev?: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
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

export function FabricSelectionContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {}, fabrics, mobileGuidance }: FabricSelectionContentProps) {
  const FABRICS = fabrics && fabrics.length > 0 ? fabrics : FALLBACK_FABRICS;
  const selectedFabric = FABRICS.find(f => f.id === config.fabricType);
  const stepStartTime = useRef(Date.now());
  const [comparisonOpen, setComparisonOpen] = useState(false);
  const [comparisonInitialId, setComparisonInitialId] = useState<string | undefined>(undefined);

  const openComparison = (fabricId?: string) => {
    setComparisonInitialId(fabricId || config.fabricType || FABRICS[0]?.id);
    setComparisonOpen(true);
  };

  useEffect(() => {
    analytics.stepViewed(1, 'fabric_and_color');
  }, []);

  useEffect(() => {
    console.log('[FabricSelection] Fabric type effect triggered', {
      isGuidanceActive: mobileGuidance?.isGuidanceActive,
      fabricType: config.fabricType,
      fabricColor: config.fabricColor
    });

    if (mobileGuidance?.isGuidanceActive && config.fabricType && !config.fabricColor) {
      console.log('[FabricSelection] Guiding to color section');
      mobileGuidance.scrollToElement('color-selection', 400, 80, true);
      mobileGuidance.setHighlightTarget('color-selection');
    }
  }, [config.fabricType, config.fabricColor, mobileGuidance?.isGuidanceActive]);

  useEffect(() => {
    console.log('[FabricSelection] Color effect triggered', {
      isGuidanceActive: mobileGuidance?.isGuidanceActive,
      fabricType: config.fabricType,
      fabricColor: config.fabricColor
    });

    if (mobileGuidance?.isGuidanceActive && config.fabricType && config.fabricColor) {
      console.log('[FabricSelection] Guiding to continue button');
      mobileGuidance.scrollToElement('continue-button-fabric', 400);
      mobileGuidance.setHighlightTarget('continue-button-fabric');
    }
  }, [config.fabricType, config.fabricColor, mobileGuidance?.isGuidanceActive]);

  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (!config.fabricType) {
      const timer = setTimeout(() => setShowHint(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowHint(false);
    }
  }, [config.fabricType]);

  return (
    <div className="p-6">
      {/* Fabric Type Selection */}
      <div className="mb-8">
        {showHint && !config.fabricType && (
          <div className="guidance-hint mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#BFF102]/20 border border-[#BFF102]/40 rounded-full text-xs font-medium text-[#01312D]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#307C31] animate-pulse" />
            Tap to select your fabric material
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h4 className="text-lg font-semibold text-[#01312D]">
            <a
              href="https://shadespace.com/pages/our-fabrics"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#01312D] hover:text-[#307C31] transition-colors"
            >
              Fabric Material
            </a>
          </h4>
          <button
            type="button"
            onClick={() => openComparison()}
            className="inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#01312D] border border-[#01312D] hover:bg-[#01312D] hover:text-white px-3 py-1.5 rounded-full transition-colors"
          >
            <GitCompare className="w-3.5 h-3.5" />
            Compare Fabrics
          </button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {FABRICS.map((fabric) => {
            const isSelected = config.fabricType === fabric.id;
            const hasError = validationErrors.fabricType && !config.fabricType;

            return (
              <Card
                key={fabric.id}
                className={`relative h-full flex flex-col p-3 md:p-3 lg:p-3 cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? '!border-2 !border-[#01312D] !ring-2 !ring-[#01312D] shadow-xl transform scale-105'
                    : hasError
                    ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600 hover:shadow-lg'
                    : 'hover:border-[#307C31] hover:shadow-lg'
                }`}
                onClick={() => {
                  analytics.fabricTypeSelected(fabric.id, fabric.label);
                  updateConfig({
                    fabricType: fabric.id,
                    fabricColor: ''
                  });
                }}
              >
                <div className="text-center flex flex-col h-full">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2 min-w-0">
                    <h5 className="font-semibold text-[#01312D] text-sm md:text-[15px] lg:text-sm leading-tight break-words">
                      {fabric.label}
                    </h5>
                    {fabric.isFireRetardant && (
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md">
                        FR
                      </span>
                    )}
                    <Tooltip
                      onOpen={() => analytics.fabricDetailsViewed(fabric.id)}
                      content={
                        <div className="max-w-lg">
                          <div className="mb-3">
                            <a
                              href="https://shadespace.com/pages/our-fabrics"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 bg-[#BFF102] text-[#01312D] text-xs font-bold rounded-full shadow-sm hover:bg-[#caee41] transition-colors"
                              onClick={() => analytics.fabricLinkClicked(fabric.id, 'https://shadespace.com/pages/our-fabrics')}
                            >
                              View All Fabrics
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                              </svg>
                            </a>
                          </div>
                          <div>
                            <h4 className="font-bold text-[#01312D] mb-2">
                              {fabric.label}
                            </h4>
                            <div className="grid grid-cols-2 gap-3 mb-3 p-3 bg-[#F3FFE3] rounded-lg">
                              <div>
                                <div className="text-xs text-[#01312D]/60 mb-1">Weight</div>
                                <div className="font-semibold text-[#01312D]">{fabric.weightPerSqm} g/m²</div>
                              </div>
                              <div>
                                <div className="text-xs text-[#01312D]/60 mb-1">Warranty</div>
                                <div className="font-semibold text-[#01312D]">
                                  <a
                                    href="https://shadespace.com/pages/warranty"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="hover:underline"
                                  >
                                    {fabric.warrantyYears} Years
                                  </a>
                                </div>
                              </div>
                            </div>
                            <p className="text-sm text-[#01312D]/80 mb-3 leading-relaxed">
                              {fabric.detailedDescription}
                            </p>

                            {fabric.isFireRetardant && (
                              <div className="flex items-center justify-center mb-3">
                                <img
                                  src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Fire_Retardant.png?v=1755470964"
                                  alt="Fire Retardant Certified"
                                  className="w-12 h-12 mr-2"
                                />
                                <p className="text-xs text-[#01312D] font-semibold">
                                  Fire Retardant Certified
                                </p>
                              </div>
                            )}

                            <AccordionItem trigger="Learn More" defaultOpen={false}>
                              <div className="space-y-3 mt-2">
                                <div>
                                  <h5 className="font-semibold text-[#01312D] mb-1">Made In:</h5>
                                  <p className="text-sm text-[#01312D]/80">{fabric.madeIn}</p>
                                </div>

                                <div>
                                  <h5 className="font-semibold text-[#01312D] mb-1">Key Benefits:</h5>
                                  <ul className="text-xs text-[#01312D]/70 space-y-1">
                                    {fabric.benefits
                                      .filter(benefit => !benefit.toLowerCase().includes('uv protection'))
                                      .map((benefit, index) => (
                                        <li key={index}>• {benefit}</li>
                                    ))}
                                    <li>• Sewn with SolarFix® PTFE thread</li>
                                  </ul>
                                </div>

                                <div>
                                  <h5 className="font-semibold text-[#01312D] mb-1">Best For:</h5>
                                  <ul className="text-xs text-[#01312D]/70 space-y-1">
                                    {fabric.bestFor.map((use, index) => (
                                      <li key={index}>• {use}</li>
                                    ))}
                                  </ul>
                                </div>
                              </div>
                            </AccordionItem>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                openComparison(fabric.id);
                              }}
                              className="mt-3 inline-flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-white bg-[#01312D] hover:bg-[#307C31] px-3 py-2 rounded-full transition-colors"
                            >
                              <GitCompare className="w-3.5 h-3.5" />
                              Compare all fabrics
                            </button>
                          </div>

                        </div>
                      }
                    >
                      <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                        ?
                      </span>
                    </Tooltip>
                  </div>
                  <div className="mb-2">
                    {fabric.badgeText && (
                      <span className="bg-[#BFF102] text-[#01312D] text-xs font-bold px-2 py-0.5 rounded shadow-md">
                        {fabric.badgeText}
                      </span>
                    )}
                  </div>
                  <p className="text-xs lg:text-[13px] text-[#01312D]/70 mb-2 md:mb-3 line-clamp-3 leading-snug flex-1">
                    {fabric.description}
                  </p>
                  <div className={`hidden md:block rounded-lg p-2 lg:px-2.5 lg:py-2 transition-all duration-300 mt-auto ${
                    isSelected
                     ? 'bg-gradient-to-r from-[#01312D] to-[#307C31]'
                     : 'bg-[#F3FFE3]'
                  }`}>
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <div className={`text-[10px] mb-0.5 ${
                          isSelected ? 'text-[#F3FFE3]/90' : 'text-[#01312D]/60'
                        }`}>Weight</div>
                        <div className={`font-semibold text-xs lg:text-[13px] whitespace-nowrap ${
                          isSelected ? 'text-[#F3FFE3]' : 'text-[#01312D]'
                        }`}>{fabric.weightPerSqm} g/m²</div>
                      </div>
                      <div className="min-w-0 text-right">
                        <div className={`text-[10px] mb-0.5 ${
                          isSelected ? 'text-[#F3FFE3]/90' : 'text-[#01312D]/60'
                        }`}>Warranty</div>
                        <div className={`font-semibold text-xs lg:text-[13px] whitespace-nowrap ${
                          isSelected ? 'text-[#F3FFE3]' : 'text-[#01312D]'
                        }`}>
                          <a
                            href="https://shadespace.com/pages/warranty"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            {fabric.warrantyYears} Years
                          </a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Color Selection */}
      {selectedFabric && (
        <div className="mb-8" id="color-selection" data-guidance-id="color-selection">
          <div className={`flex items-center gap-2 mb-4 px-2 py-1 -mx-2 rounded-lg transition-all duration-300 ${
            mobileGuidance?.currentHighlightTarget === 'color-selection' ? 'bg-[#BFF102]/10' : ''
          }`}>
            <h4 className={`text-lg font-semibold ${
              mobileGuidance?.currentHighlightTarget === 'color-selection' ? 'shiny-text-guidance' : 'text-[#01312D]'
            }`}>
              Choose Color
            </h4>
            <Tooltip
              content={
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Shade Factor (SF %)</h4>
                  <p className="text-sm text-slate-600 mb-3">
                    The Shade Factor percentage indicates how much sunlight the fabric blocks. 
                    Higher percentages provide more shade and UV protection.
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between">
                      <span>70-80% SF:</span>
                      <span className="text-slate-500">Light filtering</span>
                    </div>
                    <div className="flex justify-between">
                      <span>80-90% SF:</span>
                      <span className="text-slate-500">Good shade</span>
                    </div>
                    <div className="flex justify-between">
                      <span>90%+ SF:</span>
                      <span className="text-slate-500">Maximum shade</span>
                    </div>
                  </div>
                </div>
              }
            >
              <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31]">
                ?
              </span>
            </Tooltip>
          </div>
          {/* Dynamic Info Message for Extrablock 330 */}
          {selectedFabric.isFireRetardant && (
            <div className="mb-4 p-3 bg-[#F3FFE3] border border-[#307C31] rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#307C31] flex-shrink-0" />
                <p className="text-sm text-[#01312D]">
                  <strong>Important:</strong> Not all {selectedFabric.label} colors are fire retardant. Look for the <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">FR Fabric</span> badge for certified colors, or the <span className="bg-slate-300 text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded">Standard</span> badge for non-FR colors.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {selectedFabric.colors.map((color) => {
              const isSelected = config.fabricColor === color.name;
              const hasError = validationErrors.fabricColor && !config.fabricColor;
              
              return (
                <div
                  key={color.name}
                  className="relative group"
                >
                  <button
                    onClick={() => {
                      analytics.fabricColorSelected(config.fabricType, color.name, color.shadeFactor);
                      updateConfig({ fabricColor: color.name });
                    }}
                    className={`group p-2 rounded-lg transition-all duration-300 w-full ${
                      isSelected
                       ? 'border-2 border-[#01312D] ring-2 ring-[#01312D] shadow-md'
                        : hasError
                        ? 'ring-2 !ring-red-500 bg-red-50 hover:!ring-red-600 hover:shadow-sm'
                        : 'ring-1 ring-[#307C31]/30 hover:ring-[#01312D] hover:shadow-sm'
                    }`}
                  >
                    <div className="relative overflow-hidden">
                      <div className="relative overflow-hidden pb-[75%] rounded-lg border border-slate-300">
                        <img
                          src={color.imageUrl}
                          alt={color.name}
                          className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 ${
                            'scale-100 hover:scale-110'
                          }`}
                          loading="lazy"
                        />
                        
                        {/* Shade Factor overlay - only for Monotec 370 */}
                        {color.shadeFactor && (
                          <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="text-xs font-thin text-white bg-black bg-opacity-50 px-1 py-0.5 rounded backdrop-blur-sm">
                              SF {color.shadeFactor}%
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* FR Fabric Banner for ExtraBlock */}
                    {selectedFabric.isFireRetardant && (
                      <div className="absolute top-1 right-1">
                        {color.isFireRetardant ? (
                          <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-md">
                            FR Fabric
                          </span>
                        ) : (
                          <span className="bg-[#F3FFE3] text-[#01312D] text-xs font-bold px-1.5 py-0.5 rounded shadow-md">
                            Standard
                          </span>
                        )}
                      </div>
                    )}
                    
                    <div className="text-xs font-medium text-[#01312D] leading-tight mt-2">
                      {color.name}
                    </div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4 pt-4 border-t border-[#307C31]/30">
        <div className="flex flex-col sm:flex-row gap-4">
          {showBackButton && onPrev && (
            <Button
              variant="outline"
              size="sm"
              onClick={onPrev}
              className="sm:w-auto"
            >
              Back
            </Button>
          )}
          <div className="flex-1 flex flex-col gap-2">
            {(() => {
              const incomplete = !config.fabricType || !config.fabricColor;
              const missingItems = [];

              if (!config.fabricType) missingItems.push('fabric type');
              if (!config.fabricColor) missingItems.push('color');

              return (
                <>
                  {incomplete && (
                    <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                      <span className="flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-slate-500" />
                        <span>Please select {missingItems.join(' and ')} to continue</span>
                      </span>
                    </div>
                  )}
                  {mobileGuidance?.currentHighlightTarget === 'continue-button-fabric' && !incomplete ? (
                    <div className="energy-border-chase-btn" id="continue-button-fabric" data-guidance-id="continue-button-fabric">
                      <Button
                        onClick={() => {
                          const timeSpent = (Date.now() - stepStartTime.current) / 1000;
                          analytics.stepCompleted(1, 'fabric_and_color', timeSpent, {
                            fabric_type: config.fabricType,
                            fabric_color: config.fabricColor,
                          });
                          mobileGuidance?.clearHighlight();
                          onNext();
                        }}
                        size="md"
                        className="py-4 sm:py-2 w-full"
                      >
                        <span className="flex flex-col items-center leading-tight">
                          <span>Continue</span>
                          {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                        </span>
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={() => {
                        const timeSpent = (Date.now() - stepStartTime.current) / 1000;
                        analytics.stepCompleted(1, 'fabric_and_color', timeSpent, {
                          fabric_type: config.fabricType,
                          fabric_color: config.fabricColor,
                        });
                        mobileGuidance?.clearHighlight();
                        onNext();
                      }}
                      size="md"
                      id="continue-button-fabric"
                      data-guidance-id="continue-button-fabric"
                      className={`py-4 sm:py-2 ${incomplete ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      <span className="flex flex-col items-center leading-tight">
                        <span>Continue</span>
                        {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                      </span>
                    </Button>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      <FabricComparison
        fabrics={FABRICS}
        open={comparisonOpen}
        onClose={() => setComparisonOpen(false)}
        initialFabricId={comparisonInitialId}
        onSelectFabric={(id) => {
          analytics.fabricTypeSelected(id, FABRICS.find(f => f.id === id)?.label || id);
          updateConfig({ fabricType: id, fabricColor: '' });
        }}
      />
    </div>
  );
}
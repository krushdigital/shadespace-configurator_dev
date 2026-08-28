import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getPortalRoot } from '../../utils/appScope';
import { ConfiguratorState, Fabric } from '../../types';
import { FABRICS as FALLBACK_FABRICS } from '../../data/fabrics';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { Tooltip } from '../ui/Tooltip';
import { AccordionItem } from '../ui/AccordionItem';
import { Info, AlertCircle, GitCompare, ZoomIn, X } from 'lucide-react';
import { analytics } from '../../utils/analytics';
import { FabricComparison } from '../FabricComparison';
import { SaveProgressButton } from '../SaveProgressButton';
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

const EDGE_OPTIONS = [
  {
    id: 'cabled',
    label: 'Cabled Edge',
    description: 'Strongest and sleekest -- best for permanent installations.',
    longDescription: 'Experience superior durability and a sleek finish with our Cabled Edge reinforcement. A marine-grade stainless steel cable is expertly integrated along the entire perimeter of the shade sail, allowing for precise tensioning during installation. Each corner features uniquely styled stainless steel D-rings, which not only securely house the cable but also contribute to an exceptionally professional appearance and enormous structural strength.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Wire_Edge.Configurator.webp?v=1784063875',
  },
  {
    id: 'webbing',
    label: 'Webbing Reinforced',
    description: 'Easiest to install -- ideal for DIY projects.',
    longDescription: 'Our webbing-reinforced design incorporates a unique method, utilizing an exceptionally strong 48mm (2-inch) polyester webbing expertly integrated within the hemline. This webbing is meticulously pre-set and pre-sewn, ensuring optimal tension is achieved effortlessly once the sail is fully stretched into position. This innovative approach guarantees a hassle-free on-site installation: simply tension from each fixing point and enjoy your perfectly taut shade sail.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Webbing_Edge.Configurator.webp?v=1784063875',
  },
];

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
  const [showFabricHint, setShowFabricHint] = useState(false);
  const [showEdgeHint, setShowEdgeHint] = useState(false);

  useBodyScrollLock(!!enlargedImage);

  const openComparison = (fabricId?: string) => {
    setComparisonInitialId(fabricId || config.fabricType || FABRICS[0]?.id);
    setComparisonOpen(true);
  };

  useEffect(() => {
    analytics.stepViewed(1, 'material_and_finish');
  }, []);

  // Mobile guidance: fabric type → color → edge → continue
  useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && config.fabricType && !config.fabricColor) {
      mobileGuidance.scrollToElement('color-selection', 400, 140, true);
      mobileGuidance.setHighlightTarget('color-selection');
    }
  }, [config.fabricType, config.fabricColor, mobileGuidance?.isGuidanceActive]);

  useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && config.fabricType && config.fabricColor && !config.edgeType) {
      mobileGuidance.scrollToElement('edge-finish-section', 400, 80, true);
      mobileGuidance.setHighlightTarget('edge-finish-section');
    }
  }, [config.fabricType, config.fabricColor, config.edgeType, mobileGuidance?.isGuidanceActive]);

  useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && config.fabricType && config.fabricColor && config.edgeType) {
      mobileGuidance.scrollToElement('continue-button-material', 400);
      mobileGuidance.setHighlightTarget('continue-button-material');
    }
  }, [config.fabricType, config.fabricColor, config.edgeType, mobileGuidance?.isGuidanceActive]);

  // Hints
  useEffect(() => {
    if (isStepOpen && !config.fabricType) {
      const timer = setTimeout(() => setShowFabricHint(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowFabricHint(false);
    }
  }, [config.fabricType, isStepOpen]);

  useEffect(() => {
    if (config.fabricColor && !config.edgeType) {
      const timer = setTimeout(() => setShowEdgeHint(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowEdgeHint(false);
    }
  }, [config.fabricColor, config.edgeType]);

  // Escape to close enlarged image
  useEffect(() => {
    if (!enlargedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEnlargedImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enlargedImage]);

  const isComplete = !!config.fabricType && !!config.fabricColor && !!config.edgeType;
  const showEdgeSection = !!config.fabricColor;

  return (
    <div className="p-6">
      {/* ── Fabric Type Selection ── */}
      <div className="mb-8">
        {showFabricHint && !config.fabricType && (
          <div className="guidance-hint mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#eef5ef] border border-[#7bb08f] rounded-full text-xs font-medium text-[#23503f]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d4f] animate-pulse" />
            Tap to select your fabric material
          </div>
        )}
        <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
          <h4 className="text-lg font-semibold text-[#01312D]">
            <a href="https://shadespace.com/pages/our-fabrics" target="_blank" rel="noopener noreferrer" className="text-[#01312D] hover:text-[#2e7d4f] transition-colors">
              Fabric Material
            </a>
          </h4>
          {/* Compare Fabrics: hidden on mobile, shown beside heading on desktop */}
          <button
            type="button"
            onClick={() => openComparison()}
            className="hidden sm:inline-flex items-center gap-1.5 text-xs md:text-sm font-semibold text-[#01312D] border border-[#01312D] hover:bg-[#01312D] hover:text-white px-3 py-1.5 rounded-full transition-colors"
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
                className={`relative h-full flex flex-col p-3 cursor-pointer transition-all duration-300 ${
                  isSelected
                    ? '!border-2 !border-[#01312D] !ring-2 !ring-[#01312D] shadow-xl transform scale-105'
                    : hasError
                    ? 'border-2 !border-red-500 bg-red-50 hover:!border-red-600 hover:shadow-lg'
                    : 'hover:border-[#7bb08f] hover:shadow-lg'
                }`}
                onClick={() => {
                  analytics.fabricTypeSelected(fabric.id, fabric.label);
                  updateConfig({ fabricType: fabric.id, fabricColor: '' });
                }}
              >
                <div className="text-center flex flex-col h-full">
                  <div className="flex items-center justify-center gap-1.5 flex-wrap mb-2 min-w-0">
                    <h5 className="font-semibold text-[#01312D] text-sm md:text-[15px] lg:text-sm leading-tight break-words">{fabric.label}</h5>
                    {fabric.isFireRetardant && (
                      <span className="bg-orange-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded shadow-md">FR</span>
                    )}
                    <Tooltip
                      onOpen={() => analytics.fabricDetailsViewed(fabric.id)}
                      content={
                        <div className="max-w-lg">
                          <div className="mb-3">
                            <a href="https://shadespace.com/pages/our-fabrics" target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1 bg-[#BFF102] text-[#01312D] text-xs font-bold rounded-full shadow-sm hover:bg-[#caee41] transition-colors" onClick={() => analytics.fabricLinkClicked(fabric.id, 'https://shadespace.com/pages/our-fabrics')}>
                              View All Fabrics
                              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-3 h-3 ml-1"><path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" /></svg>
                            </a>
                          </div>
                          <div>
                            <h4 className="font-bold text-[#01312D] mb-2">{fabric.label}</h4>
                            <div className={`grid ${fabric.id === 'monotec370' ? 'grid-cols-3' : 'grid-cols-2'} gap-3 mb-3 p-3 bg-[#F3FFE3] rounded-lg`}>
                              <div>
                                <div className="text-xs text-[#01312D]/60 mb-1">Weight</div>
                                <div className="font-semibold text-[#01312D]">{fabric.weightPerSqm} g/m²</div>
                              </div>
                              <div>
                                <div className="text-xs text-[#01312D]/60 mb-1">Warranty</div>
                                <div className="font-semibold text-[#01312D]">
                                  <a href="https://shadespace.com/pages/warranty" target="_blank" rel="noopener noreferrer" className="hover:underline">{fabric.warrantyYears} Years</a>
                                </div>
                              </div>
                              {fabric.id === 'monotec370' && (
                                <div>
                                  <div className="text-xs text-[#01312D]/60 mb-1">Wind rating</div>
                                  <div className="font-semibold text-[#01312D]">85 mph</div>
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-[#01312D]/80 mb-3 leading-relaxed">{fabric.detailedDescription}</p>
                            {fabric.isFireRetardant && (
                              <div className="flex items-center justify-center mb-3">
                                <img src="https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Fire_Retardant.png?v=1755470964" alt="Fire Retardant Certified" className="w-12 h-12 mr-2" />
                                <p className="text-xs text-[#01312D] font-semibold">Fire Retardant Certified</p>
                              </div>
                            )}
                            <AccordionItem trigger="Learn More" defaultOpen={false}>
                              <div className="space-y-3 mt-2">
                                <div><h5 className="font-semibold text-[#01312D] mb-1">Made In:</h5><p className="text-sm text-[#01312D]/80">{fabric.madeIn}</p></div>
                                <div><h5 className="font-semibold text-[#01312D] mb-1">Key Benefits:</h5><ul className="text-xs text-[#01312D]/70 space-y-1">{fabric.benefits.filter(b => !b.toLowerCase().includes('uv protection')).map((b, i) => <li key={i}>• {b}</li>)}<li>• Sewn with SolarFix® PTFE thread</li></ul></div>
                                <div><h5 className="font-semibold text-[#01312D] mb-1">Best For:</h5><ul className="text-xs text-[#01312D]/70 space-y-1">{fabric.bestFor.map((u, i) => <li key={i}>• {u}</li>)}</ul></div>
                              </div>
                            </AccordionItem>
                            <button type="button" onClick={(e) => { e.stopPropagation(); openComparison(fabric.id); }} className="mt-3 inline-flex items-center justify-center gap-1.5 w-full text-xs font-semibold text-white bg-[#2e7d4f] hover:bg-[#01312d] px-3 py-2 rounded-full transition-colors">
                              <GitCompare className="w-3.5 h-3.5" />Compare all fabrics
                            </button>
                          </div>
                        </div>
                      }
                    >
                      <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#2e7d4f] text-white rounded-full cursor-help hover:bg-[#01312d]">?</span>
                    </Tooltip>
                  </div>
                  <div className="mb-2">
                    {fabric.badgeText && <span className="bg-[#BFF102] text-[#01312D] text-xs font-bold px-2 py-0.5 rounded shadow-md">{fabric.badgeText}</span>}
                  </div>
                  <p className="text-xs lg:text-[13px] text-[#01312D]/70 mb-2 md:mb-3 line-clamp-3 leading-snug flex-1">{fabric.description}</p>
                  <div className={`hidden md:block rounded-lg p-2 lg:px-2.5 lg:py-2 transition-all duration-300 mt-auto ${isSelected ? 'bg-gradient-to-r from-[#01312D] to-[#2e7d4f]' : 'bg-[#eef5ef]'}`}>
                    <div className="flex justify-between items-center gap-2">
                      <div className="min-w-0">
                        <div className={`text-[10px] mb-0.5 ${isSelected ? 'text-[#F3FFE3]/90' : 'text-[#01312D]/60'}`}>Weight</div>
                        <div className={`font-semibold text-xs lg:text-[13px] whitespace-nowrap ${isSelected ? 'text-[#F3FFE3]' : 'text-[#01312D]'}`}>{fabric.weightPerSqm} g/m²</div>
                      </div>
                      {fabric.id === 'monotec370' && (
                        <div className="min-w-0 text-center">
                          <div className={`text-[10px] mb-0.5 ${isSelected ? 'text-[#F3FFE3]/90' : 'text-[#01312D]/60'}`}>Wind rating</div>
                          <div className={`font-semibold text-xs lg:text-[13px] whitespace-nowrap ${isSelected ? 'text-[#F3FFE3]' : 'text-[#01312D]'}`}>85 mph</div>
                        </div>
                      )}
                      <div className="min-w-0 text-right">
                        <div className={`text-[10px] mb-0.5 ${isSelected ? 'text-[#F3FFE3]/90' : 'text-[#01312D]/60'}`}>Warranty</div>
                        <div className={`font-semibold text-xs lg:text-[13px] whitespace-nowrap ${isSelected ? 'text-[#F3FFE3]' : 'text-[#01312D]'}`}>
                          <a href="https://shadespace.com/pages/warranty" target="_blank" rel="noopener noreferrer" className="hover:underline">{fabric.warrantyYears} Years</a>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        {/* Compare Fabrics: shown below grid on mobile only */}
        <button
          type="button"
          onClick={() => openComparison()}
          className="sm:hidden mt-4 w-full inline-flex items-center justify-center gap-1.5 text-sm font-semibold text-[#01312D] border border-[#01312D] hover:bg-[#01312D] hover:text-white px-3 py-2.5 rounded-full transition-colors"
        >
          <GitCompare className="w-4 h-4" />
          Compare Fabrics
        </button>
      </div>

      {/* ── Color Selection ── */}
      {selectedFabric && (
        <div className="mb-8" id="color-selection" data-guidance-id="color-selection">
          <div className={`flex items-center gap-2 mb-4 px-2 py-1 -mx-2 rounded-lg transition-all duration-300 ${mobileGuidance?.currentHighlightTarget === 'color-selection' ? 'bg-[#BFF102]/10' : ''}`}>
            <h4 className={`text-lg font-semibold ${mobileGuidance?.currentHighlightTarget === 'color-selection' ? 'shiny-text-guidance' : 'text-[#01312D]'}`}>Choose Color</h4>
            <Tooltip
              content={
                <div>
                  <h4 className="font-bold text-slate-900 mb-2">Shade Factor (SF %)</h4>
                  <p className="text-sm text-slate-600 mb-3">The Shade Factor percentage indicates how much sunlight the fabric blocks. Higher percentages provide more shade and UV protection.</p>
                  <div className="space-y-2 text-xs">
                    <div className="flex justify-between"><span>70-80% SF:</span><span className="text-slate-500">Light filtering</span></div>
                    <div className="flex justify-between"><span>80-90% SF:</span><span className="text-slate-500">Good shade</span></div>
                    <div className="flex justify-between"><span>90%+ SF:</span><span className="text-slate-500">Maximum shade</span></div>
                  </div>
                </div>
              }
            >
              <span className="w-4 h-4 inline-flex items-center justify-center text-xs bg-[#2e7d4f] text-white rounded-full cursor-help hover:bg-[#01312d]">?</span>
            </Tooltip>
          </div>
          {selectedFabric.isFireRetardant && (
            <div className="mb-4 p-3 bg-[#eef5ef] border border-[#2e7d4f] rounded-lg">
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4 text-[#2e7d4f] flex-shrink-0" />
                <p className="text-sm text-[#01312D]">
                  <strong>Important:</strong> Not all {selectedFabric.label} colors are fire retardant. Look for the <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded">FR Fabric</span> badge for certified colors, or the <span className="bg-slate-300 text-slate-700 text-xs font-bold px-1.5 py-0.5 rounded">Standard</span> badge for non-FR colors.
                </p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {selectedFabric.colors.map((color) => {
              const isColorSelected = config.fabricColor === color.name;
              const hasColorError = validationErrors.fabricColor && !config.fabricColor;
              return (
                <div key={color.name} className="relative group">
                  <button
                    onClick={() => {
                      analytics.fabricColorSelected(config.fabricType, color.name, color.shadeFactor);
                      updateConfig({ fabricColor: color.name });
                    }}
                    className={`group p-2 rounded-lg transition-all duration-300 w-full ${
                      isColorSelected
                        ? 'border-2 border-[#01312D] ring-2 ring-[#01312D] shadow-md'
                        : hasColorError
                        ? 'ring-2 !ring-red-500 bg-red-50 hover:!ring-red-600 hover:shadow-sm'
                        : 'ring-1 ring-[#2e7d4f]/30 hover:ring-[#01312D] hover:shadow-sm'
                    }`}
                  >
                    <div className="relative overflow-hidden">
                      <div className="relative overflow-hidden pb-[75%] rounded-lg border border-slate-300">
                        <img src={color.imageUrl} alt={color.name} className="absolute inset-0 w-full h-full object-cover transition-all duration-300 scale-100 hover:scale-110" loading="lazy" />
                        {color.shadeFactor && (
                          <div className="absolute bottom-1 left-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span className="text-xs font-thin text-white bg-black bg-opacity-50 px-1 py-0.5 rounded backdrop-blur-sm">SF {color.shadeFactor}%</span>
                          </div>
                        )}
                      </div>
                      {/* Accessibility checkmark overlay for selected color */}
                      {isColorSelected && (
                        <div className="absolute top-1 left-1 w-5 h-5 rounded-full bg-[#2e7d4f] flex items-center justify-center shadow">
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                        </div>
                      )}
                    </div>
                    {selectedFabric.isFireRetardant && (
                      <div className="absolute top-1 right-1">
                        {color.isFireRetardant ? (
                          <span className="bg-orange-500 text-white text-xs font-bold px-1.5 py-0.5 rounded shadow-md">FR Fabric</span>
                        ) : (
                          <span className="bg-[#F3FFE3] text-[#01312D] text-xs font-bold px-1.5 py-0.5 rounded shadow-md">Standard</span>
                        )}
                      </div>
                    )}
                    <div className="text-xs font-medium text-[#01312D] leading-tight mt-2">{color.name}</div>
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Edge Finish Section (revealed after color is chosen) ── */}
      <div
        id="edge-finish-section"
        data-guidance-id="edge-finish-section"
        className={`overflow-hidden transition-all duration-500 ease-in-out ${showEdgeSection ? 'max-h-[2000px] opacity-100 mb-6' : 'max-h-0 opacity-0'}`}
      >
        <div className="pt-6 border-t border-[#dfe7e1]">
          {showEdgeHint && !config.edgeType && (
            <div className="guidance-hint mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#eef5ef] border border-[#7bb08f] rounded-full text-xs font-medium text-[#23503f]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d4f] animate-pulse" />
              Choose your preferred edge finish
            </div>
          )}
          <h4 className={`text-lg font-semibold mb-1 ${!config.edgeType && mobileGuidance?.isGuidanceActive ? 'shiny-text-guidance' : 'text-[#01312D]'}`}>
            Edge Finish
          </h4>
          <p className="text-sm text-slate-500 mb-4">Strongest and sleekest, or easiest to install?</p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
            {EDGE_OPTIONS.map((edge) => {
              const hasEdgeError = validationErrors.edgeType && !config.edgeType;
              const isEdgeSelected = config.edgeType === edge.id;
              return (
                <div
                  key={edge.id}
                  onClick={() => updateConfig({ edgeType: edge.id })}
                  className={`group relative bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col ${
                    isEdgeSelected
                      ? 'border-2 border-[#01312D] shadow-md'
                      : hasEdgeError
                      ? 'border-2 border-red-500 bg-red-50'
                      : 'border border-[#dfe7e1] hover:border-[#7bb08f] hover:shadow-md'
                  }`}
                >
                  <div className="relative p-3 pb-0">
                    <div className="relative rounded-xl overflow-hidden bg-[#F3FFE3]/60 aspect-[16/9]">
                      <img src={edge.imageUrl} alt={`${edge.label} example`} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]" />
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setEnlargedImage({ url: edge.imageUrl, label: edge.label }); }}
                        className="absolute top-2.5 right-2.5 w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white/95 text-[#01312d] shadow-sm hover:bg-white hover:text-[#2e7d4f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2e7d4f]"
                        aria-label={`Enlarge ${edge.label} image`}
                      >
                        <ZoomIn className="w-4 h-4" strokeWidth={2.25} />
                      </button>
                    </div>
                  </div>
                  <div className="flex items-start justify-between gap-3 p-4 pt-3.5">
                    <div className="flex-1 min-w-0">
                      <h5 className="font-bold text-[#01312D] text-base md:text-lg leading-tight mb-1">{edge.label}</h5>
                      <p className="text-sm text-[#6b8478] leading-relaxed">{edge.description}</p>
                    </div>
                    <Tooltip
                      content={
                        <div>
                          <p className="text-sm text-[#6b8478] font-medium mb-1">{edge.label}</p>
                          <p className="text-sm text-slate-500">{edge.longDescription}</p>
                          <p className="mt-3 text-sm">
                            <a href="https://shadespace.com/pages/styles" target="_blank" rel="noopener noreferrer" className="font-semibold text-[#2e7d4f] hover:text-[#01312D] hover:underline transition-colors">Learn more about our styles &rarr;</a>
                          </p>
                        </div>
                      }
                    >
                      <span onClick={(e) => e.stopPropagation()} className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center text-xs font-semibold bg-[#2e7d4f] text-white rounded-full cursor-help hover:bg-[#01312d] transition-colors">?</span>
                    </Tooltip>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Navigation Footer ── */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[#dfe7e1]">
        <div className="flex sm:hidden flex-col gap-3">
          <div className="flex gap-3">
            {showBackButton && onPrev && <Button variant="outline" size="md" onClick={onPrev} className="flex-1">Back</Button>}
            {onSaveQuote && <SaveProgressButton onClick={onSaveQuote} className="flex-1" />}
          </div>
          {!isComplete && (
            <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
              <span className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-500" />
                <span>Please select {[!config.fabricType && 'fabric', !config.fabricColor && 'color', !config.edgeType && 'edge finish'].filter(Boolean).join(', ')} to continue</span>
              </span>
            </div>
          )}
          {mobileGuidance?.currentHighlightTarget === 'continue-button-material' && isComplete ? (
            <div className="energy-border-chase-btn w-full" id="continue-button-material" data-guidance-id="continue-button-material">
              <Button onClick={() => { const t = (Date.now() - stepStartTime.current) / 1000; analytics.stepCompleted(1, 'material_and_finish', t, { fabric_type: config.fabricType, fabric_color: config.fabricColor, edge_type: config.edgeType }); mobileGuidance?.clearHighlight(); onNext(); }} size="md" className="w-full py-4 sm:py-2">
                <span className="flex flex-col items-center leading-tight"><span>Continue</span>{nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}</span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => { const t = (Date.now() - stepStartTime.current) / 1000; analytics.stepCompleted(1, 'material_and_finish', t, { fabric_type: config.fabricType, fabric_color: config.fabricColor, edge_type: config.edgeType }); mobileGuidance?.clearHighlight(); onNext(); }}
              size="md" id="continue-button-material" data-guidance-id="continue-button-material"
              className={`w-full py-4 sm:py-2 ${!isComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="flex flex-col items-center leading-tight"><span>Continue</span>{nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}</span>
            </Button>
          )}
        </div>

        <div className="hidden sm:flex gap-4">
          {showBackButton && onPrev && <Button variant="outline" size="md" onClick={onPrev} className="w-auto">Back</Button>}
          {onSaveQuote && <SaveProgressButton onClick={onSaveQuote} className="w-auto" />}
          <div className="flex-1 flex flex-col gap-2">
            {!isComplete && (
              <div className="text-xs text-slate-600 bg-slate-50 px-3 py-2 rounded-lg border border-slate-200">
                <span className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-slate-500" />
                  <span>Please select {[!config.fabricType && 'fabric', !config.fabricColor && 'color', !config.edgeType && 'edge finish'].filter(Boolean).join(', ')} to continue</span>
                </span>
              </div>
            )}
            {mobileGuidance?.currentHighlightTarget === 'continue-button-material' && isComplete ? (
              <div className="energy-border-chase-btn flex-1" id="continue-button-material" data-guidance-id="continue-button-material">
                <Button onClick={() => { const t = (Date.now() - stepStartTime.current) / 1000; analytics.stepCompleted(1, 'material_and_finish', t, { fabric_type: config.fabricType, fabric_color: config.fabricColor, edge_type: config.edgeType }); mobileGuidance?.clearHighlight(); onNext(); }} size="md" className="w-full">
                  <span className="flex flex-col items-center leading-tight"><span>Continue</span>{nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}</span>
                </Button>
              </div>
            ) : (
              <Button
                onClick={() => { const t = (Date.now() - stepStartTime.current) / 1000; analytics.stepCompleted(1, 'material_and_finish', t, { fabric_type: config.fabricType, fabric_color: config.fabricColor, edge_type: config.edgeType }); mobileGuidance?.clearHighlight(); onNext(); }}
                size="md" id="continue-button-material" data-guidance-id="continue-button-material"
                className={`flex-1 ${!isComplete ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="flex flex-col items-center leading-tight"><span>Continue</span>{nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Enlarged image portal */}
      {enlargedImage && typeof document !== 'undefined' &&
        createPortal(
          <div data-lenis-prevent className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]" onClick={() => setEnlargedImage(null)} role="dialog" aria-modal="true" aria-label={`${enlargedImage.label} enlarged image`}>
            <button type="button" onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }} className="absolute top-4 right-4 w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors" aria-label="Close enlarged image"><X className="w-5 h-5" /></button>
            <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
              <img src={enlargedImage.url} alt={`${enlargedImage.label} - enlarged view`} className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white" />
              <p className="mt-3 text-center text-white font-semibold text-lg">{enlargedImage.label}</p>
            </div>
          </div>,
          getPortalRoot()
        )}

      <FabricComparison fabrics={FABRICS} open={comparisonOpen} onClose={() => setComparisonOpen(false)} initialFabricId={comparisonInitialId} onSelectFabric={(id) => { analytics.fabricTypeSelected(id, FABRICS.find(f => f.id === id)?.label || id); updateConfig({ fabricType: id, fabricColor: '' }); }} />
    </div>
  );
}

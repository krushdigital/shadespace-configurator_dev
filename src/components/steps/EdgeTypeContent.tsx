import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getPortalRoot } from '../../utils/appScope';
import { X, ZoomIn, Shield, Zap, Info } from 'lucide-react';
import { ConfiguratorState } from '../../types';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { SaveProgressButton } from '../SaveProgressButton';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { analytics } from '../../utils/analytics';

interface EdgeTypeContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: {[key: string]: string};
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  isStepOpen?: boolean;
  onSaveQuote?: () => void;
  mobileGuidance?: {
    isGuidanceActive: boolean;
    currentHighlightTarget: string | null;
    scrollToElement: (elementId: string, delay?: number, offset?: number) => void;
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
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Wire_Edge.Configurator.webp?v=1784063875'
  },
  {
    id: 'webbing',
    label: 'Webbing Reinforced',
    description: 'Easiest to install -- ideal for DIY projects.',
    longDescription: 'Our webbing-reinforced design incorporates a unique method, utilizing an exceptionally strong 48mm (2-inch) polyester webbing expertly integrated within the hemline. This webbing is meticulously pre-set and pre-sewn, ensuring optimal tension is achieved effortlessly once the sail is fully stretched into position. This innovative approach guarantees a hassle-free on-site installation: simply tension from each fixing point and enjoy your perfectly taut shade sail.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Webbing_Edge.Configurator.webp?v=1784063875'
  }
];

function getPerimeterMm(measurements: Record<string, number>, corners: number): number {
  const edgeKeys: string[] = [];
  const labels = 'ABCDEFGH';
  for (let i = 0; i < corners; i++) {
    edgeKeys.push(labels[i] + labels[(i + 1) % corners]);
  }
  let total = 0;
  for (const key of edgeKeys) {
    total += measurements[key] || 0;
  }
  return total;
}

type Recommendation = 'cabled' | 'webbing' | 'either';

function getRecommendation(perimeterMm: number): Recommendation {
  if (perimeterMm <= 0) return 'either';
  const perimeterM = perimeterMm / 1000;
  if (perimeterM >= 40) return 'cabled';
  if (perimeterM <= 10) return 'webbing';
  return 'either';
}

export function EdgeTypeContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {}, isStepOpen = true, onSaveQuote, mobileGuidance }: EdgeTypeContentProps) {
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; label: string } | null>(null);
  const stepStartTime = useRef(Date.now());

  useBodyScrollLock(!!enlargedImage);

  useEffect(() => {
    analytics.stepViewed(5, 'edge_style');
  }, []);

  useEffect(() => {
    if (!enlargedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEnlargedImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enlargedImage]);

  useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && config.edgeType) {
      mobileGuidance.scrollToElement('continue-button-edge', 400);
      mobileGuidance.setHighlightTarget('continue-button-edge');
    }
  }, [config.edgeType, mobileGuidance?.isGuidanceActive]);

  const [showHint, setShowHint] = useState(false);

  useEffect(() => {
    if (isStepOpen && !config.edgeType) {
      const timer = setTimeout(() => setShowHint(true), 600);
      return () => clearTimeout(timer);
    } else {
      setShowHint(false);
    }
  }, [config.edgeType, isStepOpen]);

  const perimeterMm = useMemo(
    () => getPerimeterMm(config.measurements || {}, config.corners || 0),
    [config.measurements, config.corners]
  );
  const recommendation = useMemo(() => getRecommendation(perimeterMm), [perimeterMm]);

  // Auto-select only when there is a clear recommendation (not "either")
  const hasAutoSelected = useRef(false);
  useEffect(() => {
    if (!config.edgeType && !hasAutoSelected.current && isStepOpen && recommendation !== 'either') {
      hasAutoSelected.current = true;
      updateConfig({ edgeType: recommendation });
    }
  }, [recommendation, config.edgeType, isStepOpen]);

  const perimeterM = perimeterMm / 1000;

  const handleContinue = () => {
    if (!config.edgeType) return;
    const t = (Date.now() - stepStartTime.current) / 1000;
    analytics.stepCompleted(5, 'edge_style', t, { edge_type: config.edgeType, perimeter_m: Math.round(perimeterM * 10) / 10 });
    mobileGuidance?.clearHighlight();
    onNext();
  };

  return (
    <div className="p-5 sm:p-6">
      <div className="mb-6">
        {showHint && !config.edgeType && (
          <div className="guidance-hint mb-3 inline-flex items-center gap-2 px-3 py-1.5 bg-[#eef5ef] border border-[#7bb08f] rounded-full text-xs font-medium text-[#23503f]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#2e7d4f] animate-pulse" />
            Choose your preferred edge style
          </div>
        )}
        <h4 className={`text-lg font-semibold mb-1 ${
          !config.edgeType && mobileGuidance?.isGuidanceActive ? 'shiny-text-guidance' : 'text-[#01312d]'
        }`}>
          Edge Finish
        </h4>
        <p className="text-sm text-slate-500 mb-4">Strongest and sleekest, or easiest to install?</p>

        {/* Perimeter-based recommendation banner */}
        {perimeterM > 0 && recommendation === 'cabled' && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <Shield className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-900">Cabled Edge strongly recommended</p>
              <p className="text-sm text-amber-700 mt-0.5">
                Your sail has a {perimeterM.toFixed(1)}m perimeter. For sails this size, a cabled edge provides the structural strength needed to maintain shape and tension over time.
              </p>
            </div>
          </div>
        )}
        {perimeterM > 0 && recommendation === 'webbing' && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-[#eef5ef] border border-[#c5dfc9] rounded-xl">
            <Zap className="w-5 h-5 text-[#2e7d4f] flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[#1a3d2c]">Webbing Reinforced is a great choice</p>
              <p className="text-sm text-[#3d6b50] mt-0.5">
                At {perimeterM.toFixed(1)}m perimeter, your sail is well-suited to webbing reinforcement -- it's the easiest to install and gives excellent results for this size.
              </p>
            </div>
          </div>
        )}
        {perimeterM > 0 && recommendation === 'either' && (
          <div className="mb-5 flex items-start gap-3 p-4 bg-slate-50 border border-slate-200 rounded-xl">
            <Info className="w-5 h-5 text-slate-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-slate-700">Either option works well</p>
              <p className="text-sm text-slate-500 mt-0.5">
                At {perimeterM.toFixed(1)}m perimeter, both edge types are suitable. Cabled is stronger and sleeker; webbing is easier to install. Choose based on your preference.
              </p>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {EDGE_OPTIONS.map((edge) => {
            const hasError = validationErrors.edgeType && !config.edgeType;
            const isSelected = config.edgeType === edge.id;
            const isRecommended = recommendation === edge.id;

            return (
              <div
                key={edge.id}
                onClick={() => updateConfig({ edgeType: edge.id })}
                className={`group relative bg-white rounded-2xl border-2 transition-all duration-200 cursor-pointer overflow-hidden flex flex-col ${
                  isSelected
                    ? 'border-[#2e7d4f] shadow-[inset_0_0_0_1px_#2e7d4f]'
                    : hasError
                    ? 'border-red-400 bg-red-50'
                    : 'border-[#dfe7e1] hover:border-[#7bb08f] hover:shadow-md'
                }`}
              >
                {isSelected && (
                  <span className="absolute top-2 right-2 z-10 w-[22px] h-[22px] rounded-full bg-[#2e7d4f] text-white text-[13px] font-bold flex items-center justify-center">
                    &#10003;
                  </span>
                )}
                {isRecommended && !isSelected && perimeterM > 0 && (
                  <span className="absolute top-2 left-2 z-10 px-2 py-0.5 rounded-full bg-[#2e7d4f] text-white text-[10px] font-bold uppercase tracking-wide">
                    Recommended
                  </span>
                )}
                <div className="relative p-3 pb-0">
                  <div className="relative rounded-xl overflow-hidden bg-[#eef5ef] aspect-[16/9]">
                    <img
                      src={edge.imageUrl}
                      alt={`${edge.label} example`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEnlargedImage({ url: edge.imageUrl, label: edge.label });
                      }}
                      className="absolute top-2.5 right-2.5 w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white/95 text-[#01312d] shadow-sm hover:bg-white hover:text-[#2e7d4f] transition-colors focus:outline-none focus:ring-2 focus:ring-[#2e7d4f]"
                      aria-label={`Enlarge ${edge.label} image`}
                    >
                      <ZoomIn className="w-4 h-4" strokeWidth={2.25} />
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3 p-4 pt-3.5">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-bold text-[#01312D] text-base md:text-lg leading-tight mb-1">
                      {edge.label}
                    </h5>
                    <p className="text-sm text-[#6b8478] leading-relaxed">
                      {edge.description}
                    </p>
                  </div>
                  <Tooltip
                    content={
                      <div>
                        <p className="text-sm text-slate-600 font-medium mb-1">
                          {edge.label}
                        </p>
                        <p className="text-sm text-slate-500">
                          {edge.longDescription}
                        </p>
                        <p className="mt-3 text-sm">
                          <a
                            href="https://shadespace.com/pages/styles"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-semibold text-[#307C31] hover:text-[#01312D] hover:underline transition-colors"
                          >
                            Learn more about our styles &rarr;
                          </a>
                        </p>
                      </div>
                    }
                  >
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center text-xs font-semibold bg-[#2e7d4f] text-white rounded-full cursor-help hover:bg-[#01312d] transition-colors"
                    >
                      ?
                    </span>
                  </Tooltip>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="flex flex-col gap-3 pt-4 border-t border-[#dfe7e1]">
        <div className="flex sm:hidden flex-col gap-3">
          <div className="flex gap-3">
            {showBackButton && (
              <Button variant="outline" size="md" onClick={onPrev} className="flex-1">Back</Button>
            )}
            {onSaveQuote && (
              <SaveProgressButton onClick={onSaveQuote} className="flex-1" />
            )}
          </div>
          {mobileGuidance?.currentHighlightTarget === 'continue-button-edge' ? (
            <div className="energy-border-chase-btn w-full" id="continue-button-edge" data-guidance-id="continue-button-edge">
              <Button onClick={handleContinue} disabled={!config.edgeType} size="md" className={`w-full py-4 sm:py-2 ${!config.edgeType ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <span className="flex flex-col items-center leading-tight">
                  <span>Continue</span>
                  {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleContinue}
              disabled={!config.edgeType}
              size="md"
              id="continue-button-edge"
              data-guidance-id="continue-button-edge"
              className={`w-full py-4 sm:py-2 ${!config.edgeType ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="flex flex-col items-center leading-tight">
                <span>Continue</span>
                {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
              </span>
            </Button>
          )}
        </div>

        <div className="hidden sm:flex gap-4">
          {showBackButton && (
            <Button variant="outline" size="md" onClick={onPrev} className="w-auto">Back</Button>
          )}
          {onSaveQuote && (
            <SaveProgressButton onClick={onSaveQuote} className="w-auto" />
          )}
          {mobileGuidance?.currentHighlightTarget === 'continue-button-edge' ? (
            <div className="energy-border-chase-btn flex-1" id="continue-button-edge" data-guidance-id="continue-button-edge">
              <Button onClick={handleContinue} disabled={!config.edgeType} size="md" className={`w-full ${!config.edgeType ? 'opacity-50 cursor-not-allowed' : ''}`}>
                <span className="flex flex-col items-center leading-tight">
                  <span>Continue</span>
                  {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={handleContinue}
              disabled={!config.edgeType}
              size="md"
              id="continue-button-edge"
              data-guidance-id="continue-button-edge"
              className={`flex-1 ${!config.edgeType ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <span className="flex flex-col items-center leading-tight">
                <span>Continue</span>
                {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
              </span>
            </Button>
          )}
        </div>
      </div>

      {enlargedImage && typeof document !== 'undefined' && createPortal(
        <div
          data-lenis-prevent
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-[fadeIn_0.15s_ease-out]"
          onClick={() => setEnlargedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${enlargedImage.label} enlarged image`}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }}
            className="absolute top-4 right-4 w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close enlarged image"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={enlargedImage.url}
              alt={`${enlargedImage.label} - enlarged view`}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white"
            />
            <p className="mt-3 text-center text-white font-semibold text-lg">{enlargedImage.label}</p>
          </div>
        </div>,
        getPortalRoot()
      )}
    </div>
  );
}

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { getPortalRoot } from '../../utils/appScope';
import { X, ZoomIn } from 'lucide-react';
import { ConfiguratorState } from '../../types';
import { Tooltip } from '../ui/Tooltip';
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
    label: 'Cabled edge',
    description: 'Strongest and sleekest. Best for permanent installations.',
    longDescription: 'Experience superior durability and a sleek finish with our Cabled Edge reinforcement. A marine-grade stainless steel cable is expertly integrated along the entire perimeter of the shade sail, allowing for precise tensioning during installation. Each corner features uniquely styled stainless steel D-rings, which not only securely house the cable but also contribute to an exceptionally professional appearance and enormous structural strength.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Wire_Edge.Configurator.webp?v=1784063875',
    tag: null,
  },
  {
    id: 'webbing',
    label: 'Webbing reinforced',
    description: 'Easiest to install. Ideal for DIY projects.',
    longDescription: 'Our webbing-reinforced design incorporates a unique method, utilizing an exceptionally strong 48mm (2-inch) polyester webbing expertly integrated within the hemline. This webbing is meticulously pre-set and pre-sewn, ensuring optimal tension is achieved effortlessly once the sail is fully stretched into position. This innovative approach guarantees a hassle-free on-site installation: simply tension from each fixing point and enjoy your perfectly taut shade sail.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Webbing_Edge.Configurator.webp?v=1784063875',
    tag: 'Most popular',
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

  const perimeterMm = useMemo(
    () => getPerimeterMm(config.measurements || {}, config.corners || 0),
    [config.measurements, config.corners]
  );
  const recommendation = useMemo(() => getRecommendation(perimeterMm), [perimeterMm]);

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

  const adviceTitle = recommendation === 'cabled'
    ? 'Cabled edge recommended.'
    : recommendation === 'webbing'
    ? 'Webbing reinforced is a great choice.'
    : 'Either option works well for your sail.';
  const adviceBody = recommendation === 'cabled'
    ? `Your sail has a ${perimeterM.toFixed(1)}m perimeter. At this size, a cabled edge provides the structural strength needed.`
    : recommendation === 'webbing'
    ? `At ${perimeterM.toFixed(1)}m perimeter, webbing reinforcement is well-suited and the easiest to install.`
    : `At ${perimeterM.toFixed(1)}m perimeter, both edge types are suitable. Choose based on your preference.`;

  return (
    <div className="space-y-4">
      {/* Advice banner */}
      {perimeterM > 0 && (
        <div className="bg-surface-soft rounded-[14px] px-4 py-3.5 text-[15px] text-[#23503f] leading-relaxed">
          <strong>{adviceTitle}</strong> {adviceBody}
        </div>
      )}

      {/* Edge cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {EDGE_OPTIONS.map((edge) => {
          const isSelected = config.edgeType === edge.id;

          return (
            <div
              key={edge.id}
              onClick={() => updateConfig({ edgeType: edge.id })}
              className={`relative rounded-card overflow-hidden cursor-pointer transition-all duration-200 ${
                isSelected
                  ? 'bg-brand-green text-white border-2 border-brand-green'
                  : 'bg-white border-2 border-border-card hover:border-[#7bb08f]'
              }`}
            >
              {/* Lime check */}
              {isSelected && (
                <div className="absolute top-3 right-3 w-6 h-6 rounded-full bg-brand-lime text-brand-green text-sm font-extrabold flex items-center justify-center z-10">
                  &#10003;
                </div>
              )}

              {/* Image */}
              <div className="relative">
                <img
                  src={edge.imageUrl}
                  alt={`${edge.label} example`}
                  className="w-full h-[150px] object-cover block bg-border-card"
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEnlargedImage({ url: edge.imageUrl, label: edge.label });
                  }}
                  className="absolute top-2.5 right-2.5 w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white/90 text-brand-green shadow-sm hover:bg-white transition-colors min-h-[44px] min-w-[44px]"
                  aria-label={`Enlarge ${edge.label} image`}
                >
                  <ZoomIn className="w-4 h-4" strokeWidth={2.25} />
                </button>
              </div>

              {/* Text */}
              <div className="px-4 py-4 pb-4">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <div className="font-extrabold text-[19px]">{edge.label}</div>
                  {edge.tag && (
                    <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 ${
                      isSelected
                        ? 'bg-white/20 text-white'
                        : 'bg-surface-soft text-brand-mid'
                    }`}>
                      {edge.tag}
                    </span>
                  )}
                </div>
                <div className={`text-[15px] mt-1.5 leading-[1.45] ${isSelected ? 'opacity-90' : 'text-text-muted'}`}>
                  {edge.description}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Enlarged image modal */}
      {enlargedImage && typeof document !== 'undefined' && createPortal(
        <div
          data-lenis-prevent
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-[rgba(1,49,45,0.72)] p-5"
          onClick={() => setEnlargedImage(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${enlargedImage.label} enlarged image`}
        >
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setEnlargedImage(null); }}
            className="absolute top-4 right-4 w-10 h-10 inline-flex items-center justify-center rounded-full border-2 border-white/30 text-white hover:bg-white/10 transition-colors"
            aria-label="Close enlarged image"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-4xl w-full" onClick={(e) => e.stopPropagation()}>
            <img
              src={enlargedImage.url}
              alt={`${enlargedImage.label} - enlarged view`}
              className="w-full h-auto max-h-[85vh] object-contain rounded-2xl shadow-2xl bg-white"
            />
            <p className="mt-3 text-center text-white font-semibold text-lg">{enlargedImage.label}</p>
          </div>
        </div>,
        getPortalRoot()
      )}
    </div>
  );
}

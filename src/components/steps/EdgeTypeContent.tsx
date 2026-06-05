import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, ZoomIn } from 'lucide-react';
import { ConfiguratorState } from '../../types';
import { Button } from '../ui/Button';
import { Tooltip } from '../ui/Tooltip';
import { SaveProgressButton } from '../SaveProgressButton';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';

interface EdgeTypeContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  validationErrors?: {[key: string]: string};
  onNext: () => void;
  onPrev: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
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
    description: 'Premium cable edge reinforecment.',
    longDescription: 'Experience superior durability and a sleek finish with our Cabled Edge reinforcement. A marine-grade stainless steel cable is expertly integrated along the entire perimeter of the shade sail, allowing for precise tensioning during installation. Each corner features uniquely styled stainless steel D-rings, which not only securely house the cable but also contribute to an exceptionally professional appearance and enormous structural strength.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Wire_Edge.png?v=1778472343'
  },
  {
    id: 'webbing',
    label: 'Webbing Reinforced',
    description: 'Robust reinforcement with webbing tape. Easiest to install.',
    longDescription: 'Our webbing-reinforced design incorporates a unique method, utilizing an exceptionally strong 48mm (2-inch) polyester webbing expertly integrated within the hemline. This webbing is meticulously pre-set and pre-sewn, ensuring optimal tension is achieved effortlessly once the sail is fully stretched into position. This innovative approach guarantees a hassle-free on-site installation: simply tension from each fixing point and enjoy your perfectly taut shade sail.',
    imageUrl: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/Webbing_Edge.png?v=1778472343'
  }
];

export function EdgeTypeContent({ config, updateConfig, onNext, onPrev, nextStepTitle = '', showBackButton = false, validationErrors = {}, onSaveQuote, mobileGuidance }: EdgeTypeContentProps) {
  const [enlargedImage, setEnlargedImage] = useState<{ url: string; label: string } | null>(null);

  useBodyScrollLock(!!enlargedImage);

  useEffect(() => {
    if (!enlargedImage) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setEnlargedImage(null);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
    };
  }, [enlargedImage]);

  React.useEffect(() => {
    console.log('[EdgeType] Effect triggered', {
      isGuidanceActive: mobileGuidance?.isGuidanceActive,
      edgeType: config.edgeType
    });

    if (mobileGuidance?.isGuidanceActive && config.edgeType) {
      console.log('[EdgeType] Guiding to continue button');
      mobileGuidance.scrollToElement('continue-button-edge', 400);
      mobileGuidance.setHighlightTarget('continue-button-edge', 5000);
    }
  }, [config.edgeType, mobileGuidance?.isGuidanceActive]);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h4 className="text-lg font-semibold text-slate-900 mb-4">
          Select Edge Reinforcement Type
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-5">
          {EDGE_OPTIONS.map((edge) => {
            const hasError = validationErrors.edgeType && !config.edgeType;
            const isSelected = config.edgeType === edge.id;

            return (
              <div
                key={edge.id}
                onClick={() => updateConfig({ edgeType: edge.id })}
                className={`group relative bg-white rounded-2xl border transition-all duration-200 cursor-pointer overflow-hidden flex flex-col ${
                  isSelected
                    ? 'border-2 border-[#01312D] shadow-md'
                    : hasError
                    ? 'border-2 border-red-500 bg-red-50'
                    : 'border border-slate-200 hover:border-slate-300 hover:shadow-md'
                }`}
              >
                <div className="relative p-3 pb-0">
                  <div className="relative rounded-xl overflow-hidden bg-[#F3FFE3]/60 aspect-[16/9]">
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
                      className="absolute top-2.5 right-2.5 w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white/95 text-[#01312D] shadow-sm hover:bg-white hover:text-[#307C31] transition-colors focus:outline-none focus:ring-2 focus:ring-[#307C31]"
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
                    <p className="text-sm text-slate-600 leading-relaxed">
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
                            Learn more about our styles →
                          </a>
                        </p>
                      </div>
                    }
                  >
                    <span
                      onClick={(e) => e.stopPropagation()}
                      className="flex-shrink-0 w-6 h-6 inline-flex items-center justify-center text-xs font-semibold bg-[#01312D] text-white rounded-full cursor-help hover:bg-[#307C31] transition-colors"
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

      <div className="flex flex-col gap-4 pt-4 border-t border-slate-200">
        {/* Mobile Layout: Back and Save Progress on same row, Continue below */}
        <div className="flex sm:hidden flex-col gap-3">
          <div className="flex gap-3">
            {showBackButton && (
              <Button
                variant="outline"
                size="md"
                onClick={onPrev}
                className="flex-1"
              >
                Back
              </Button>
            )}
            {onSaveQuote && (
              <SaveProgressButton
                onClick={onSaveQuote}
                className="flex-1"
              />
            )}
          </div>
          <Button
            onClick={() => {
              mobileGuidance?.clearHighlight();
              onNext();
            }}
            size="md"
            id="continue-button-edge"
            data-guidance-id="continue-button-edge"
            className={`w-full py-4 sm:py-2 ${!config.edgeType ? 'opacity-50' : ''} ${
              mobileGuidance?.currentHighlightTarget === 'continue-button-edge' ? 'pulsate-guidance' : ''
            }`}
          >
            <span className="flex flex-col items-center leading-tight">
              <span>Continue</span>
              {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
            </span>
          </Button>
        </div>

        {/* Desktop Layout: Back, Save Progress, and Continue on same row */}
        <div className="hidden sm:flex gap-4">
          {showBackButton && (
            <Button
              variant="outline"
              size="md"
              onClick={onPrev}
              className="w-auto"
            >
              Back
            </Button>
          )}
          {onSaveQuote && (
            <SaveProgressButton
              onClick={onSaveQuote}
              className="w-auto"
            />
          )}
          <Button
            onClick={() => {
              mobileGuidance?.clearHighlight();
              onNext();
            }}
            size="md"
            id="continue-button-edge"
            data-guidance-id="continue-button-edge"
            className={`flex-1 ${!config.edgeType ? 'opacity-50' : ''} ${
              mobileGuidance?.currentHighlightTarget === 'continue-button-edge' ? 'pulsate-guidance' : ''
            }`}
          >
            <span className="flex flex-col items-center leading-tight">
              <span>Continue</span>
              {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
            </span>
          </Button>
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
            onClick={(e) => {
              e.stopPropagation();
              setEnlargedImage(null);
            }}
            className="absolute top-4 right-4 w-10 h-10 inline-flex items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 transition-colors"
            aria-label="Close enlarged image"
          >
            <X className="w-5 h-5" />
          </button>
          <div
            className="max-w-4xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={enlargedImage.url}
              alt={`${enlargedImage.label} - enlarged view`}
              className="w-full h-auto max-h-[85vh] object-contain rounded-lg shadow-2xl bg-white"
            />
            <p className="mt-3 text-center text-white font-semibold text-lg">
              {enlargedImage.label}
            </p>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
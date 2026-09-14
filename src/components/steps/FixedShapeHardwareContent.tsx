import React, { useState, useRef, useMemo } from 'react';
import { ConfiguratorState, ShadeCalculations, CornerHardwareLine } from '../../types';

import { useHardwareCatalog, getDefaultPack, getLivePackPrice, HardwareItem, isGreaseItem, getLiveHardwarePrice } from '../../hooks/useHardwareCatalog';
import { HardwareSelectionModal } from '../HardwareSelectionModal';
import { StandardPackPreview, HARDWARE_PACK_IMAGES } from '../StandardPackPreview';
import { ShapeCanvas } from '../ShapeCanvas';
import { formatCurrency } from '../../utils/currencyFormatter';
import { EXCHANGE_RATES } from '../../data/pricing';
import { Eye, Info } from 'lucide-react';

const MANUAL_PER_CORNER_IMAGE = 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/shade-sail-hardware.webp?v=1742360021';
import { PricingSetting, getPricingForCurrency } from '../../hooks/usePricingSettings';

interface FixedShapeHardwareContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  onNext?: () => void;
  onPrev?: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  onSaveQuote?: () => void;
  pricingSettingsMap?: Record<string, PricingSetting>;
  isMobile?: boolean;
  setHighlightedCorner?: (corner: number | null) => void;
  highlightedCorner?: number | null;
  mobileGuidance?: {
    isGuidanceActive: boolean;
    currentHighlightTarget: string | null;
    scrollToElement: (elementId: string, delay?: number, offset?: number) => void;
    setHighlightTarget: (targetId: string | null, duration?: number) => void;
    clearHighlight: () => void;
  };
}

export function FixedShapeHardwareContent({
  config,
  updateConfig,
  calculations,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton,
  onSaveQuote,
  pricingSettingsMap,
  isMobile,
  setHighlightedCorner,
  highlightedCorner = null,
  mobileGuidance,
}: FixedShapeHardwareContentProps) {
  const { items: catalogItems, categories, packs, loading } = useHardwareCatalog();
  const [modalCorner, setModalCorner] = useState<number | null>(null);
  const manualPanelRef = useRef<HTMLDivElement>(null);

  const currency = config.currency || 'NZD';
  const edgeType = (config.edgeType as 'webbing' | 'cabled') || 'webbing';
  const pack = getDefaultPack(packs, edgeType, config.corners);

  const mode: 'standard' | 'manual' | 'none' = config.hardwareSelectionMode ?? 'none';

  const cornerHardware = config.cornerHardware || {};
  const configuredCount = Array.from({ length: config.corners }, (_, i) => cornerHardware[i]?.length || 0).filter(n => n > 0).length;
  const allManualConfigured = mode === 'manual' ? configuredCount === config.corners : true;

  const greaseItem = useMemo(() => catalogItems.find(isGreaseItem) || null, [catalogItems]);
  const includeGrease = config.includeGrease !== false;
  const pricingCfg = pricingSettingsMap
    ? getPricingForCurrency(pricingSettingsMap, currency)
    : { exchangeRate: 1 };
  const greaseLivePrice = greaseItem ? getLiveHardwarePrice(greaseItem, currency, pricingCfg.exchangeRate) : 0;

  React.useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && mode) {
      if (mode === 'manual' && !allManualConfigured) return;
      mobileGuidance.scrollToElement('continue-button-hardware', 400);
      mobileGuidance.setHighlightTarget('continue-button-hardware');
    }
  }, [mode, allManualConfigured, mobileGuidance?.isGuidanceActive]);

  const itemsById = useMemo(() => {
    const m = new Map<string, HardwareItem>();
    for (const it of catalogItems) m.set(it.id, it);
    return m;
  }, [catalogItems]);

  const setMode = (next: 'standard' | 'manual' | 'none') => {
    if (next === mode) {
      updateConfig({ hardwareSelectionMode: 'none', cornerHardware: {} });
      return;
    }
    const updates: Partial<ConfiguratorState> = { hardwareSelectionMode: next };
    if (next !== 'manual') {
      updates.cornerHardware = {};
    }
    updateConfig(updates);
    if (next === 'manual' && typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
      requestAnimationFrame(() => {
        setTimeout(() => {
          manualPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      });
    }
  };

  const openCornerModal = (cornerIndex: number) => setModalCorner(cornerIndex);

  const confirmSelection = (lines: CornerHardwareLine[], applyToAll: boolean) => {
    if (modalCorner === null) return;
    const next = { ...(config.cornerHardware || {}) };
    if (applyToAll) {
      for (let i = 0; i < config.corners; i++) next[i] = lines.map(l => ({ ...l }));
    } else {
      next[modalCorner] = lines;
    }
    updateConfig({ hardwareSelectionMode: 'manual', cornerHardware: next });
    setModalCorner(null);
  };

  const clearCorner = (cornerIndex: number) => {
    const next = { ...(config.cornerHardware || {}) };
    delete next[cornerIndex];
    updateConfig({ cornerHardware: next });
  };

  const cornerPreview = (cornerIndex: number) => {
    const lines = cornerHardware[cornerIndex] || [];
    if (lines.length === 0) return null;
    return lines.slice(0, 3).map(l => `${l.qty}× ${l.name}`).join(', ') + (lines.length > 3 ? ` +${lines.length - 3} more` : '');
  };

  const cornerSubtotalDisplay = (cornerIndex: number) => {
    const live = calculations.hardwareBreakdown?.perCornerLivePrice?.[cornerIndex] ?? 0;
    return formatCurrency(live, config.currency);
  };

  const handleHoverCorner = (i: number | null) => {
    if (setHighlightedCorner) setHighlightedCorner(i);
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#2e7d4f] rounded-full" />
      </div>
    );
  }

  const packImage = HARDWARE_PACK_IMAGES[config.corners];

  return (
    <div className="space-y-4">
      {/* Mode cards – tall visual layout matching custom shape */}
      <div className="grid grid-cols-2 gap-2">
        {/* Hardware Tensioning Kit card */}
        {pack && (() => {
          const sel = mode === 'standard';
          return (
            <StandardPackPreview
              pack={pack}
              itemsById={itemsById}
              corners={config.corners}
              onTriggerClick={() => setMode('standard')}
              triggerClassName={`relative w-full rounded-card overflow-hidden text-left transition-all duration-200 cursor-pointer ${
                sel
                  ? 'bg-brand-green text-white border-2 border-brand-green'
                  : 'bg-white border-2 border-border-card hover:border-[#7bb08f]'
              }`}
            >
              {() => (
                <>
                  {packImage && (
                    <div className="relative">
                      {sel && <div className="absolute inset-0 bg-brand-green/40 z-[1]" />}
                      {sel && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-brand-lime text-brand-green text-lg font-extrabold flex items-center justify-center z-[2] shadow-md">
                          &#10003;
                        </div>
                      )}
                      <img
                        src={packImage}
                        alt="Hardware Tensioning Kit"
                        className="w-full h-[100px] sm:h-[150px] object-cover block bg-border-card"
                      />
                      <StandardPackPreview pack={pack} itemsById={itemsById} corners={config.corners} triggerClassName="absolute top-2.5 right-2.5 z-[3] w-8 h-8 inline-flex items-center justify-center rounded-lg bg-white/90 text-brand-green shadow-sm hover:bg-white transition-colors min-h-[44px] min-w-[44px]">
                        <Eye className="w-4 h-4" strokeWidth={2.25} />
                      </StandardPackPreview>
                    </div>
                  )}
                  <div className="px-4 py-4">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <div className="font-extrabold text-[15px] sm:text-[19px]">Hardware Tensioning Kit</div>
                      <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 ${
                        sel ? 'bg-white/20 text-white' : 'bg-surface-soft text-brand-mid'
                      }`}>
                        Recommended
                      </span>
                    </div>
                    <div className={`text-[15px] mt-1.5 leading-[1.45] ${sel ? 'opacity-90' : 'text-text-muted'}`}>
                      Curated set of hardware for your sail. Easiest option.
                    </div>
                    {(() => {
                      const kitPrice = getLivePackPrice(pack, currency, EXCHANGE_RATES[currency] || 1);
                      return kitPrice ? (
                        <div className={`text-sm mt-2 font-bold ${sel ? 'text-brand-lime' : 'text-[#b8600b]'}`}>
                          {formatCurrency(kitPrice, currency)}
                        </div>
                      ) : null;
                    })()}
                  </div>
                </>
              )}
            </StandardPackPreview>
          );
        })()}

        {/* Manual per corner card */}
        {(() => {
          const sel = mode === 'manual';
          return (
            <div
              onClick={() => setMode('manual')}
              className={`relative rounded-card overflow-hidden cursor-pointer transition-all duration-200 ${
                sel
                  ? 'bg-brand-green text-white border-2 border-brand-green'
                  : 'bg-white border-2 border-border-card hover:border-[#7bb08f]'
              }`}
            >
              <div className="relative">
                {sel && <div className="absolute inset-0 bg-brand-green/40 z-[1]" />}
                {sel && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-brand-lime text-brand-green text-lg font-extrabold flex items-center justify-center z-[2] shadow-md">
                    &#10003;
                  </div>
                )}
                <img
                  src={MANUAL_PER_CORNER_IMAGE}
                  alt="Manual per corner hardware"
                  className="w-full h-[100px] sm:h-[150px] object-cover block bg-border-card"
                />
              </div>
              <div className="px-4 py-4">
                <div className="font-extrabold text-[15px] sm:text-[19px]">Manual per corner</div>
                <div className={`text-[15px] mt-1.5 leading-[1.45] ${sel ? 'opacity-90' : 'text-text-muted'}`}>
                  Pick specific hardware items for each corner individually.
                </div>
              </div>
            </div>
          );
        })()}
      </div>

      {/* Manual per-corner configuration */}
      {mode === 'manual' && (
        <div ref={manualPanelRef} className="scroll-mt-4 space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="text-[17px] font-extrabold text-brand-green">Choose for each corner</span>
            <span className="text-[13px] font-bold text-brand-mid bg-surface-soft rounded-full px-2.5 py-0.5">
              {configuredCount}/{config.corners}
            </span>
          </div>

          {/* Mobile shape canvas */}
          <div className="lg:hidden">
            <div className="mx-auto max-w-[280px]">
              <ShapeCanvas
                config={config}
                updateConfig={updateConfig}
                readonly={true}
                snapToGrid={false}
                highlightedCorner={highlightedCorner}
                isMobile={true}
                measurementOption={config.measurementOption}
                unit={config.unit}
                plainBackground={true}
                hideHelp={true}
                onCornerTap={openCornerModal}
                onCornerHover={setHighlightedCorner}
              />
            </div>
          </div>

          {/* Corner cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {Array.from({ length: config.corners }, (_, idx) => {
              const letter = String.fromCharCode(65 + idx);
              const preview = cornerPreview(idx);
              const isConfigured = (cornerHardware[idx]?.length || 0) > 0;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => openCornerModal(idx)}
                  onMouseEnter={() => handleHoverCorner(idx)}
                  onMouseLeave={() => handleHoverCorner(null)}
                  className={`flex w-full items-center gap-3.5 rounded-card border-2 px-4 py-3 text-left transition-all duration-200 cursor-pointer ${
                    isConfigured ? 'border-border-card bg-white' : 'border-[#e4a11a]/40 bg-[#fffbf5]'
                  } hover:border-[#7bb08f]`}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-brand-green text-brand-lime font-extrabold text-sm">
                    {letter}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-[15px] font-bold truncate ${isConfigured ? 'text-brand-green' : 'text-[#b8600b]'}`}>
                      {isConfigured ? preview : 'Not configured'}
                    </div>
                    {isConfigured && (
                      <div className="text-[13px] font-bold text-[#b8600b] mt-0.5">{cornerSubtotalDisplay(idx)}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {isConfigured && (
                      <span
                        role="button"
                        aria-label={`Clear hardware for corner ${letter}`}
                        onClick={(e) => { e.stopPropagation(); clearCorner(idx); }}
                        className="text-xs text-text-muted hover:text-brand-green px-1 py-1"
                      >
                        Clear
                      </span>
                    )}
                    <span className="text-[13px] font-bold text-brand-mid whitespace-nowrap">
                      {isConfigured ? 'Edit' : 'Select'}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Grease add-on */}
          {greaseItem && (
            <div
              onClick={() => updateConfig({ includeGrease: !includeGrease })}
              className={`flex items-center gap-3.5 rounded-card border-2 px-4 py-3.5 cursor-pointer transition-all duration-200 ${
                includeGrease ? 'border-border-card bg-white' : 'border-border-card bg-white'
              }`}
            >
              <div className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg border-2 transition ${
                includeGrease ? 'border-brand-green bg-brand-green' : 'border-border-card bg-white'
              }`}>
                {includeGrease && <span className="text-white text-sm font-extrabold">&#10003;</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-base text-brand-green">{greaseItem.name}</div>
                <div className="text-sm text-text-muted">Prevents seizing and ensures correct installation. One per sail.</div>
              </div>
              <div className="font-extrabold text-[15px] text-brand-green">{formatCurrency(greaseLivePrice, currency)}</div>
            </div>
          )}

          {/* Hardware cost summary */}
          {config.corners > 0 && (
            <div className="bg-surface-soft rounded-xl px-4 py-3 flex items-center justify-between text-[15px]">
              <span className="font-semibold text-[#23503f]">Hardware cost (added to total)</span>
              <span className="font-extrabold text-[#b8600b]">{formatCurrency((calculations.hardwareBreakdown?.hardwareOnlyLivePrice || 0), config.currency)}</span>
            </div>
          )}
        </div>
      )}

      {/* Hardware Selection Modal - per corner */}
      {!loading && modalCorner !== null && (
        <HardwareSelectionModal
          open={modalCorner !== null}
          onClose={() => setModalCorner(null)}
          cornerIndex={modalCorner}
          totalCorners={config.corners}
          items={catalogItems}
          categories={categories}
          initialSelection={cornerHardware[modalCorner] || []}
          onConfirm={confirmSelection}
          currency={currency}
          pricingSettingsMap={pricingSettingsMap}
        />
      )}
    </div>
  );
}

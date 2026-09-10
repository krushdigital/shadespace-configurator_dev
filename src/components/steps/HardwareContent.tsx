import React, { useState, useRef } from 'react';
import { ConfiguratorState, ShadeCalculations, CornerHardwareLine } from '../../types';
import { HardwareSelectionModal } from '../HardwareSelectionModal';
import { ShapeCanvas } from '../ShapeCanvas';
import { StandardPackPreview, HARDWARE_PACK_IMAGES } from '../StandardPackPreview';
import { useHardwareCatalog, getDefaultPack, HardwareItem, isGreaseItem, getLiveHardwarePrice } from '../../hooks/useHardwareCatalog';
import { formatCurrency } from '../../utils/currencyFormatter';
import { PricingSetting, getPricingForCurrency } from '../../hooks/usePricingSettings';

interface HardwareContentProps {
  config: ConfiguratorState;
  updateConfig: (updates: Partial<ConfiguratorState>) => void;
  calculations: ShadeCalculations;
  onNext?: () => void;
  onPrev?: () => void;
  nextStepTitle?: string;
  showBackButton?: boolean;
  pricingSettingsMap?: Record<string, PricingSetting>;
  setHighlightedCorner?: (corner: number | null) => void;
  highlightedCorner?: number | null;
  onSaveQuote?: () => void;
  mobileGuidance?: {
    isGuidanceActive: boolean;
    currentHighlightTarget: string | null;
    scrollToElement: (elementId: string, delay?: number, offset?: number) => void;
    setHighlightTarget: (targetId: string | null, duration?: number) => void;
    clearHighlight: () => void;
  };
}

export function HardwareContent({
  config,
  updateConfig,
  calculations,
  onNext,
  onPrev,
  nextStepTitle,
  showBackButton,
  pricingSettingsMap,
  setHighlightedCorner,
  highlightedCorner = null,
  onSaveQuote,
  mobileGuidance,
}: HardwareContentProps) {
  const { items, categories, packs, loading } = useHardwareCatalog();
  const [modalCorner, setModalCorner] = useState<number | null>(null);
  const manualPanelRef = useRef<HTMLDivElement>(null);

  const mode: 'standard' | 'manual' | 'none' = config.hardwareSelectionMode ?? 'none';
  const edgeType = (config.edgeType as 'webbing' | 'cabled') || 'webbing';
  const pack = getDefaultPack(packs, edgeType, config.corners);

  const cornerHardware = config.cornerHardware || {};
  const configuredCount = Array.from({ length: config.corners }, (_, i) => cornerHardware[i]?.length || 0).filter(n => n > 0).length;
  const allManualConfigured = mode === 'manual' ? configuredCount === config.corners : true;

  const greaseItem = React.useMemo(() => items.find(isGreaseItem) || null, [items]);
  const includeGrease = config.includeGrease !== false;
  const pricing = pricingSettingsMap
    ? getPricingForCurrency(pricingSettingsMap, config.currency)
    : { exchangeRate: 1 };
  const greaseLivePrice = greaseItem ? getLiveHardwarePrice(greaseItem, config.currency, pricing.exchangeRate) : 0;

  React.useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && mode) {
      if (mode === 'manual' && !allManualConfigured) return;
      mobileGuidance.scrollToElement('continue-button-hardware', 400);
      mobileGuidance.setHighlightTarget('continue-button-hardware');
    }
  }, [mode, allManualConfigured, mobileGuidance?.isGuidanceActive]);

  const setMode = (next: 'standard' | 'manual' | 'none') => {
    if (next === mode) {
      updateConfig({ hardwareSelectionMode: 'none', cornerHardware: {} });
      return;
    }
    const wasManual = mode === 'manual';
    const updates: Partial<ConfiguratorState> = { hardwareSelectionMode: next };
    if (next !== 'manual') {
      updates.cornerHardware = {};
    }
    updateConfig(updates);
    if (next === 'manual' && !wasManual && typeof window !== 'undefined' && window.matchMedia('(max-width: 1023px)').matches) {
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
    updateConfig({ cornerHardware: next });
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
    return lines.slice(0, 3).map(l => `${l.qty}\u00d7 ${l.name}`).join(', ') + (lines.length > 3 ? ` +${lines.length - 3} more` : '');
  };

  const cornerSubtotalDisplay = (cornerIndex: number) => {
    const live = calculations.hardwareBreakdown?.perCornerLivePrice?.[cornerIndex] ?? 0;
    return formatCurrency(live, config.currency);
  };

  const itemsById = React.useMemo(() => {
    const m = new Map<string, HardwareItem>();
    for (const it of items) m.set(it.id, it);
    return m;
  }, [items]);

  const handleHoverCorner = (i: number | null) => {
    if (setHighlightedCorner) setHighlightedCorner(i);
  };

  const hwModes: { id: 'standard' | 'manual' | 'none'; name: string; desc: string; badge: boolean }[] = [
    { id: 'standard', name: 'Hardware Tensioning Kit', desc: 'Curated set of hardware for your sail. Easiest option.', badge: true },
    { id: 'manual', name: 'Manual per corner', desc: 'Pick specific hardware items for each corner individually.', badge: false },
  ];

  return (
    <div className="space-y-4">
      {/* Mode cards */}
      {hwModes.map(h => {
        const sel = mode === h.id;
        return (
          <div
            key={h.id}
            onClick={() => setMode(h.id)}
            className={`relative rounded-card px-5 py-4 cursor-pointer transition-all duration-200 ${
              sel
                ? 'bg-brand-green text-white border-2 border-brand-green'
                : 'bg-white border-2 border-border-card hover:border-[#7bb08f]'
            }`}
          >
            {sel && (
              <div className="absolute top-3.5 right-3.5 w-6 h-6 rounded-full bg-brand-lime text-brand-green text-sm font-extrabold flex items-center justify-center">
                &#10003;
              </div>
            )}
            <div className="flex items-center gap-2.5 flex-wrap pr-8">
              <div className="font-extrabold text-lg">{h.name}</div>
              {h.badge && (
                <span className={`text-xs font-bold rounded-full px-2.5 py-0.5 ${
                  sel ? 'bg-white/20 text-white' : 'bg-surface-soft text-brand-mid'
                }`}>
                  Recommended
                </span>
              )}
            </div>
            <div className={`text-[15px] mt-1.5 leading-[1.45] ${sel ? 'opacity-90' : 'text-text-muted'}`}>
              {h.desc}
            </div>
            {sel && h.id === 'standard' && pack && (
              <div className={`text-sm mt-2 font-bold ${sel ? 'text-brand-lime' : 'text-[#b8600b]'}`}>
                {formatCurrency(calculations.hardwareBreakdown?.hardwareOnlyLivePrice || 0, config.currency)}
              </div>
            )}
          </div>
        );
      })}

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
              <div className="font-extrabold text-[15px] text-brand-green">{formatCurrency(greaseLivePrice, config.currency)}</div>
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

      {/* Hardware selection modal */}
      {!loading && modalCorner !== null && (
        <HardwareSelectionModal
          open={modalCorner !== null}
          onClose={() => setModalCorner(null)}
          cornerIndex={modalCorner}
          totalCorners={config.corners}
          items={items}
          categories={categories}
          initialSelection={cornerHardware[modalCorner] || []}
          onConfirm={confirmSelection}
          currency={config.currency}
          pricingSettingsMap={pricingSettingsMap}
        />
      )}
    </div>
  );
}

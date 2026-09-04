import React, { useState, useRef, useMemo } from 'react';
import { ConfiguratorState, ShadeCalculations, CornerHardwareLine } from '../../types';
import { Button } from '../ui/Button';
import { SaveProgressButton } from '../SaveProgressButton';
import { useHardwareCatalog, getDefaultPack, getLivePackPrice, HardwareItem, isGreaseItem, getLiveHardwarePrice } from '../../hooks/useHardwareCatalog';
import { HardwareSelectionModal } from '../HardwareSelectionModal';
import { StandardPackPreview, HARDWARE_PACK_IMAGES } from '../StandardPackPreview';
import { ShapeCanvas } from '../ShapeCanvas';
import { formatCurrency } from '../../utils/currencyFormatter';
import { EXCHANGE_RATES } from '../../data/pricing';
import { Package, SlidersHorizontal, CheckCircle2, Info, Droplets } from 'lucide-react';
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

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#01312d]">Hardware (Recommended)</h2>
          <p className="mt-1 text-sm text-[#6b8478]">
            Add mounting hardware to your order, or continue without to get the sail only.
          </p>
        </div>
        {mode === 'manual' && (
          <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            allManualConfigured ? 'bg-[#eef5ef] text-[#2e7d4f]' : 'bg-[#fff7ed] text-[#8b5c1a]'
          }`}>
            {configuredCount}/{config.corners} configured
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {/* Standard Pack Card */}
        {pack && (
          <StandardPackPreview
            pack={pack}
            itemsById={itemsById}
            corners={config.corners}
            onTriggerClick={() => setMode('standard')}
            triggerClassName={`relative w-full rounded-xl border-2 p-4 text-left transition cursor-pointer ${
              mode === 'standard' ? 'border-[#2e7d4f] bg-[#2e7d4f]/5' : 'border-[#dfe7e1] bg-white hover:border-[#7bb08f]'
            }`}
          >
            {({ openInfo }) => (
              <div className="flex items-start gap-3 w-full">
                {HARDWARE_PACK_IMAGES[config.corners] ? (
                  <img
                    src={HARDWARE_PACK_IMAGES[config.corners]}
                    alt={`${config.corners} corner hardware kit`}
                    className="h-14 w-14 flex-shrink-0 rounded-lg border border-[#dfe7e1] bg-white object-contain"
                  />
                ) : (
                  <div className="h-14 w-14 flex-shrink-0 rounded-lg border border-[#dfe7e1] bg-white flex items-center justify-center">
                    <Package className="h-6 w-6 text-[#2e7d4f]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-[#01312d]">Hardware Tensioning Kit</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="View hardware kit contents"
                      onClick={(e) => openInfo(e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') openInfo(e);
                      }}
                      className="inline-flex items-center justify-center -m-1 p-1 rounded-full text-[#6b8478] hover:text-[#2e7d4f] hover:bg-[#eef5ef] cursor-pointer"
                    >
                      <Info className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-[#6b8478]">Curated set for your sail.</div>
                  {(() => {
                    const packPrice = getLivePackPrice(pack, currency, EXCHANGE_RATES[currency] || 1);
                    return packPrice ? (
                      <p className="text-sm font-bold text-[#01312d] mt-1">{formatCurrency(packPrice, currency)}</p>
                    ) : null;
                  })()}
                </div>
                {mode === 'standard' && <CheckCircle2 className="h-5 w-5 text-[#2e7d4f] flex-shrink-0" />}
              </div>
            )}
          </StandardPackPreview>
        )}

        {/* Manual per corner Card */}
        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`rounded-xl border-2 p-4 text-left transition ${
            mode === 'manual' ? 'border-[#2e7d4f] bg-[#2e7d4f]/5' : 'border-[#dfe7e1] bg-white hover:border-[#7bb08f]'
          }`}
        >
          <div className="flex items-center justify-between">
            <SlidersHorizontal className="h-6 w-6 text-[#2e7d4f]" />
            {mode === 'manual' && <CheckCircle2 className="h-5 w-5 text-[#2e7d4f]" />}
          </div>
          <div className="mt-2 text-sm font-bold text-[#01312d]">Manual per corner</div>
          <div className="mt-0.5 text-xs text-[#6b8478]">Pick specific hardware per corner.</div>
        </button>
      </div>

      {mode === 'standard' && greaseItem && (
        <div className={`flex items-center gap-3 rounded-xl border-2 p-3 transition cursor-pointer ${
          includeGrease ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
        }`} onClick={() => updateConfig({ includeGrease: !includeGrease })}>
          {greaseItem.image_url ? (
            <img src={greaseItem.image_url} alt={greaseItem.name} className="h-12 w-12 flex-shrink-0 rounded-lg border border-slate-200 bg-white object-contain" />
          ) : (
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
              <Droplets className="h-5 w-5 text-amber-600" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <div className="text-sm font-semibold text-[#01312d]">{greaseItem.name}</div>
            <div className="text-xs text-[#6b8478] mt-0.5">Prevents seizing &amp; ensures correct installation. One per sail.</div>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-sm font-bold text-[#01312d]">{formatCurrency(greaseLivePrice, currency)}</span>
            <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
              includeGrease ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'
            }`}>
              {includeGrease && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
            </div>
          </div>
        </div>
      )}

      {/* Per-corner manual selection panel */}
      {mode === 'manual' && (
        <div ref={manualPanelRef} className="scroll-mt-4 rounded-xl border border-[#dfe7e1] bg-[#fbfdfb] p-4 space-y-3">
          <div className="lg:hidden mb-3">
            <p className="mb-2 text-xs text-[#6b8478]">Tap a corner on the diagram or the list below to configure.</p>
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
          <p className="text-sm text-[#6b8478] hidden lg:block">Hover over a corner row to highlight it on the diagram. Click to select hardware.</p>
          <div className="space-y-2">
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
                  onFocus={() => handleHoverCorner(idx)}
                  onBlur={() => handleHoverCorner(null)}
                  onTouchStart={() => handleHoverCorner(idx)}
                  className={`flex w-full items-center gap-3 rounded-xl border-2 p-3 text-left transition ${
                    isConfigured ? 'border-emerald-200 bg-emerald-50/40' : 'border-amber-200 bg-amber-50/60'
                  }`}
                >
                  <div className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-bold text-white ${
                    isConfigured ? 'bg-emerald-600' : 'bg-amber-500'
                  }`}>
                    {letter}
                  </div>
                  <div className="flex-1 min-w-0">
                    {isConfigured ? (
                      <>
                        <div className="text-sm font-semibold text-[#01312d] line-clamp-1">{preview}</div>
                        <div className="text-xs text-[#D97706] font-semibold mt-0.5">{cornerSubtotalDisplay(idx)}</div>
                      </>
                    ) : (
                      <div className="text-sm font-semibold text-amber-700">Not configured - click to select</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isConfigured && (
                      <span
                        role="button"
                        aria-label={`Clear hardware for corner ${letter}`}
                        onClick={(e) => { e.stopPropagation(); clearCorner(idx); }}
                        className="text-xs text-slate-400 hover:text-slate-600 px-1.5 py-1"
                      >
                        Clear
                      </span>
                    )}
                    <SlidersHorizontal className="h-4 w-4 text-slate-400" />
                  </div>
                </button>
              );
            })}
          </div>

          {greaseItem && (
            <div className={`mt-3 flex items-center gap-3 rounded-xl border-2 p-3 transition cursor-pointer ${
              includeGrease ? 'border-emerald-300 bg-emerald-50/50' : 'border-slate-200 bg-white'
            }`} onClick={() => updateConfig({ includeGrease: !includeGrease })}>
              {greaseItem.image_url ? (
                <img src={greaseItem.image_url} alt={greaseItem.name} className="h-12 w-12 flex-shrink-0 rounded-lg border border-slate-200 bg-white object-contain" />
              ) : (
                <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white">
                  <Droplets className="h-5 w-5 text-amber-600" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-[#01312d]">{greaseItem.name}</div>
                <div className="text-xs text-[#6b8478] mt-0.5">Prevents seizing &amp; ensures correct installation. One per sail.</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="text-sm font-bold text-[#01312d]">{formatCurrency(greaseLivePrice, currency)}</span>
                <div className={`flex h-5 w-5 items-center justify-center rounded border-2 transition ${
                  includeGrease ? 'border-emerald-500 bg-emerald-500' : 'border-slate-300 bg-white'
                }`}>
                  {includeGrease && <svg className="h-3 w-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>
              </div>
            </div>
          )}

          {config.corners > 0 && (
            <div className="mt-3 rounded-xl bg-slate-100 p-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Hardware Cost (added to total):</span>
              <span className="text-lg font-bold text-[#D97706]">{formatCurrency((calculations.hardwareBreakdown?.hardwareOnlyLivePrice || 0), config.currency)}</span>
            </div>
          )}
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-3 pt-4 border-t border-[#dfe7e1]">
        {(showBackButton || onSaveQuote) && (
          <div className="grid grid-cols-2 gap-2">
            {showBackButton && (
              <Button variant="outline" onClick={onPrev} className="text-sm w-full">
                Back
              </Button>
            )}
            {onSaveQuote && (
              <SaveProgressButton onClick={onSaveQuote} className="w-full" />
            )}
          </div>
        )}
        {mobileGuidance?.currentHighlightTarget === 'continue-button-hardware' ? (
          <div className="energy-border-chase-btn w-full" id="continue-button-hardware" data-guidance-id="continue-button-hardware">
            <Button
              onClick={() => { mobileGuidance?.clearHighlight(); onNext?.(); }}
              disabled={mode === 'manual' && !allManualConfigured}
              className="text-sm w-full py-4"
            >
              Continue{nextStepTitle ? ` \u2192 ${nextStepTitle}` : ''}
            </Button>
          </div>
        ) : (
          <Button
            onClick={() => { mobileGuidance?.clearHighlight(); onNext?.(); }}
            id="continue-button-hardware"
            data-guidance-id="continue-button-hardware"
            disabled={mode === 'manual' && !allManualConfigured}
            className="text-sm w-full py-4"
          >
            Continue{nextStepTitle ? ` \u2192 ${nextStepTitle}` : ''}
          </Button>
        )}
      </div>

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

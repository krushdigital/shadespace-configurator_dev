import React, { useState, useRef } from 'react';
import { ConfiguratorState, ShadeCalculations, CornerHardwareLine } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SlidersHorizontal, Package, CheckCircle2, Ban, Info } from 'lucide-react';
import { HardwareSelectionModal } from '../HardwareSelectionModal';
import { SaveProgressButton } from '../SaveProgressButton';
import { ShapeCanvas } from '../ShapeCanvas';
import { StandardPackPreview, HARDWARE_PACK_IMAGES } from '../StandardPackPreview';
import { useHardwareCatalog, getDefaultPack, HardwareItem } from '../../hooks/useHardwareCatalog';
import { formatCurrency } from '../../utils/currencyFormatter';
import { PricingSetting } from '../../hooks/usePricingSettings';

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

  const isExact = config.measurementOption === 'exact';
  const allowNone = isExact;
  const allowStandard = !isExact;
  const mode: 'standard' | 'manual' | 'none' =
    config.hardwareSelectionMode
    ?? (config.measurementOption === 'adjust' ? 'standard' : 'none');
  const edgeType = (config.edgeType as 'webbing' | 'cabled') || 'webbing';
  const pack = getDefaultPack(packs, edgeType, config.corners);

  React.useEffect(() => {
    if (!allowNone && config.hardwareSelectionMode === 'none') {
      updateConfig({ hardwareSelectionMode: 'standard', cornerHardware: {} });
    }
    if (!allowStandard && config.hardwareSelectionMode === 'standard') {
      updateConfig({ hardwareSelectionMode: 'none', cornerHardware: {} });
    }
  }, [allowNone, allowStandard, config.hardwareSelectionMode, updateConfig]);

  const cornerHardware = config.cornerHardware || {};
  const configuredCount = Array.from({ length: config.corners }, (_, i) => cornerHardware[i]?.length || 0).filter(n => n > 0).length;
  const allManualConfigured = mode === 'manual' ? configuredCount === config.corners : true;

  React.useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && mode) {
      if (mode === 'manual' && !allManualConfigured) return;
      mobileGuidance.scrollToElement('continue-button-hardware', 400);
      mobileGuidance.setHighlightTarget('continue-button-hardware');
    }
  }, [mode, allManualConfigured, mobileGuidance?.isGuidanceActive]);

  const setMode = (next: 'standard' | 'manual' | 'none') => {
    if (next === 'none' && !allowNone) return;
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
    return lines.slice(0, 3).map(l => `${l.qty}× ${l.name}`).join(', ') + (lines.length > 3 ? ` +${lines.length - 3} more` : '');
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

  const packLines = React.useMemo(() => {
    if (!pack) return [];
    return pack.items
      .map(p => ({ item: itemsById.get(p.catalog_id), qty: p.qty }))
      .filter((row): row is { item: HardwareItem; qty: number } => !!row.item);
  }, [pack, itemsById]);

  const handleHoverCorner = (i: number | null) => {
    if (setHighlightedCorner) setHighlightedCorner(i);
  };

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#01312d]">Corner Hardware Selection</h2>
          <p className="mt-1 text-sm text-[#6b8478]">
            {isExact
              ? 'Manually pick per corner, or continue without hardware.'
              : 'Choose a hardware tensioning kit or manually pick per corner.'}
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

      <div className={`grid grid-cols-1 gap-3 ${allowStandard && allowNone ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>
        {allowStandard && (
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
                    className="h-14 w-14 flex-shrink-0 rounded-lg border border-slate-200 bg-white object-contain"
                  />
                ) : (
                  <div className="h-14 w-14 flex-shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
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
                </div>
                {mode === 'standard' && <CheckCircle2 className="h-5 w-5 text-[#2e7d4f] flex-shrink-0" />}
              </div>
            )}
          </StandardPackPreview>
        )}

        {allowNone && <button
          type="button"
          onClick={() => setMode('none')}
          className={`rounded-xl border-2 p-4 text-left transition ${
            mode === 'none' ? 'border-[#2e7d4f] bg-[#2e7d4f]/5' : 'border-[#dfe7e1] bg-white hover:border-[#7bb08f]'
          }`}
        >
          <div className="flex items-center justify-between">
            <Ban className="h-6 w-6 text-[#2e7d4f]" />
            {mode === 'none' && <CheckCircle2 className="h-5 w-5 text-[#2e7d4f]" />}
          </div>
          <div className="mt-2 text-sm font-bold text-[#01312d]">No Hardware</div>
          <div className="mt-0.5 text-xs text-[#6b8478]">Sail only — corner D-rings only, source hardware separately.</div>
        </button>}

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

      {mode === 'standard' && !pack && (
        <Card className="p-4">
          <div className="text-sm text-[#6b8478]">Standard pack details are unavailable — please contact support.</div>
        </Card>
      )}

      {mode === 'manual' && (
        <div ref={manualPanelRef} className="scroll-mt-4">
        <Card className="p-4">
          <div className="lg:hidden mb-4">
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
          <p className="mb-3 text-sm text-[#6b8478] hidden lg:block">Hover over a corner row to highlight it on the diagram. Click to select hardware.</p>
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

          {config.corners > 0 && (
            <div className="mt-4 rounded-xl bg-slate-100 p-3 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Hardware Cost (added to total):</span>
              <span className="text-lg font-bold text-[#D97706]">{formatCurrency(calculations.hardwareBreakdown?.hardwareOnlyLivePrice || 0, config.currency)}</span>
            </div>
          )}
        </Card>
        </div>
      )}

      {/* Live total price preview */}
      {calculations.totalPrice > 0 && (
        <div className="flex items-center justify-between px-4 py-3 bg-[#eef5ef] border border-[#2e7d4f]/30 rounded-xl mt-4 mb-2 transition-all duration-300">
          <span className="text-sm font-medium text-[#01312D]">Estimated total</span>
          <span className="text-lg font-bold text-[#01312D]">{formatCurrency(calculations.totalPrice, config.currency)}</span>
        </div>
      )}

      <div className="pt-2">
        <div className="flex sm:hidden flex-col gap-3">
          <div className="flex gap-3">
            {showBackButton && (
              <Button variant="outline" size="md" onClick={onPrev} className="flex-1">
                Back
              </Button>
            )}
            {onSaveQuote && (
              <SaveProgressButton onClick={onSaveQuote} className="flex-1" />
            )}
          </div>
          {mobileGuidance?.currentHighlightTarget === 'continue-button-hardware' ? (
            <div className="energy-border-chase-btn w-full" id="continue-button-hardware" data-guidance-id="continue-button-hardware">
              <Button
                onClick={() => { mobileGuidance?.clearHighlight(); onNext?.(); }}
                size="md"
                disabled={mode === 'manual' && !allManualConfigured}
                className="w-full py-4"
              >
                <span className="flex flex-col items-center leading-tight">
                  <span>Continue</span>
                  {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
                </span>
              </Button>
            </div>
          ) : (
            <Button
              onClick={() => { mobileGuidance?.clearHighlight(); onNext?.(); }}
              size="md"
              id="continue-button-hardware"
              data-guidance-id="continue-button-hardware"
              disabled={mode === 'manual' && !allManualConfigured}
              className="w-full py-4"
            >
              <span className="flex flex-col items-center leading-tight">
                <span>Continue</span>
                {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
              </span>
            </Button>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-4">
          {showBackButton && (
            <Button variant="outline" size="md" onClick={onPrev} className="w-auto">
              Back
            </Button>
          )}
          {onSaveQuote && (
            <SaveProgressButton onClick={onSaveQuote} className="w-auto" />
          )}
          <Button
            onClick={onNext}
            size="md"
            disabled={mode === 'manual' && !allManualConfigured}
            className="flex-1"
          >
            <span className="flex flex-col items-center leading-tight">
              <span>Continue</span>
              {nextStepTitle && <span className="text-[10px] opacity-80 font-normal">to {nextStepTitle}</span>}
            </span>
          </Button>
        </div>
      </div>

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

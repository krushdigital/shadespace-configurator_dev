import React, { useState } from 'react';
import { ConfiguratorState, ShadeCalculations, CornerHardwareLine } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SlidersHorizontal, Package, CheckCircle2, Ban, Info } from 'lucide-react';
import { HardwareSelectionModal } from '../HardwareSelectionModal';
import { StandardPackPreview, HARDWARE_PACK_IMAGES } from '../StandardPackPreview';
import { useHardwareCatalog, getDefaultPack, HardwareItem } from '../../hooks/useHardwareCatalog';
import { formatCurrency } from '../../utils/currencyFormatter';
import { getPricingForCurrency, PricingSetting } from '../../hooks/usePricingSettings';

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
}: HardwareContentProps) {
  const { items, categories, packs, loading } = useHardwareCatalog();
  const [modalCorner, setModalCorner] = useState<number | null>(null);
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

  const pricing = pricingSettingsMap
    ? getPricingForCurrency(pricingSettingsMap, config.currency)
    : { marketMarkup: 1, zonosDhlMarkup: 1, exchangeRate: 1, symbol: 'NZ$' };
  const toDisplayPrice = (priceNzd: number) => {
    const base = Number(priceNzd) || 0;
    const factor = pricing.marketMarkup * pricing.exchangeRate + (pricing.zonosDhlMarkup - 1) * pricing.exchangeRate;
    return base * factor;
  };

  const cornerHardware = config.cornerHardware || {};
  const configuredCount = Array.from({ length: config.corners }, (_, i) => cornerHardware[i]?.length || 0).filter(n => n > 0).length;
  const allManualConfigured = mode === 'manual' ? configuredCount === config.corners : true;

  const setMode = (next: 'standard' | 'manual' | 'none') => {
    if (next === 'none' && !allowNone) return;
    const updates: Partial<ConfiguratorState> = { hardwareSelectionMode: next };
    if (next !== 'manual') {
      updates.cornerHardware = {};
    }
    updateConfig(updates);
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
    const lines = cornerHardware[cornerIndex] || [];
    const nzd = lines.reduce((s, l) => s + l.priceNzd * l.qty, 0);
    return formatCurrency(toDisplayPrice(nzd), config.currency);
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
    <div className="p-4 sm:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#01312D]">Corner Hardware Selection</h2>
          <p className="mt-1 text-sm text-slate-600">
            {isExact
              ? 'Manually pick per corner, or continue without hardware.'
              : 'Choose a hardware tensioning kit or manually pick per corner.'}
          </p>
        </div>
        {mode === 'manual' && (
          <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            allManualConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
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
              mode === 'standard' ? 'border-[#307C31] bg-[#307C31]/5' : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-start gap-3 w-full">
              {HARDWARE_PACK_IMAGES[config.corners] ? (
                <img
                  src={HARDWARE_PACK_IMAGES[config.corners]}
                  alt={`${config.corners} corner hardware kit`}
                  className="h-14 w-14 flex-shrink-0 rounded-lg border border-slate-200 bg-white object-contain"
                />
              ) : (
                <div className="h-14 w-14 flex-shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
                  <Package className="h-6 w-6 text-[#307C31]" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-sm font-bold text-slate-900">Hardware Tensioning Kit</span>
                  <Info className="h-4 w-4 text-slate-400" />
                </div>
                <div className="mt-0.5 text-xs text-slate-600">Curated set for your sail.</div>
              </div>
              {mode === 'standard' && <CheckCircle2 className="h-5 w-5 text-[#307C31] flex-shrink-0" />}
            </div>
          </StandardPackPreview>
        )}

        <button
          type="button"
          onClick={() => setMode('manual')}
          className={`rounded-xl border-2 p-4 text-left transition ${
            mode === 'manual' ? 'border-[#307C31] bg-[#307C31]/5' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <SlidersHorizontal className="h-6 w-6 text-[#307C31]" />
            {mode === 'manual' && <CheckCircle2 className="h-5 w-5 text-[#307C31]" />}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">Manual per corner</div>
          <div className="mt-0.5 text-xs text-slate-600">Pick specific hardware per corner.</div>
        </button>

        {allowNone && <button
          type="button"
          onClick={() => setMode('none')}
          className={`rounded-xl border-2 p-4 text-left transition ${
            mode === 'none' ? 'border-[#307C31] bg-[#307C31]/5' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <Ban className="h-6 w-6 text-[#307C31]" />
            {mode === 'none' && <CheckCircle2 className="h-5 w-5 text-[#307C31]" />}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">No Hardware</div>
          <div className="mt-0.5 text-xs text-slate-600">Sail only — corner D-rings only, source hardware separately.</div>
        </button>}
      </div>

      {mode === 'standard' && !pack && (
        <Card className="p-4">
          <div className="text-sm text-slate-600">Standard pack details are unavailable — please contact support.</div>
        </Card>
      )}

      {mode === 'manual' && (
        <Card className="p-4">
          <p className="mb-3 text-sm text-slate-600">Hover over a corner row to highlight it on the diagram. Click to select hardware.</p>
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
                        <div className="text-sm font-semibold text-slate-900 line-clamp-1">{preview}</div>
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
              <span className="text-lg font-bold text-[#D97706]">{formatCurrency(toDisplayPrice(calculations.hardwareBreakdown?.subtotalNzd || 0), config.currency)}</span>
            </div>
          )}
        </Card>
      )}

      {mode === 'none' && (
        <Card className="p-4 border-amber-200 bg-amber-50/60">
          <div className="flex items-start gap-3">
            <Ban className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-sm font-bold text-slate-900">No hardware selected</div>
              <div className="text-xs text-slate-700 mt-1">
                Your sail will ship with corner D-rings sewn in. You will need to source tensioning hardware separately.
              </div>
            </div>
          </div>
        </Card>
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2">
        {showBackButton ? <Button variant="secondary" onClick={onPrev}>Back</Button> : <span />}
        <Button
          onClick={onNext}
          disabled={mode === 'manual' && !allManualConfigured}
          className="min-w-[180px]"
        >
          {nextStepTitle ? `Next: ${nextStepTitle}` : 'Next'}
        </Button>
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

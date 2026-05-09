import React, { useState } from 'react';
import { ConfiguratorState, ShadeCalculations, CornerHardwareLine } from '../../types';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { SlidersHorizontal, Package, CheckCircle2, Wrench } from 'lucide-react';
import { HardwareSelectionModal } from '../HardwareSelectionModal';
import { useHardwareCatalog, getDefaultPack } from '../../hooks/useHardwareCatalog';
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
}: HardwareContentProps) {
  const { items, categories, packs, loading } = useHardwareCatalog();
  const [modalCorner, setModalCorner] = useState<number | null>(null);
  const mode = config.hardwareSelectionMode || 'standard';
  const edgeType = (config.edgeType as 'webbing' | 'cabled') || 'webbing';
  const pack = getDefaultPack(packs, edgeType, config.corners);

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
  const allConfigured = mode === 'standard' || configuredCount === config.corners;

  const setMode = (next: 'standard' | 'manual') => {
    updateConfig({ hardwareSelectionMode: next });
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

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-[#01312D]">Corner Hardware Selection</h2>
          <p className="mt-1 text-sm text-slate-600">
            Choose the standard pack or manually pick hardware for each corner.
          </p>
        </div>
        {mode === 'manual' && (
          <span className={`flex-shrink-0 rounded-full px-3 py-1 text-xs font-semibold ${
            allConfigured ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}>
            {configuredCount}/{config.corners} configured
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setMode('standard')}
          className={`rounded-xl border-2 p-4 text-left transition ${
            mode === 'standard' ? 'border-[#307C31] bg-[#307C31]/5' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <Package className="h-6 w-6 text-[#307C31]" />
            {mode === 'standard' && <CheckCircle2 className="h-5 w-5 text-[#307C31]" />}
          </div>
          <div className="mt-2 text-sm font-bold text-slate-900">Standard Hardware Pack</div>
          <div className="mt-0.5 text-xs text-slate-600">Curated set for your sail — same pack every corner.</div>
          {pack?.price_nzd_override != null && (
            <div className="mt-2 text-sm font-bold text-[#D97706]">
              {formatCurrency(toDisplayPrice(Number(pack.price_nzd_override)), config.currency)}
            </div>
          )}
        </button>

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
          <div className="mt-0.5 text-xs text-slate-600">Pick specific hardware for each corner of your sail.</div>
        </button>
      </div>

      {mode === 'manual' && (
        <Card className="p-4">
          <p className="mb-3 text-sm text-slate-600">Click on a corner below or on the diagram to select hardware.</p>
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
              <span className="text-sm font-semibold text-slate-700">Total Hardware Cost (all corners):</span>
              <span className="text-lg font-bold text-[#D97706]">{formatCurrency(toDisplayPrice(calculations.hardwareBreakdown?.subtotalNzd || 0), config.currency)}</span>
            </div>
          )}
        </Card>
      )}

      {mode === 'standard' && pack && (
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <Wrench className="h-5 w-5 text-[#307C31] flex-shrink-0" />
            <div className="flex-1">
              <div className="text-sm font-bold text-slate-900">{pack.name}</div>
              <div className="text-xs text-slate-600">Applied evenly across all {config.corners} corners.</div>
            </div>
            {pack.price_nzd_override != null && (
              <div className="text-lg font-bold text-[#D97706] flex-shrink-0">
                {formatCurrency(toDisplayPrice(Number(pack.price_nzd_override)), config.currency)}
              </div>
            )}
          </div>
        </Card>
      )}

      <div className="flex flex-col-reverse sm:flex-row justify-between gap-2 pt-2">
        {showBackButton ? <Button variant="secondary" onClick={onPrev}>Back</Button> : <span />}
        <Button
          onClick={onNext}
          disabled={mode === 'manual' && !allConfigured}
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

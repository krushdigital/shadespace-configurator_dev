import React, { useState, useMemo } from 'react';
import { ConfiguratorState, ShadeCalculations, CornerHardwareLine } from '../../types';
import { Button } from '../ui/Button';
import { SaveProgressButton } from '../SaveProgressButton';
import { useHardwareCatalog, getDefaultPack, getLivePackPrice, HardwareItem } from '../../hooks/useHardwareCatalog';
import { HardwareSelectionModal } from '../HardwareSelectionModal';
import { StandardPackPreview, HARDWARE_PACK_IMAGES } from '../StandardPackPreview';
import { formatCurrency } from '../../utils/currencyFormatter';
import { EXCHANGE_RATES } from '../../data/pricing';
import { Package, SlidersHorizontal, CheckCircle2, Info } from 'lucide-react';
import { PricingSetting } from '../../hooks/usePricingSettings';

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
}: FixedShapeHardwareContentProps) {
  const { items: catalogItems, categories, packs, loading } = useHardwareCatalog();
  const [modalOpen, setModalOpen] = useState(false);

  const currency = config.currency || 'NZD';
  const exchangeRate = EXCHANGE_RATES[currency] || 1;
  const edgeType = (config.edgeType as 'webbing' | 'cabled') || 'webbing';
  const pack = getDefaultPack(packs, edgeType, config.corners);

  const mode: 'standard' | 'manual' | 'none' = config.hardwareSelectionMode ?? 'none';

  const itemsById = useMemo(() => {
    const m = new Map<string, HardwareItem>();
    for (const it of catalogItems) m.set(it.id, it);
    return m;
  }, [catalogItems]);

  const setMode = (next: 'standard' | 'manual' | 'none') => {
    const updates: Partial<ConfiguratorState> = { hardwareSelectionMode: next };
    if (next === 'standard') {
      updates.cornerHardware = {};
    } else if (next === 'none') {
      updates.cornerHardware = {};
    }
    updateConfig(updates);
  };

  const confirmSelection = (lines: CornerHardwareLine[], _applyToAll: boolean) => {
    const next: { [cornerIndex: number]: CornerHardwareLine[] } = {};
    for (let i = 0; i < config.corners; i++) {
      next[i] = lines.map(l => ({ ...l }));
    }
    updateConfig({ hardwareSelectionMode: 'manual', cornerHardware: next });
    setModalOpen(false);
  };

  const cornerHardware = config.cornerHardware || {};
  const manualLines = cornerHardware[0] || [];
  const totalManualPrice = manualLines.reduce((sum, l) => sum + (l.livePrice || 0), 0) * config.corners;

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-4">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-[#01312D]">Hardware (Recommended)</h2>
        <p className="mt-1 text-sm text-slate-600">
          Add mounting hardware to your order. Skip this if you already have your own.
        </p>
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
              mode === 'standard' ? 'border-[#307C31] bg-[#307C31]/5' : 'border-slate-200 bg-white hover:border-slate-300'
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
                    <Package className="h-6 w-6 text-[#307C31]" />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900">Hardware Tensioning Kit</span>
                    <span
                      role="button"
                      tabIndex={0}
                      aria-label="View hardware kit contents"
                      onClick={(e) => openInfo(e)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') openInfo(e);
                      }}
                      className="inline-flex items-center justify-center -m-1 p-1 rounded-full text-slate-400 hover:text-[#307C31] hover:bg-slate-100 cursor-pointer"
                    >
                      <Info className="h-4 w-4" />
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600">Curated set for your sail.</div>
                  {(() => {
                    const packPrice = getLivePackPrice(pack, currency, exchangeRate);
                    return packPrice ? (
                      <p className="text-sm font-bold text-slate-900 mt-1">{formatCurrency(packPrice, currency)}</p>
                    ) : null;
                  })()}
                </div>
                {mode === 'standard' && <CheckCircle2 className="h-5 w-5 text-[#307C31] flex-shrink-0" />}
              </div>
            )}
          </StandardPackPreview>
        )}

        {/* Choose Manually Card */}
        <button
          type="button"
          onClick={() => {
            if (mode !== 'manual') setMode('manual');
            setModalOpen(true);
          }}
          className={`relative w-full rounded-xl border-2 p-4 text-left transition cursor-pointer ${
            mode === 'manual' ? 'border-[#307C31] bg-[#307C31]/5' : 'border-slate-200 bg-white hover:border-slate-300'
          }`}
        >
          <div className="flex items-start gap-3 w-full">
            <div className="h-14 w-14 flex-shrink-0 rounded-lg border border-slate-200 bg-white flex items-center justify-center">
              <SlidersHorizontal className="h-6 w-6 text-slate-600" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-slate-900">Choose Manually</span>
              <div className="mt-0.5 text-xs text-slate-600">Pick individual hardware items.</div>
              {mode === 'manual' && manualLines.length > 0 && (
                <p className="text-xs text-[#307C31] font-medium mt-1">
                  {manualLines.length} item{manualLines.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            {mode === 'manual' && <CheckCircle2 className="h-5 w-5 text-[#307C31] flex-shrink-0" />}
          </div>
        </button>
      </div>

      {/* Manual selection summary */}
      {mode === 'manual' && manualLines.length > 0 && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Selected hardware (applied to all corners)</span>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-xs text-[#307C31] font-semibold hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="divide-y divide-slate-200">
            {manualLines.map((line, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-slate-700">{line.qty}x {line.name}</span>
                <span className="font-medium text-slate-900">{formatCurrency(line.livePrice || 0, currency)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-200">
            <span className="text-sm font-semibold text-slate-700">Total ({config.corners} corners)</span>
            <span className="text-sm font-bold text-slate-900">{formatCurrency(totalManualPrice, currency)}</span>
          </div>
        </div>
      )}

      {/* Navigation */}
      <div className="flex flex-col gap-3 pt-4 border-t border-gray-100">
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
        <Button onClick={onNext} className="text-sm w-full">
          Continue{nextStepTitle ? ` → ${nextStepTitle}` : ''}
        </Button>
      </div>

      {/* Hardware Selection Modal */}
      <HardwareSelectionModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        cornerIndex={0}
        totalCorners={config.corners}
        items={catalogItems}
        categories={categories}
        initialSelection={manualLines}
        onConfirm={confirmSelection}
        currency={currency}
        pricingSettingsMap={pricingSettingsMap}
      />
    </div>
  );
}

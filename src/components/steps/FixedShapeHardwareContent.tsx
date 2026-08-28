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
  mobileGuidance,
}: FixedShapeHardwareContentProps) {
  const { items: catalogItems, categories, packs, loading } = useHardwareCatalog();
  const [modalOpen, setModalOpen] = useState(false);

  const currency = config.currency || 'NZD';
  const exchangeRate = EXCHANGE_RATES[currency] || 1;
  const edgeType = (config.edgeType as 'webbing' | 'cabled') || 'webbing';
  const pack = getDefaultPack(packs, edgeType, config.corners);

  const mode: 'standard' | 'manual' | 'none' = config.hardwareSelectionMode ?? 'none';

  React.useEffect(() => {
    if (mobileGuidance?.isGuidanceActive && mode) {
      mobileGuidance.scrollToElement('continue-button-hardware', 400);
      mobileGuidance.setHighlightTarget('continue-button-hardware');
    }
  }, [mode, mobileGuidance?.isGuidanceActive]);

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
  const totalManualPrice = manualLines.reduce((sum, l) => sum + (l.livePrice || 0) * l.qty, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-[#2e7d4f] rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-5 sm:p-6 space-y-5">
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-[#01312d]">Hardware (Recommended)</h2>
        <p className="mt-1 text-sm text-[#6b8478]">
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
                    const packPrice = getLivePackPrice(pack, currency, exchangeRate);
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

        {/* Choose Manually Card */}
        <button
          type="button"
          onClick={() => {
            if (mode !== 'manual') setMode('manual');
            setModalOpen(true);
          }}
          className={`relative w-full rounded-xl border-2 p-4 text-left transition cursor-pointer ${
            mode === 'manual' ? 'border-[#2e7d4f] bg-[#2e7d4f]/5' : 'border-[#dfe7e1] bg-white hover:border-[#7bb08f]'
          }`}
        >
          <div className="flex items-start gap-3 w-full">
            <div className="h-14 w-14 flex-shrink-0 rounded-lg border border-[#dfe7e1] bg-white flex items-center justify-center">
              <SlidersHorizontal className="h-6 w-6 text-[#6b8478]" />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold text-[#01312d]">Choose Manually</span>
              <div className="mt-0.5 text-xs text-[#6b8478]">Pick individual hardware items.</div>
              {mode === 'manual' && manualLines.length > 0 && (
                <p className="text-xs text-[#2e7d4f] font-medium mt-1">
                  {manualLines.length} item{manualLines.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
            {mode === 'manual' && <CheckCircle2 className="h-5 w-5 text-[#2e7d4f] flex-shrink-0" />}
          </div>
        </button>
      </div>

      {/* Manual selection summary */}
      {mode === 'manual' && manualLines.length > 0 && (
        <div className="rounded-lg border border-[#dfe7e1] bg-[#fbfdfb] p-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Selected hardware (applied to all corners)</span>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="text-xs text-[#2e7d4f] font-semibold hover:underline"
            >
              Edit
            </button>
          </div>
          <div className="divide-y divide-[#dfe7e1]">
            {manualLines.map((line, idx) => (
              <div key={idx} className="flex items-center justify-between py-1.5 text-sm">
                <span className="text-slate-700">{line.qty}x {line.name}</span>
                <span className="font-medium text-[#01312d]">{formatCurrency((line.livePrice || 0) * line.qty, currency)}</span>
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-[#dfe7e1]">
            <span className="text-sm font-semibold text-slate-700">Hardware Total</span>
            <span className="text-sm font-bold text-[#01312d]">{formatCurrency(totalManualPrice, currency)}</span>
          </div>
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
            <Button onClick={() => { mobileGuidance?.clearHighlight(); onNext?.(); }} className="text-sm w-full py-4">
              Continue{nextStepTitle ? ` \u2192 ${nextStepTitle}` : ''}
            </Button>
          </div>
        ) : (
          <Button onClick={() => { mobileGuidance?.clearHighlight(); onNext?.(); }} id="continue-button-hardware" data-guidance-id="continue-button-hardware" className="text-sm w-full py-4">
            Continue{nextStepTitle ? ` \u2192 ${nextStepTitle}` : ''}
          </Button>
        )}
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
        isWholeKit
      />
    </div>
  );
}

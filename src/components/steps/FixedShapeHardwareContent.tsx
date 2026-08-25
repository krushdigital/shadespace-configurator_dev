import React, { useState, useMemo } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { SaveProgressButton } from '../SaveProgressButton';
import { useHardwareCatalog, getDefaultPack, getLiveHardwarePrice, getLivePackPrice, HardwareItem, HardwarePack } from '../../hooks/useHardwareCatalog';
import { formatCurrency } from '../../utils/currencyFormatter';
import { EXCHANGE_RATES } from '../../data/pricing';
import { Package, Plus, Minus, Info, X, CheckCircle2 } from 'lucide-react';
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

interface HardwareSelection {
  [catalogId: string]: number;
}

type SelectionMode = 'pack' | 'items' | 'none' | null;

function HardwareItemModal({ item, currency, exchangeRate, onClose }: { item: HardwareItem; currency: string; exchangeRate: number; onClose: () => void }) {
  const price = getLiveHardwarePrice(item, currency, exchangeRate);
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="relative">
          {item.image_url && (
            <img src={item.image_url} alt={item.name} className="w-full h-48 object-contain bg-gray-50 rounded-t-2xl" />
          )}
          <button onClick={onClose} className="absolute top-3 right-3 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          <h3 className="text-lg font-semibold text-gray-900">{item.name}</h3>
          {item.sku && <p className="text-xs text-gray-400">SKU: {item.sku}</p>}
          <p className="text-sm text-gray-600">{item.long_description || item.short_description}</p>
          {item.material && (
            <p className="text-sm text-gray-500"><span className="font-medium">Material:</span> {item.material}</p>
          )}
          <p className="text-lg font-bold text-gray-900">{formatCurrency(price, currency)}</p>
        </div>
      </div>
    </div>
  );
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
  const { items: catalogItems, packs, loading } = useHardwareCatalog();
  const [mode, setMode] = useState<SelectionMode>(() => {
    if (config.hardwareSelectionMode === 'none') return 'none';
    if (config.cornerHardware && Object.values(config.cornerHardware).some(l => l.length > 0)) return 'items';
    return null;
  });
  const [selections, setSelections] = useState<HardwareSelection>(() => {
    const existing: HardwareSelection = {};
    if (config.cornerHardware) {
      Object.values(config.cornerHardware).forEach(lines => {
        lines.forEach(line => {
          existing[line.catalogId] = (existing[line.catalogId] || 0) + line.qty;
        });
      });
    }
    return existing;
  });
  const [detailItem, setDetailItem] = useState<HardwareItem | null>(null);

  const currency = config.currency || 'NZD';
  const exchangeRate = EXCHANGE_RATES[currency] || 1;

  const edgeType = config.edgeType || 'webbing';

  // Additional individual items (admin-curated, visible, active)
  const additionalItems = useMemo(() =>
    catalogItems.filter(item =>
      item.edge_types.includes(edgeType) && !item.admin_hidden && item.is_active !== false
    ).sort((a, b) => {
      if (a.is_featured && !b.is_featured) return -1;
      if (!a.is_featured && b.is_featured) return 1;
      return a.display_order - b.display_order;
    }).slice(0, 12),
    [catalogItems, edgeType]
  );

  // Find recommended pack
  const suggestedPack = getDefaultPack(packs, edgeType, config.corners);

  const handleSelectPack = () => {
    if (mode === 'pack') {
      // Deselect pack
      setMode(null);
      setSelections({});
    } else if (suggestedPack) {
      setMode('pack');
      const newSelections: HardwareSelection = {};
      suggestedPack.items.forEach(pi => {
        newSelections[pi.catalog_id] = (newSelections[pi.catalog_id] || 0) + pi.qty;
      });
      setSelections(newSelections);
    }
  };

  const handleToggleItem = (itemId: string) => {
    const currentQty = selections[itemId] || 0;
    if (currentQty > 0) {
      // Deselect
      setSelections(prev => {
        const updated = { ...prev };
        delete updated[itemId];
        return updated;
      });
    } else {
      // Select with qty 1
      setSelections(prev => ({ ...prev, [itemId]: 1 }));
      if (mode !== 'items' && mode !== 'pack') setMode('items');
    }
  };

  const handleQtyChange = (catalogId: string, delta: number) => {
    setSelections(prev => {
      const current = prev[catalogId] || 0;
      const next = Math.max(0, current + delta);
      const updated = { ...prev };
      if (next === 0) {
        delete updated[catalogId];
      } else {
        updated[catalogId] = next;
      }
      return updated;
    });
  };

  const handleContinueWithout = () => {
    setMode('none');
    setSelections({});
  };

  const handleContinue = () => {
    const entries = Object.entries(selections).filter(([, qty]) => qty > 0);
    if (entries.length === 0 || mode === 'none') {
      updateConfig({ hardwareSelectionMode: 'none', cornerHardware: undefined });
    } else {
      const lines = entries.map(([catalogId, qty]) => {
        const item = catalogItems.find(i => i.id === catalogId);
        return {
          catalogId,
          qty,
          name: item?.name || '',
          sku: item?.sku || null,
          priceNzd: (item?.price_nzd || 0) * qty,
          livePrice: item ? getLiveHardwarePrice(item, currency, exchangeRate) * qty : 0,
          livePriceCurrency: currency,
        };
      });
      const cornerHardware: { [cornerIndex: number]: typeof lines } = {};
      for (let i = 0; i < config.corners; i++) {
        cornerHardware[i] = i === 0 ? lines : [];
      }
      updateConfig({ hardwareSelectionMode: 'manual', cornerHardware });
    }
    onNext?.();
  };

  const totalHardwarePrice = Object.entries(selections).reduce((sum, [catalogId, qty]) => {
    const item = catalogItems.find(i => i.id === catalogId);
    if (!item) return sum;
    return sum + getLiveHardwarePrice(item, currency, exchangeRate) * qty;
  }, 0);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[200px]">
        <div className="animate-spin w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Hardware (Optional)</h3>
        <p className="text-sm text-gray-500 mt-1">Add mounting hardware to your order, or continue without if you already have your own.</p>
      </div>

      {/* Hardware Pack Card - fully clickable */}
      {suggestedPack && (
        <button
          type="button"
          onClick={handleSelectPack}
          className={`w-full text-left rounded-xl border-2 p-4 transition-all duration-200 ${
            mode === 'pack'
              ? 'border-[#307C31] bg-[#307C31]/5 shadow-sm'
              : 'border-gray-200 hover:border-gray-300 hover:shadow-sm bg-white'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${mode === 'pack' ? 'bg-[#307C31]/10' : 'bg-gray-100'}`}>
              <Package className={`w-5 h-5 ${mode === 'pack' ? 'text-[#307C31]' : 'text-gray-500'}`} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">{suggestedPack.name}</span>
                <span className="px-1.5 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded font-medium">Recommended</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Complete tensioning kit for your {config.fixedShapeType?.replace('-', ' ')} shade sail</p>
              {/* Pack contents summary */}
              <div className="mt-2 text-xs text-gray-600">
                {suggestedPack.items.map((pi, idx) => {
                  const item = catalogItems.find(i => i.id === pi.catalog_id);
                  return item ? (
                    <span key={pi.catalog_id}>
                      {idx > 0 && ' · '}
                      {pi.qty}x {item.name}
                    </span>
                  ) : null;
                })}
              </div>
              {(() => {
                const packPrice = getLivePackPrice(suggestedPack, currency, exchangeRate);
                return packPrice ? (
                  <p className="text-sm font-bold text-gray-900 mt-2">{formatCurrency(packPrice, currency)}</p>
                ) : null;
              })()}
            </div>
            {mode === 'pack' && <CheckCircle2 className="h-5 w-5 text-[#307C31] flex-shrink-0 mt-0.5" />}
          </div>
        </button>
      )}

      {/* Additional Individual Items */}
      {additionalItems.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Additional Items</h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {additionalItems.map(item => {
              const qty = selections[item.id] || 0;
              const isSelected = qty > 0;
              const price = getLiveHardwarePrice(item, currency, exchangeRate);
              return (
                <div
                  key={item.id}
                  className={`relative rounded-lg border-2 transition-all duration-150 ${
                    isSelected ? 'border-[#307C31] bg-[#307C31]/5' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  {/* Clickable card area */}
                  <button
                    type="button"
                    onClick={() => handleToggleItem(item.id)}
                    className="w-full text-left p-3"
                  >
                    <div className="flex items-center gap-3">
                      {item.image_url ? (
                        <img src={item.image_url} alt={item.name} className="w-12 h-12 object-contain rounded bg-gray-50 flex-shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Package className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.name}</p>
                        <p className="text-xs text-gray-500 truncate">{item.short_description}</p>
                        <p className="text-sm font-semibold text-gray-800 mt-0.5">{formatCurrency(price, currency)}</p>
                      </div>
                      {isSelected && <CheckCircle2 className="h-5 w-5 text-[#307C31] flex-shrink-0" />}
                    </div>
                  </button>

                  {/* Quantity controls + info (shown when selected) */}
                  {isSelected && (
                    <div className="flex items-center justify-between px-3 pb-3 pt-0">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); setDetailItem(item); }}
                        className="text-xs text-gray-500 hover:text-[#307C31] flex items-center gap-1"
                      >
                        <Info className="w-3.5 h-3.5" />
                        Details
                      </button>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleQtyChange(item.id, -1); }}
                          disabled={qty <= 1}
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-5 text-center text-sm font-semibold text-[#307C31]">{qty}</span>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); handleQtyChange(item.id, 1); }}
                          className="w-6 h-6 flex items-center justify-center rounded-full border border-[#307C31] text-[#307C31] hover:bg-[#307C31]/10"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Info button (when not selected) */}
                  {!isSelected && (
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); setDetailItem(item); }}
                      className="absolute top-3 right-3 p-1 text-gray-400 hover:text-[#307C31]"
                      title="More info"
                    >
                      <Info className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Continue without hardware */}
      <button
        type="button"
        onClick={handleContinueWithout}
        className={`w-full text-center py-3 rounded-lg border-2 text-sm font-medium transition-all ${
          mode === 'none'
            ? 'border-gray-400 bg-gray-50 text-gray-700'
            : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`}
      >
        {mode === 'none' ? 'Continuing without hardware' : 'Continue without hardware'}
      </button>

      {/* Total hardware cost */}
      {totalHardwarePrice > 0 && mode !== 'none' && (
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
          <span className="text-sm font-medium text-gray-700">Hardware total</span>
          <span className="text-base font-bold text-gray-900">{formatCurrency(totalHardwarePrice, currency)}</span>
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between pt-4 border-t border-gray-100">
        <div className="flex items-center gap-2">
          {showBackButton && (
            <Button variant="outline" onClick={onPrev} className="text-sm">
              Back
            </Button>
          )}
          {onSaveQuote && <SaveProgressButton onClick={onSaveQuote} />}
        </div>
        <Button onClick={handleContinue} className="text-sm">
          Continue{nextStepTitle ? ` → ${nextStepTitle}` : ''}
        </Button>
      </div>

      {/* Detail modal */}
      {detailItem && (
        <HardwareItemModal
          item={detailItem}
          currency={currency}
          exchangeRate={exchangeRate}
          onClose={() => setDetailItem(null)}
        />
      )}
    </div>
  );
}

import React, { useState } from 'react';
import { ConfiguratorState, ShadeCalculations } from '../../types';
import { Button } from '../ui/Button';
import { SaveProgressButton } from '../SaveProgressButton';
import { useHardwareCatalog, getDefaultPack, getLiveHardwarePrice, getLivePackPrice, HardwareItem, HardwarePack } from '../../hooks/useHardwareCatalog';
import { formatCurrency } from '../../utils/currencyFormatter';
import { EXCHANGE_RATES } from '../../data/pricing';
import { Package, Plus, Minus, Info, X, Check } from 'lucide-react';
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
  const [selections, setSelections] = useState<HardwareSelection>(() => {
    // Initialize from existing cornerHardware if present
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

  // Filter items suitable for the edge type
  const edgeType = config.edgeType || 'webbing';
  const relevantItems = catalogItems.filter(item =>
    item.edge_types.includes(edgeType) && !item.admin_hidden && item.is_active !== false
  ).sort((a, b) => {
    if (a.is_featured && !b.is_featured) return -1;
    if (!a.is_featured && b.is_featured) return 1;
    return a.display_order - b.display_order;
  }).slice(0, 12);

  // Find a suitable pack
  const suggestedPack = getDefaultPack(packs, edgeType, config.corners);

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

  const handleSelectPack = (pack: HardwarePack) => {
    const newSelections: HardwareSelection = {};
    pack.items.forEach(pi => {
      newSelections[pi.catalog_id] = (newSelections[pi.catalog_id] || 0) + pi.qty;
    });
    setSelections(newSelections);
  };

  // Sync selections back to config on continue
  const handleContinue = () => {
    // Convert flat selections into per-corner hardware format
    const entries = Object.entries(selections).filter(([, qty]) => qty > 0);
    if (entries.length === 0) {
      updateConfig({ hardwareSelectionMode: 'none', cornerHardware: undefined });
    } else {
      // For fixed shapes, assign all hardware to corner 0 as a flat list
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
      // Distribute evenly across corners for pricing compatibility
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
        <p className="text-sm text-gray-500 mt-1">Add mounting hardware to your order. You can skip this step if you already have hardware.</p>
      </div>

      {/* Suggested pack */}
      {suggestedPack && (
        <div className="p-4 rounded-xl border-2 border-blue-100 bg-blue-50/50">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-gray-900 text-sm">{suggestedPack.name}</span>
                <span className="px-1.5 py-0.5 text-xs bg-blue-100 text-blue-700 rounded font-medium">Recommended</span>
              </div>
              <p className="text-xs text-gray-500 mt-0.5">Complete kit for your {config.fixedShapeType?.replace('-', ' ')} shade sail</p>
              {(() => {
                const packPrice = getLivePackPrice(suggestedPack, currency, exchangeRate);
                return packPrice ? (
                  <p className="text-sm font-bold text-gray-900 mt-1">{formatCurrency(packPrice, currency)}</p>
                ) : null;
              })()}
            </div>
            <Button
              variant="outline"
              onClick={() => handleSelectPack(suggestedPack)}
              className="text-xs flex-shrink-0"
            >
              <Check className="w-3.5 h-3.5 mr-1" />
              Select Pack
            </Button>
          </div>
        </div>
      )}

      {/* Individual items grid */}
      <div className="space-y-2">
        <h4 className="text-xs font-medium text-gray-500 uppercase tracking-wide">Or select individual items</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {relevantItems.map(item => {
            const qty = selections[item.id] || 0;
            const price = getLiveHardwarePrice(item, currency, exchangeRate);
            return (
              <div
                key={item.id}
                className={`relative p-3 rounded-lg border-2 transition-all ${
                  qty > 0 ? 'border-blue-400 bg-blue-50/30' : 'border-gray-200 hover:border-gray-300'
                }`}
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
                  <button
                    onClick={() => setDetailItem(item)}
                    className="p-1 text-gray-400 hover:text-blue-600 flex-shrink-0"
                    title="More info"
                  >
                    <Info className="w-4 h-4" />
                  </button>
                </div>

                {/* Quantity controls */}
                <div className="flex items-center justify-end gap-2 mt-2">
                  <button
                    onClick={() => handleQtyChange(item.id, -1)}
                    disabled={qty === 0}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-gray-300 text-gray-600 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <span className={`w-6 text-center text-sm font-semibold ${qty > 0 ? 'text-blue-700' : 'text-gray-400'}`}>{qty}</span>
                  <button
                    onClick={() => handleQtyChange(item.id, 1)}
                    className="w-7 h-7 flex items-center justify-center rounded-full border border-blue-400 text-blue-600 hover:bg-blue-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Total hardware cost */}
      {totalHardwarePrice > 0 && (
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
          <SaveProgressButton onSaveQuote={onSaveQuote} />
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

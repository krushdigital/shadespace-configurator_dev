import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, Minus, Plus, Wrench, Info } from 'lucide-react';
import { Button } from './ui/Button';
import { formatCurrency } from '../utils/currencyFormatter';
import type { CornerHardwareLine } from '../types';
import type { HardwareItem, HardwareCategory, HardwarePack } from '../hooks/useHardwareCatalog';
import { groupItemsByCategory, useHardwareSearch, getLiveHardwarePrice } from '../hooks/useHardwareCatalog';
import { getPricingForCurrency, PricingSetting } from '../hooks/usePricingSettings';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';

interface HardwareSelectionModalProps {
  open: boolean;
  onClose: () => void;
  cornerIndex: number;
  totalCorners: number;
  items: HardwareItem[];
  categories: HardwareCategory[];
  initialSelection: CornerHardwareLine[];
  onConfirm: (selection: CornerHardwareLine[], applyToAll: boolean) => void;
  currency: string;
  pricingSettingsMap?: Record<string, PricingSetting>;
}

interface DraftLine {
  item: HardwareItem;
  qty: number;
}

export function HardwareSelectionModal({
  open,
  onClose,
  cornerIndex,
  totalCorners,
  items,
  categories,
  initialSelection,
  onConfirm,
  currency,
  pricingSettingsMap,
}: HardwareSelectionModalProps) {
  const [query, setQuery] = useState('');
  const [draft, setDraft] = useState<Map<string, DraftLine>>(new Map());
  const [applyToAll, setApplyToAll] = useState(false);
  const [hoverItem, setHoverItem] = useState<HardwareItem | null>(null);
  const [hoverAnchor, setHoverAnchor] = useState<DOMRect | null>(null);
  const [detailItem, setDetailItem] = useState<HardwareItem | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [tooltipPos, setTooltipPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    const next = new Map<string, DraftLine>();
    for (const line of initialSelection) {
      const item = items.find(i => i.id === line.catalogId);
      if (item) next.set(item.id, { item, qty: line.qty });
    }
    setDraft(next);
    setQuery('');
    setApplyToAll(false);
    setHoverItem(null);
    setHoverAnchor(null);
    setDetailItem(null);
    setTooltipPos(null);
  }, [open, initialSelection, items]);

  useBodyScrollLock(open);

  useLayoutEffect(() => {
    if (!hoverItem || !hoverAnchor) {
      setTooltipPos(null);
      return;
    }
    const tooltipEl = tooltipRef.current;
    const tooltipWidth = tooltipEl?.offsetWidth ?? 288;
    const tooltipHeight = tooltipEl?.offsetHeight ?? 260;
    const margin = 12;
    const viewportW = window.innerWidth;
    const viewportH = window.innerHeight;

    let left = hoverAnchor.right + margin;
    if (left + tooltipWidth > viewportW - margin) {
      left = hoverAnchor.left - tooltipWidth - margin;
    }
    left = Math.max(margin, Math.min(left, viewportW - tooltipWidth - margin));

    let top = hoverAnchor.top;
    if (top + tooltipHeight > viewportH - margin) {
      top = viewportH - tooltipHeight - margin;
    }
    top = Math.max(margin, top);

    setTooltipPos({ top, left });
  }, [hoverItem, hoverAnchor]);

  const pricing = pricingSettingsMap
    ? getPricingForCurrency(pricingSettingsMap, currency)
    : { marketMarkup: 1, zonosDhlMarkup: 1, exchangeRate: 1, symbol: 'NZ$' };

  const toDisplayPrice = (item: HardwareItem) =>
    getLiveHardwarePrice(item, currency, pricing.exchangeRate);

  const filtered = useHardwareSearch(items, query);
  const grouped = useMemo(() => groupItemsByCategory(filtered, categories), [filtered, categories]);

  const cornerLetter = String.fromCharCode(65 + cornerIndex);

  const toggle = (item: HardwareItem) => {
    setDraft(prev => {
      const next = new Map(prev);
      if (next.has(item.id)) next.delete(item.id);
      else next.set(item.id, { item, qty: 1 });
      return next;
    });
  };

  const changeQty = (itemId: string, delta: number) => {
    setDraft(prev => {
      const next = new Map(prev);
      const current = next.get(itemId);
      if (!current) return next;
      const q = Math.max(1, Math.min(99, current.qty + delta));
      next.set(itemId, { ...current, qty: q });
      return next;
    });
  };

  const cornerTotalDisplay = useMemo(() => {
    let sum = 0;
    for (const line of draft.values()) sum += toDisplayPrice(line.item) * line.qty;
    return sum;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, currency, pricingSettingsMap]);
  const canAdd = draft.size > 0;

  const handleConfirm = () => {
    const lines: CornerHardwareLine[] = Array.from(draft.values()).map(d => ({
      catalogId: d.item.id,
      qty: d.qty,
      name: d.item.name,
      sku: d.item.sku,
      priceNzd: Number(d.item.price_nzd),
      livePrice: toDisplayPrice(d.item),
      livePriceCurrency: currency,
    }));
    onConfirm(lines, applyToAll);
  };

  if (!open) return null;
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/50 p-3 sm:p-6 overscroll-contain"
      onClick={onClose}
      onWheel={e => e.stopPropagation()}
      onTouchMove={e => e.stopPropagation()}
      style={{ touchAction: 'none' }}
    >
      <div
        className="relative flex w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        style={{ maxHeight: 'min(90vh, 900px)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-[#01312D] text-white font-bold">
              {cornerLetter}
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-slate-900">Corner {cornerLetter} Hardware</h2>
              <p className="text-xs text-slate-500">Select hardware items for this corner</p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-5 pt-4 pb-3">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search and add hardware..."
              className="w-full rounded-full border border-slate-200 bg-slate-50 py-2.5 pl-10 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:border-[#307C31] focus:bg-white focus:outline-none"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 pb-3" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
          {grouped.length === 0 && (
            <div className="py-12 text-center text-sm text-slate-500">No hardware matches your search.</div>
          )}
          {grouped.map(group => (
            <div key={group.category.id} className="mb-4">
              <div className="sticky top-0 z-[1] -mx-5 border-b border-slate-100 bg-white px-5 py-2 text-[11px] font-bold uppercase tracking-wider text-slate-500 shadow-sm">
                {group.category.label}
              </div>
              <div className="space-y-1.5">
                {group.items.map(item => {
                  const selected = draft.has(item.id);
                  const draftLine = draft.get(item.id);
                  const displayPrice = toDisplayPrice(item);
                  return (
                    <div
                      key={item.id}
                      className={`flex items-center gap-2 sm:gap-3 rounded-xl border px-3 py-2.5 transition-colors ${
                        selected ? 'border-[#307C31]/60 bg-[#307C31]/5' : 'border-slate-100 hover:bg-slate-50'
                      }`}
                      onMouseEnter={e => {
                        setHoverItem(item);
                        setHoverAnchor((e.currentTarget as HTMLDivElement).getBoundingClientRect());
                      }}
                      onMouseLeave={() => setHoverItem(prev => (prev?.id === item.id ? null : prev))}
                    >
                      <input
                        type="checkbox"
                        checked={selected}
                        onChange={() => toggle(item)}
                        className="h-5 w-5 flex-shrink-0 rounded border-slate-300 text-[#307C31] focus:ring-[#307C31]"
                      />
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-slate-100">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="h-full w-full object-cover" loading="lazy" />
                        ) : (
                          <Wrench className="h-4 w-4 text-slate-400" />
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => toggle(item)}
                        className="flex-1 text-left"
                      >
                        <div className="text-sm font-semibold text-slate-900 leading-tight line-clamp-1">{item.name}</div>
                        <div className="text-[11px] text-slate-500 line-clamp-1">{item.short_description || item.material}</div>
                      </button>
                      {selected && draftLine && (
                        <div className="flex items-center gap-1 rounded-full border border-slate-200 bg-white px-1 py-0.5">
                          <button
                            type="button"
                            onClick={() => changeQty(item.id, -1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                            aria-label="Decrease quantity"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[20px] text-center text-sm font-semibold text-slate-800">{draftLine.qty}</span>
                          <button
                            type="button"
                            onClick={() => changeQty(item.id, 1)}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100"
                            aria-label="Increase quantity"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      )}
                      <div className="flex-shrink-0 text-right text-sm font-bold text-[#D97706]">
                        {formatCurrency(displayPrice, currency)}
                      </div>
                      <button
                        type="button"
                        onClick={e => {
                          e.stopPropagation();
                          setDetailItem(item);
                        }}
                        aria-label={`More info about ${item.name}`}
                        className="flex-shrink-0 flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#01312D] lg:hidden"
                      >
                        <Info className="h-4 w-4" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {hoverItem && tooltipPos && typeof document !== 'undefined' && createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            className="pointer-events-none fixed z-[90] hidden w-72 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl lg:block"
            style={{ top: tooltipPos.top, left: tooltipPos.left }}
          >
            <div className="mb-3 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
              {hoverItem.image_url ? (
                <img src={hoverItem.image_url} alt={hoverItem.name} className="h-full w-full object-contain" />
              ) : (
                <Wrench className="h-12 w-12 text-slate-300" />
              )}
            </div>
            <div className="text-sm font-bold text-slate-900 leading-tight">{hoverItem.name}</div>
            <div className="mt-1 text-xs text-slate-600 leading-snug">{hoverItem.short_description || hoverItem.long_description}</div>
            <div className="mt-2 space-y-0.5 text-xs text-slate-500">
              <div><span className="font-semibold text-slate-600">Material:</span> {hoverItem.material}</div>
              {hoverItem.deduction_mm > 0 && (
                <div><span className="font-semibold text-slate-600">Deduction:</span> {hoverItem.deduction_mm} mm</div>
              )}
              {hoverItem.sku && (
                <div><span className="font-semibold text-slate-600">SKU:</span> {hoverItem.sku}</div>
              )}
            </div>
            <div className="mt-3 text-lg font-bold text-[#D97706]">{formatCurrency(toDisplayPrice(hoverItem), currency)}</div>
          </div>,
          document.body
        )}

        {detailItem && typeof document !== 'undefined' && createPortal(
          <div
            className="fixed inset-0 z-[85] flex items-end sm:items-center justify-center bg-slate-900/60 p-0 sm:p-4 overscroll-contain"
            onClick={() => setDetailItem(null)}
            onWheel={e => e.stopPropagation()}
            onTouchMove={e => e.stopPropagation()}
            style={{ touchAction: 'none' }}
          >
            <div
              className="relative flex w-full sm:max-w-md flex-col overflow-hidden rounded-t-2xl sm:rounded-2xl bg-white shadow-2xl max-h-[85vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">{detailItem.name}</h3>
                  {detailItem.sku && (
                    <p className="text-xs text-slate-500 mt-0.5">SKU: {detailItem.sku}</p>
                  )}
                </div>
                <button
                  onClick={() => setDetailItem(null)}
                  aria-label="Close"
                  className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4" style={{ touchAction: 'pan-y', WebkitOverflowScrolling: 'touch' }}>
                <div className="mb-3 flex h-48 w-full items-center justify-center overflow-hidden rounded-xl bg-slate-50">
                  {detailItem.image_url ? (
                    <img src={detailItem.image_url} alt={detailItem.name} className="h-full w-full object-contain" />
                  ) : (
                    <Wrench className="h-16 w-16 text-slate-300" />
                  )}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">
                  {detailItem.long_description || detailItem.short_description}
                </p>
                <dl className="mt-4 space-y-1.5 text-sm">
                  {detailItem.material && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Material</dt>
                      <dd className="font-medium text-slate-800 text-right">{detailItem.material}</dd>
                    </div>
                  )}
                  {detailItem.deduction_mm > 0 && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-slate-500">Deduction</dt>
                      <dd className="font-medium text-slate-800 text-right">{detailItem.deduction_mm} mm</dd>
                    </div>
                  )}
                  <div className="flex justify-between gap-3 pt-2 border-t border-slate-100">
                    <dt className="text-slate-500 font-semibold">Price</dt>
                    <dd className="font-bold text-[#D97706] text-right text-base">{formatCurrency(toDisplayPrice(detailItem), currency)}</dd>
                  </div>
                </dl>
              </div>
              <div className="border-t border-slate-100 bg-slate-50 px-5 py-3 grid grid-cols-2 gap-2">
                <Button variant="secondary" onClick={() => setDetailItem(null)}>Close</Button>
                <Button
                  onClick={() => {
                    toggle(detailItem);
                    setDetailItem(null);
                  }}
                >
                  {draft.has(detailItem.id) ? 'Remove' : 'Add'}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}

        <div className="border-t border-slate-100 bg-slate-50 px-5 py-3">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-700">Corner total:</span>
            <span className="text-lg font-bold text-[#D97706]">{formatCurrency(cornerTotalDisplay, currency)}</span>
          </div>
          {totalCorners > 1 && (
            <label className="mb-2 flex items-center gap-2 text-xs text-slate-700">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={e => setApplyToAll(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#307C31] focus:ring-[#307C31]"
              />
              <span>Apply to all {totalCorners} corners</span>
            </label>
          )}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button onClick={handleConfirm} disabled={!canAdd}>Add</Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Package, X } from 'lucide-react';
import { useBodyScrollLock } from '../hooks/useBodyScrollLock';
import type { HardwareItem, HardwarePack } from '../hooks/useHardwareCatalog';

function stripHardwareSize(name: string): string {
  return name.replace(/\s+SS\s+316-\d+mm$/i, '').replace(/\s+-\s*\d+mm$/i, '');
}

export const HARDWARE_PACK_IMAGES: { [key: number]: string } = {
  3: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/hardware-pack-3-corner-sail-276119.jpg?v=1724718113',
  4: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/4-ss-corner-sail.jpg?v=1742362331',
  5: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/5_Corner_Sails.jpg?v=1724717405',
  6: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/6-ss-corner-sail.jpg?v=1742362262',
  7: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/7_Corner_Hardware_kit_3.png?v=1779146929',
  8: 'https://cdn.shopify.com/s/files/1/0778/8730/7969/files/8_Corner_Hardware_kit_2.png?v=1779138488',
};

interface StandardPackPreviewApi {
  openInfo: (e?: React.SyntheticEvent) => void;
}

interface StandardPackPreviewProps {
  pack: HardwarePack | null;
  itemsById: Map<string, HardwareItem>;
  corners: number;
  children: React.ReactNode | ((api: StandardPackPreviewApi) => React.ReactNode);
  triggerClassName?: string;
  onTriggerClick?: () => void;
}

export function StandardPackPreview({ pack, itemsById, corners, children, triggerClassName, onTriggerClick }: StandardPackPreviewProps) {
  const [open, setOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const [coords, setCoords] = useState({ x: 0, y: 0, placement: 'right' as 'right' | 'left' | 'bottom' });
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const width = 340;
    const height = 420;
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    if (spaceRight >= width + 12) {
      setCoords({ x: rect.right + 8, y: Math.max(8, Math.min(window.innerHeight - height - 8, rect.top)), placement: 'right' });
    } else if (spaceLeft >= width + 12) {
      setCoords({ x: rect.left - width - 8, y: Math.max(8, Math.min(window.innerHeight - height - 8, rect.top)), placement: 'left' });
    } else {
      setCoords({ x: Math.max(8, rect.left), y: rect.bottom + 8, placement: 'bottom' });
    }
  };

  const handleOpen = () => {
    updatePosition();
    setOpen(true);
  };

  useBodyScrollLock(open && isMobile);
  const handleClose = () => setOpen(false);

  const packLines = pack
    ? pack.items
        .map(p => ({ item: itemsById.get(p.catalog_id), qty: p.qty }))
        .filter((row): row is { item: HardwareItem; qty: number } => !!row.item)
    : [];

  const image = HARDWARE_PACK_IMAGES[corners];

  const content = pack ? (
    <div className="w-full max-w-[340px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#307C31]" />
            <span className="text-sm font-bold text-slate-900">Hardware Tensioning Kit</span>
          </div>
          <div className="text-xs text-slate-500 mt-0.5">{corners}-corner sail • Included in sail price</div>
        </div>
        {isMobile && (
          <button onClick={handleClose} className="rounded-full p-1 text-slate-500 hover:bg-slate-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      {image && (
        <div className="mb-3 overflow-hidden rounded-lg bg-slate-50">
          <img src={image} alt={`Hardware Tensioning Kit - ${corners} corner`} className="h-40 w-full object-contain" />
        </div>
      )}
      <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">What's included</div>
      {packLines.length > 0 ? (
        <ul className="space-y-1.5">
          {packLines.map(({ item, qty }) => (
            <li key={item.id} className="flex items-center gap-2 text-xs">
              {item.image_url ? (
                <img src={item.image_url} alt="" className="h-6 w-6 rounded object-cover flex-shrink-0 bg-white border border-slate-200" />
              ) : (
                <div className="h-6 w-6 rounded bg-slate-100 flex-shrink-0" />
              )}
              <span className="flex-1 min-w-0 truncate text-slate-800">{stripHardwareSize(item.name)}</span>
              <span className="flex-shrink-0 font-semibold text-slate-600">x {qty}</span>
            </li>
          ))}
        </ul>
      ) : (
        <div className="text-xs text-slate-500">Contents tailored to your sail on order.</div>
      )}
    </div>
  ) : null;

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => {
          if (onTriggerClick) onTriggerClick();
        }}
        onMouseEnter={!isMobile ? handleOpen : undefined}
        onMouseLeave={!isMobile ? handleClose : undefined}
        onFocus={!isMobile ? handleOpen : undefined}
        onBlur={!isMobile ? handleClose : undefined}
        className={triggerClassName ?? "inline-flex items-center gap-1 rounded border-b border-dotted border-slate-400 text-left hover:text-[#01312D] focus:outline-none focus:ring-2 focus:ring-[#307C31] focus:ring-offset-1"}
        aria-expanded={open}
      >
        {typeof children === 'function'
          ? children({
              openInfo: (e?: React.SyntheticEvent) => {
                if (e) {
                  e.stopPropagation();
                  e.preventDefault();
                }
                if (open) handleClose();
                else handleOpen();
              },
            })
          : children}
      </button>
      {open && content && !isMobile && createPortal(
        <div
          data-lenis-prevent
          style={{ position: 'fixed', left: coords.x, top: coords.y, zIndex: 80 }}
          onMouseEnter={handleOpen}
          onMouseLeave={handleClose}
        >
          {content}
        </div>,
        document.body,
      )}
      {open && content && isMobile && createPortal(
        <div data-lenis-prevent className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-900/50 p-0" onClick={handleClose}>
          <div className="w-full" onClick={e => e.stopPropagation()}>
            <div className="rounded-t-2xl bg-white p-4 shadow-2xl max-h-[85vh] overflow-y-auto overscroll-contain">
              {content}
            </div>
          </div>
        </div>,
        document.body,
      )}
    </>
  );
}

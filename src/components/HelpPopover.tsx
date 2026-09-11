import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import { getPortalRoot } from '../utils/appScope';

interface HelpPopoverProps {
  content: React.ReactNode;
  children?: React.ReactNode;
}

export function HelpPopover({ content, children }: HelpPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<ReturnType<typeof setTimeout>>();
  const [position, setPosition] = useState({ top: 0, left: 0, showAbove: false });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 900;
    const popoverWidth = Math.min(360, window.innerWidth - 32);

    let top = rect.bottom + 10;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;
    let showAbove = false;

    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) left = window.innerWidth - 16 - popoverWidth;

    if (top + 200 > window.innerHeight && rect.top > 220) {
      top = rect.top - 10;
      showAbove = true;
    }

    if (isMobile) {
      left = (window.innerWidth - popoverWidth) / 2;
    }

    setPosition({ top, left, showAbove });
  }, []);

  const show = useCallback(() => {
    updatePosition();
    setIsOpen(true);
  }, [updatePosition]);

  const hide = useCallback(() => {
    if (isPinned) return;
    setIsOpen(false);
  }, [isPinned]);

  const handleClick = useCallback(() => {
    if (isPinned) {
      setIsPinned(false);
      setIsOpen(false);
    } else {
      updatePosition();
      setIsPinned(true);
      setIsOpen(true);
    }
  }, [isPinned, updatePosition]);

  const handleMouseEnter = useCallback(() => {
    clearTimeout(hoverTimeoutRef.current);
    if (!isPinned) show();
  }, [isPinned, show]);

  const handleMouseLeave = useCallback(() => {
    if (!isPinned) {
      hoverTimeoutRef.current = setTimeout(hide, 200);
    }
  }, [isPinned, hide]);

  useEffect(() => {
    if (!isPinned) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current && !popoverRef.current.contains(e.target as Node) &&
        triggerRef.current && !triggerRef.current.contains(e.target as Node)
      ) {
        setIsPinned(false);
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isPinned]);

  useEffect(() => {
    return () => clearTimeout(hoverTimeoutRef.current);
  }, []);

  return (
    <>
      <button
        ref={triggerRef}
        onClick={handleClick}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        className="inline-flex items-center justify-center w-[22px] h-[22px] rounded-full bg-brand-green/15 text-brand-green hover:bg-brand-green hover:text-white transition-colors duration-150 ml-2 flex-shrink-0"
        aria-label="Help"
        type="button"
      >
        {children || <span className="text-[11px] font-bold leading-none">?</span>}
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          onMouseEnter={() => clearTimeout(hoverTimeoutRef.current)}
          onMouseLeave={handleMouseLeave}
          className="fixed z-[10000]"
          style={{
            top: position.showAbove ? undefined : position.top,
            bottom: position.showAbove ? `${window.innerHeight - position.top}px` : undefined,
            left: position.left,
            maxWidth: Math.min(360, window.innerWidth - 32),
            animation: 'fade-in-popover 0.15s ease-out',
          }}
        >
          {/* Arrow pointer */}
          {!position.showAbove && (
            <div
              className="w-3 h-3 bg-brand-green rotate-45 absolute -top-1.5"
              style={{ left: triggerRef.current ? triggerRef.current.getBoundingClientRect().left + 15 - position.left : 24 }}
            />
          )}
          <div className="bg-brand-green text-white rounded-2xl shadow-2xl p-4 text-[14px] leading-relaxed relative">
            {isPinned && (
              <button
                onClick={() => { setIsPinned(false); setIsOpen(false); }}
                className="absolute top-3 right-3 text-white/60 hover:text-white transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center -mt-2 -mr-2"
                type="button"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {content}
          </div>
          {/* Arrow pointer below */}
          {position.showAbove && (
            <div
              className="w-3 h-3 bg-brand-green rotate-45 absolute -bottom-1.5"
              style={{ left: triggerRef.current ? triggerRef.current.getBoundingClientRect().left + 15 - position.left : 24 }}
            />
          )}
        </div>,
        getPortalRoot()
      )}
    </>
  );
}

export const STEP_HELP_CONTENT: Record<number, React.ReactNode> = {
  0: (
    <div>
      <p className="font-semibold mb-2">Shape selection</p>
      <p>Choose a standard shape (square, rectangle, triangle) for a precise fit, or select Custom to create any shape with 3-8 fixing points. Custom shapes are made to measure and covered by our Fit Guarantee.</p>
    </div>
  ),
  1: (
    <div>
      <p className="font-semibold mb-2">Choosing your fabric</p>
      <p>We offer a range of shade fabrics to suit different needs. Each fabric has unique properties including UV block rating, shade factor, and fire retardancy. Choose based on your priorities: maximum shade, fire safety, or the best value.</p>
    </div>
  ),
  2: (
    <div>
      <p className="font-semibold mb-2">Measuring your space</p>
      <p>Measure the distance between your fixing points (posts, walls, trees). For custom shapes, measure edge-to-edge between each consecutive point. Diagonal measurements help us verify the shape and are required before checkout.</p>
    </div>
  ),
  3: (
    <div>
      <p className="font-semibold mb-2">Fixed shape dimensions</p>
      <p>Enter the finished size you want for your shade sail. For squares, enter one side length. For rectangles, enter width and depth.</p>
    </div>
  ),
  4: (
    <div>
      <p className="font-semibold mb-2">Edge reinforcement</p>
      <p>The edge type determines how your sail is reinforced around the perimeter. Cabled edges use a steel wire threaded through the hem for maximum tension and a sleek look. Webbing edges use reinforced strapping that is easier to install.</p>
    </div>
  ),
  5: (
    <div>
      <p className="font-semibold mb-2">Hardware &amp; tensioning</p>
      <p>Hardware connects your sail to its fixing points and allows you to tension it properly. Our recommended kit includes everything you need. Advanced users can choose hardware per corner for a custom setup.</p>
    </div>
  ),
  6: (
    <div>
      <p className="font-semibold mb-2">Hardware &amp; tensioning</p>
      <p>Hardware connects your sail to its fixing points and allows you to tension it properly. Our recommended kit includes everything you need for a standard installation.</p>
    </div>
  ),
  7: (
    <div>
      <p className="font-semibold mb-2">Review your configuration</p>
      <p>Check all your selections before adding to cart. You can edit any section by clicking the Edit link. The price shown is all-inclusive: shade sail, hardware, and delivery to your door.</p>
    </div>
  ),
};

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { HelpCircle, X } from 'lucide-react';

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
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const isMobile = window.innerWidth < 900;
    const popoverWidth = Math.min(360, window.innerWidth - 32);

    let top = rect.bottom + 8;
    let left = rect.left + rect.width / 2 - popoverWidth / 2;

    if (left < 16) left = 16;
    if (left + popoverWidth > window.innerWidth - 16) left = window.innerWidth - 16 - popoverWidth;

    if (top + 200 > window.innerHeight && rect.top > 220) {
      top = rect.top - 8;
    }

    if (isMobile) {
      left = (window.innerWidth - popoverWidth) / 2;
    }

    setPosition({ top, left });
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
        className="inline-flex items-center justify-center w-6 h-6 rounded-full text-text-muted hover:text-brand-green hover:bg-surface-soft transition-colors duration-150 ml-1.5 flex-shrink-0"
        aria-label="Help"
        type="button"
      >
        {children || <HelpCircle className="w-[18px] h-[18px]" />}
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          onMouseEnter={() => clearTimeout(hoverTimeoutRef.current)}
          onMouseLeave={handleMouseLeave}
          className="fixed z-[10000] animate-fade-in-popover"
          style={{ top: position.top, left: position.left, maxWidth: Math.min(360, window.innerWidth - 32) }}
        >
          <div className="bg-brand-green text-white rounded-2xl shadow-2xl p-4 text-sm leading-relaxed">
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
        </div>,
        document.body
      )}
    </>
  );
}

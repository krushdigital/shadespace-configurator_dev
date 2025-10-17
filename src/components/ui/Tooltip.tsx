import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onOpen?: () => void;
}

export function Tooltip({ content, children, className = '', onOpen }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const triggerRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      // Check if mobile
      const isMobile = window.innerWidth < 768;
      const tooltipWidth = isMobile ? 280 : 340;
      const tooltipMaxHeight = isMobile ? Math.min(350, window.innerHeight * 0.6) : 500;
      
      // Position tooltip to the right of the trigger, centered vertically
      let x = rect.right + 10;
      let y = rect.top + (rect.height / 2) - (tooltipMaxHeight / 2); // Center vertically on tooltip
      
      // If tooltip would go off the right edge, position it to the left
      if (x + tooltipWidth > window.innerWidth - 20) {
        x = rect.left - tooltipWidth - 10;
      }
      
      // If tooltip would go off the left edge, position it above/below
      if (x < 20) {
        x = rect.left + (rect.width / 2) - (tooltipWidth / 2); // Center horizontally
        y = rect.bottom + 10;
        
        // If tooltip would go off bottom, position above
        if (y + tooltipMaxHeight > window.innerHeight - 20) {
          y = rect.top - tooltipMaxHeight - 10;
        }
      }
      
      // Final bounds checking
      x = Math.max(10, Math.min(x, window.innerWidth - tooltipWidth - 10));
      y = Math.max(10, Math.min(y, window.innerHeight - tooltipMaxHeight - 10));
      
      setPosition({ x, y });
    }
  };

  const showTooltip = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    updatePosition();
    setIsVisible(true);
    if (onOpen) {
      onOpen();
    }
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    const handleResize = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    if (isVisible) {
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
    }

    return () => {
      window.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('resize', handleResize);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [isVisible]);

  const tooltipElement = isVisible ? createPortal(
    <div
      className={`fixed bg-white border border-slate-300 rounded-lg shadow-2xl ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
        width: window.innerWidth < 768 ? '280px' : '340px',
        maxHeight: window.innerWidth < 768 ? `${Math.min(350, window.innerHeight * 0.6)}px` : '500px',
        overflowY: 'auto',
      }}
      onMouseEnter={() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }}
      onMouseLeave={hideTooltip}
    >
      <div className={`leading-relaxed p-2.5 sm:p-3 ${
        window.innerWidth < 768 ? 'text-xs' : 'text-sm'
      }`}>
        {content}
      </div>
    </div>,
    document.body
  ) : null;

  return (
    <>
      <div
        ref={triggerRef}
        onMouseEnter={showTooltip}
        onMouseLeave={hideTooltip}
        className="inline-block cursor-help"
      >
        {children}
      </div>
      {tooltipElement}
    </>
  );
}
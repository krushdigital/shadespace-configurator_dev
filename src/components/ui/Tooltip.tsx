import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  onOpen?: () => void;
  onAccordionOpen?: () => void;
}

export function Tooltip({ content, children, className = '', onOpen, onAccordionOpen }: TooltipProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isScrollable, setIsScrollable] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);
  const [accordionJustOpened, setAccordionJustOpened] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipContentRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout>();
  const accordionScrollTimeoutRef = useRef<NodeJS.Timeout>();

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();

      // Check if mobile
      const isMobile = window.innerWidth < 768;
      const tooltipWidth = isMobile ? 280 : 340;
      const tooltipMaxHeight = isMobile ? Math.min(400, window.innerHeight * 0.7) : 600;
      
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

  const checkScrollability = () => {
    if (tooltipContentRef.current) {
      const { scrollHeight, clientHeight, scrollTop } = tooltipContentRef.current;
      const isContentScrollable = scrollHeight > clientHeight;
      setIsScrollable(isContentScrollable);

      const isNotAtBottom = scrollTop + clientHeight < scrollHeight - 10;
      setShowScrollIndicator(isContentScrollable && isNotAtBottom);
    }
  };

  const handleAccordionOpen = () => {
    const isMobile = window.innerWidth < 768;
    if (isMobile && tooltipContentRef.current) {
      setAccordionJustOpened(true);

      if (accordionScrollTimeoutRef.current) {
        clearTimeout(accordionScrollTimeoutRef.current);
      }

      accordionScrollTimeoutRef.current = setTimeout(() => {
        if (tooltipContentRef.current) {
          const currentScroll = tooltipContentRef.current.scrollTop;
          const scrollAmount = 80;

          tooltipContentRef.current.scrollTo({
            top: currentScroll + scrollAmount,
            behavior: 'smooth'
          });

          setTimeout(() => {
            setAccordionJustOpened(false);
            checkScrollability();
          }, 300);
        }
      }, 100);
    }

    if (onAccordionOpen) {
      onAccordionOpen();
    }
  };

  const handleScroll = () => {
    checkScrollability();
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
    setTimeout(checkScrollability, 100);
  };

  const hideTooltip = () => {
    timeoutRef.current = setTimeout(() => {
      setIsVisible(false);
    }, 150);
  };

  useEffect(() => {
    const handleWindowScroll = () => {
      if (isVisible) {
        updatePosition();
      }
    };

    const handleResize = () => {
      if (isVisible) {
        updatePosition();
        checkScrollability();
      }
    };

    const handleAccordionOpenEvent = () => {
      if (isVisible) {
        handleAccordionOpen();
      }
    };

    if (isVisible) {
      window.addEventListener('scroll', handleWindowScroll, true);
      window.addEventListener('resize', handleResize);
      window.addEventListener('accordionOpen', handleAccordionOpenEvent);
      checkScrollability();
    }

    return () => {
      window.removeEventListener('scroll', handleWindowScroll, true);
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('accordionOpen', handleAccordionOpenEvent);
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (accordionScrollTimeoutRef.current) {
        clearTimeout(accordionScrollTimeoutRef.current);
      }
    };
  }, [isVisible]);

  const enhancedContent = React.isValidElement(content)
    ? React.cloneElement(content as React.ReactElement<any>, {
        onAccordionOpen: handleAccordionOpen
      })
    : content;

  const tooltipElement = isVisible ? createPortal(
    <div
      className={`fixed bg-white border border-slate-300 rounded-lg shadow-2xl ${className}`}
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        zIndex: 99999,
        width: window.innerWidth < 768 ? '280px' : '340px',
        maxHeight: window.innerWidth < 768 ? `${Math.min(400, window.innerHeight * 0.7)}px` : '600px',
        overflowY: 'auto',
      }}
      ref={tooltipContentRef}
      onScroll={handleScroll}
      onMouseEnter={() => {
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
        }
      }}
      onMouseLeave={hideTooltip}
    >
      <div className={`leading-relaxed p-3 sm:p-4 ${
        window.innerWidth < 768 ? 'text-xs' : 'text-sm'
      }`}>
        {enhancedContent}
      </div>
      {(showScrollIndicator || accordionJustOpened) && (
        <div
          className="sticky bottom-0 left-0 right-0 h-12 pointer-events-none"
          style={{
            background: 'linear-gradient(to bottom, transparent 0%, rgba(255, 255, 255, 0.95) 70%, rgba(255, 255, 255, 1) 100%)',
            marginTop: '-3rem'
          }}
        >
          <div className={`absolute bottom-2 left-1/2 transform -translate-x-1/2 ${
            accordionJustOpened ? 'animate-bounce' : 'animate-bounce'
          }`}>
            <svg className={`w-5 h-5 ${
              accordionJustOpened ? 'text-[#BFF102]' : 'text-slate-400'
            }`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={accordionJustOpened ? 3 : 2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      )}
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
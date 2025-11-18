import { useState, useEffect, useRef, useCallback } from 'react';

interface GuidanceState {
  currentHighlightTarget: string | null;
  lastScrollTime: number;
}

interface UseMobileGuidanceOptions {
  isMobile: boolean;
  currentStep: number;
}

interface ScrollOptions {
  delay?: number;
  offset?: number;
  alignToTop?: boolean;
}

export function useMobileGuidance({ isMobile, currentStep }: UseMobileGuidanceOptions) {
  const [guidanceState, setGuidanceState] = useState<GuidanceState>({
    currentHighlightTarget: null,
    lastScrollTime: 0,
  });

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const isElementVisible = useCallback((element: HTMLElement, threshold: number = 0.7): boolean => {
    const rect = element.getBoundingClientRect();
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    const elementHeight = rect.height;
    const visibleTop = Math.max(0, rect.top);
    const visibleBottom = Math.min(viewportHeight, rect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);

    const visibilityRatio = visibleHeight / elementHeight;

    const isInViewport = rect.top >= 0 && rect.bottom <= viewportHeight;
    const isSufficientlyVisible = visibilityRatio >= threshold;

    return isInViewport || isSufficientlyVisible;
  }, []);

  const scrollToElement = useCallback((
    elementId: string,
    delay: number = 300,
    offset: number = 120,
    alignToTop: boolean = false
  ) => {
    if (!isMobile) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const now = Date.now();
    if (now - guidanceState.lastScrollTime < 100) {
      return;
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const element = document.getElementById(elementId) || document.querySelector(`[data-guidance-id="${elementId}"]`);

      if (!element) {
        console.log(`[Guidance] Element not found: ${elementId}`);
        return;
      }

      if (isElementVisible(element as HTMLElement)) {
        console.log(`[Guidance] Element ${elementId} already visible, skipping scroll`);
        return;
      }

      const rect = element.getBoundingClientRect();
      const elementTop = rect.top + window.pageYOffset;
      const elementHeight = rect.height;
      const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

      let targetPosition;

      if (alignToTop) {
        targetPosition = elementTop - offset;
        console.log(`[Guidance] Scrolling to top of ${elementId}, position: ${targetPosition}px`);
      } else {
        const centerOffset = (viewportHeight / 2) - (elementHeight / 2);
        targetPosition = elementTop - centerOffset;
        console.log(`[Guidance] Scrolling to center ${elementId}, position: ${targetPosition}px`);
      }

      window.scrollTo({
        top: Math.max(0, targetPosition),
        behavior: 'smooth'
      });

      setGuidanceState(prev => ({
        ...prev,
        lastScrollTime: Date.now(),
      }));
    }, delay);
  }, [isMobile, guidanceState.lastScrollTime, isElementVisible]);

  const setHighlightTarget = useCallback((
    targetId: string | null,
    duration: number = 5000
  ) => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    console.log(`[Guidance] Setting highlight target: ${targetId} (isMobile: ${isMobile})`);

    setGuidanceState(prev => ({
      ...prev,
      currentHighlightTarget: targetId,
    }));

    if (targetId && duration > 0) {
      highlightTimeoutRef.current = setTimeout(() => {
        setGuidanceState(prev => ({
          ...prev,
          currentHighlightTarget: null,
        }));
      }, duration);
    }
  }, [isMobile]);

  const clearHighlight = useCallback(() => {
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }
    setGuidanceState(prev => ({
      ...prev,
      currentHighlightTarget: null,
    }));
  }, []);

  useEffect(() => {
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current);
      }
    };
  }, []);

  return {
    isGuidanceActive: true,
    currentHighlightTarget: guidanceState.currentHighlightTarget,
    scrollToElement,
    setHighlightTarget,
    clearHighlight,
  };
}

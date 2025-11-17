import { useState, useEffect, useRef, useCallback } from 'react';

interface GuidanceState {
  currentHighlightTarget: string | null;
  lastScrollTime: number;
}

interface UseMobileGuidanceOptions {
  isMobile: boolean;
  currentStep: number;
}

export function useMobileGuidance({ isMobile, currentStep }: UseMobileGuidanceOptions) {
  const [guidanceState, setGuidanceState] = useState<GuidanceState>({
    currentHighlightTarget: null,
    lastScrollTime: 0,
  });

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isMobile) {
      setGuidanceState(prev => ({
        ...prev,
        currentHighlightTarget: null,
      }));
      return;
    }
  }, [isMobile]);

  const scrollToElement = useCallback((
    elementId: string,
    delay: number = 300,
    offset: number = 120
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
        console.log(`[Mobile Guidance] Element not found: ${elementId}`);
        return;
      }

      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      console.log(`[Mobile Guidance] Scrolling to ${elementId}, offset: ${offsetPosition}px`);

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });

      setGuidanceState(prev => ({
        ...prev,
        lastScrollTime: Date.now(),
      }));
    }, delay);
  }, [isMobile, guidanceState.lastScrollTime]);

  const setHighlightTarget = useCallback((
    targetId: string | null,
    duration: number = 5000
  ) => {
    if (!isMobile) return;

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

    console.log(`[Mobile Guidance] Setting highlight target: ${targetId}`);

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
    isGuidanceActive: isMobile,
    currentHighlightTarget: guidanceState.currentHighlightTarget,
    scrollToElement,
    setHighlightTarget,
    clearHighlight,
  };
}

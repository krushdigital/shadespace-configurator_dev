import { useState, useEffect, useRef, useCallback } from 'react';

interface GuidanceState {
  currentHighlightTarget: string | null;
  highestReachedStep: number;
  isPaused: boolean;
  lastScrollTime: number;
}

interface UseMobileGuidanceOptions {
  isMobile: boolean;
  currentStep: number;
}

export function useMobileGuidance({ isMobile, currentStep }: UseMobileGuidanceOptions) {
  const [guidanceState, setGuidanceState] = useState<GuidanceState>({
    currentHighlightTarget: null,
    highestReachedStep: 0,
    isPaused: false,
    lastScrollTime: 0,
  });

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isMobile) {
      setGuidanceState(prev => ({
        ...prev,
        currentHighlightTarget: null,
        isPaused: false,
      }));
      return;
    }

    if (currentStep > guidanceState.highestReachedStep) {
      setGuidanceState(prev => ({
        ...prev,
        highestReachedStep: currentStep,
        isPaused: false,
      }));
    } else if (currentStep < guidanceState.highestReachedStep) {
      setGuidanceState(prev => ({
        ...prev,
        isPaused: true,
      }));
    }
  }, [currentStep, isMobile, guidanceState.highestReachedStep]);

  const scrollToElement = useCallback((
    elementId: string,
    delay: number = 300,
    offset: number = 120
  ) => {
    if (!isMobile || guidanceState.isPaused) return;

    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }

    const now = Date.now();
    if (now - guidanceState.lastScrollTime < 100) {
      return;
    }

    scrollTimeoutRef.current = setTimeout(() => {
      const element = document.getElementById(elementId) || document.querySelector(`[data-guidance-id="${elementId}"]`);

      if (!element) return;

      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - offset;

      window.scrollTo({
        top: Math.max(0, offsetPosition),
        behavior: 'smooth'
      });

      setGuidanceState(prev => ({
        ...prev,
        lastScrollTime: Date.now(),
      }));
    }, delay);
  }, [isMobile, guidanceState.isPaused, guidanceState.lastScrollTime]);

  const setHighlightTarget = useCallback((
    targetId: string | null,
    duration: number = 5000
  ) => {
    if (!isMobile || guidanceState.isPaused) return;

    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current);
    }

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
  }, [isMobile, guidanceState.isPaused]);

  const resumeGuidance = useCallback(() => {
    if (currentStep >= guidanceState.highestReachedStep) {
      setGuidanceState(prev => ({
        ...prev,
        isPaused: false,
      }));
    }
  }, [currentStep, guidanceState.highestReachedStep]);

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
    isGuidanceActive: isMobile && !guidanceState.isPaused,
    currentHighlightTarget: guidanceState.currentHighlightTarget,
    isPaused: guidanceState.isPaused,
    scrollToElement,
    setHighlightTarget,
    resumeGuidance,
    clearHighlight,
  };
}

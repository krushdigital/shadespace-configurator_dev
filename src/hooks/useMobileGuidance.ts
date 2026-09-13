import { useState, useEffect, useRef, useCallback } from 'react';

interface GuidanceState {
  currentHighlightTarget: string | null;
  lastScrollTime: number;
}

interface UseMobileGuidanceOptions {
  isMobile: boolean;
  currentStep: number;
}

export type ScrollBias = 'center' | 'below-center' | 'top';

function getScrollContainer(): HTMLElement | null {
  return document.getElementById('main-scroll-container');
}

export function useMobileGuidance({ isMobile, currentStep }: UseMobileGuidanceOptions) {
  const [guidanceState, setGuidanceState] = useState<GuidanceState>({
    currentHighlightTarget: null,
    lastScrollTime: 0,
  });

  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const highlightTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const getViewportHeight = useCallback((): number => {
    const sc = getScrollContainer();
    if (sc) return sc.clientHeight;
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    if (vv && vv.height) return vv.height;
    return window.innerHeight || document.documentElement.clientHeight;
  }, []);

  const classifyBrowser = useCallback((): string => {
    const ua = (navigator.userAgent || '').toLowerCase();
    if (ua.includes('brave')) return 'brave';
    if (ua.includes('crios') || ua.includes('chrome')) return 'chrome';
    if (ua.includes('firefox') || ua.includes('fxios')) return 'firefox';
    if (ua.includes('safari')) return 'safari';
    return 'other';
  }, []);

  const logScrollDiagnostic = useCallback((payload: {
    elementId: string;
    targetScrollY: number;
    alignMode: ScrollBias;
  }) => {
    if (Math.random() > 0.04) return;
    const url = import.meta.env.VITE_SUPABASE_URL;
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!url || !key) return;

    const innerHeight = window.innerHeight || 0;
    const vvHeight = window.visualViewport?.height ?? 0;

    window.setTimeout(() => {
      try {
        fetch(`${url}/rest/v1/mobile_scroll_diagnostics`, {
          method: 'POST',
          headers: {
            apikey: key,
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            element_id: payload.elementId,
            browser: classifyBrowser(),
            user_agent: navigator.userAgent || '',
            inner_height: Math.round(innerHeight),
            visual_viewport_height: Math.round(vvHeight),
            target_scroll_y: Math.round(payload.targetScrollY),
            final_scroll_y: Math.round(getScrollContainer()?.scrollTop ?? window.scrollY ?? 0),
            align_mode: payload.alignMode,
          }),
          keepalive: true,
        }).catch(() => undefined);
      } catch {
        // best-effort telemetry
      }
    }, 700);
  }, [classifyBrowser]);

  const isElementVisible = useCallback((element: HTMLElement, threshold: number = 0.7): boolean => {
    const sc = getScrollContainer();
    const rect = element.getBoundingClientRect();

    if (sc) {
      const containerRect = sc.getBoundingClientRect();
      const viewportHeight = sc.clientHeight;
      const elementHeight = rect.height;
      const visibleTop = Math.max(containerRect.top, rect.top);
      const visibleBottom = Math.min(containerRect.bottom, rect.bottom);
      const visibleHeight = Math.max(0, visibleBottom - visibleTop);
      const visibilityRatio = elementHeight > 0 ? visibleHeight / elementHeight : 0;

      const fullyInViewport =
        rect.top >= containerRect.top &&
        rect.bottom <= containerRect.bottom;

      const topQuarterCutoff = containerRect.top + viewportHeight * 0.25;
      const sittingNearTop = rect.top < topQuarterCutoff;

      if (sittingNearTop && elementHeight < viewportHeight * 0.6) {
        return false;
      }

      return fullyInViewport || visibilityRatio >= threshold;
    }

    const viewportHeight = getViewportHeight();
    const elementHeight = rect.height;
    const visibleTop = Math.max(0, rect.top);
    const visibleBottom = Math.min(viewportHeight, rect.bottom);
    const visibleHeight = Math.max(0, visibleBottom - visibleTop);
    const visibilityRatio = elementHeight > 0 ? visibleHeight / elementHeight : 0;

    const fullyInViewport = rect.top >= 0 && rect.bottom <= viewportHeight;
    const topQuarterCutoff = viewportHeight * 0.25;
    const sittingNearTop = rect.top < topQuarterCutoff;

    if (sittingNearTop && elementHeight < viewportHeight * 0.6) {
      return false;
    }

    return fullyInViewport || visibilityRatio >= threshold;
  }, [getViewportHeight]);

  const scrollToElement = useCallback((
    elementId: string,
    delay: number = 300,
    offset: number = 70,
    alignToTop: boolean = false,
    bias?: ScrollBias
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
        return;
      }

      if (isElementVisible(element as HTMLElement)) {
        return;
      }

      const sc = getScrollContainer();
      const resolvedBias: ScrollBias = alignToTop
        ? 'top'
        : bias || (elementId.startsWith('continue-button') ? 'below-center' : 'center');

      if (sc) {
        const containerRect = sc.getBoundingClientRect();
        const rect = element.getBoundingClientRect();
        const elementTopInContainer = rect.top - containerRect.top + sc.scrollTop;

        if (resolvedBias === 'top') {
          const targetPosition = Math.max(0, elementTopInContainer - offset);
          sc.scrollTo({ top: targetPosition, behavior: 'smooth' });
          logScrollDiagnostic({ elementId, targetScrollY: targetPosition, alignMode: 'top' });
        } else {
          const viewportHeight = sc.clientHeight;
          const centerOffset = viewportHeight / 2 - rect.height / 2;
          let targetPosition = Math.max(0, elementTopInContainer - centerOffset);

          if (resolvedBias === 'below-center') {
            const shift = Math.min(110, Math.max(70, viewportHeight * 0.12));
            targetPosition += shift;
          }

          sc.scrollTo({ top: targetPosition, behavior: 'smooth' });
          logScrollDiagnostic({ elementId, targetScrollY: targetPosition, alignMode: resolvedBias });
        }
      } else {
        const rect = element.getBoundingClientRect();
        if (resolvedBias === 'top') {
          const elementTop = rect.top + window.pageYOffset;
          const targetPosition = Math.max(0, elementTop - offset);
          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
          logScrollDiagnostic({ elementId, targetScrollY: targetPosition, alignMode: 'top' });
        } else {
          const elementTop = rect.top + window.pageYOffset;
          const viewportHeight = getViewportHeight();
          const centerOffset = viewportHeight / 2 - rect.height / 2;
          let targetPosition = Math.max(0, elementTop - centerOffset);

          if (resolvedBias === 'below-center') {
            const shift = Math.min(110, Math.max(70, viewportHeight * 0.12));
            targetPosition += shift;
          }

          window.scrollTo({ top: targetPosition, behavior: 'smooth' });
          logScrollDiagnostic({ elementId, targetScrollY: targetPosition, alignMode: resolvedBias });
        }
      }

      setGuidanceState(prev => ({
        ...prev,
        lastScrollTime: Date.now(),
      }));
    }, delay);
  }, [isMobile, guidanceState.lastScrollTime, isElementVisible, getViewportHeight, logScrollDiagnostic]);

  const setHighlightTarget = useCallback((
    targetId: string | null,
    duration: number = 0
  ) => {
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
  }, []);

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

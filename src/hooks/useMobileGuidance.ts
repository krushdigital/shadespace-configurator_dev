import { useState, useEffect, useRef, useCallback } from 'react';
import { loadPreferences, updatePreferences, GuidancePreferences } from '../utils/guidancePreferences';

interface ScrollSpeedConfig {
  slow: number;
  normal: number;
  fast: number;
}

const SCROLL_SPEEDS: ScrollSpeedConfig = {
  slow: 1000,
  normal: 600,
  fast: 400,
};

const COLOR_BROWSING_WINDOW = 3000;
const COLOR_PAUSE_DETECTION = 2500;
const BACKWARD_SCROLL_THRESHOLD = 5000;
const AUTO_SCROLL_DEBOUNCE = 300;

export interface MobileGuidanceState {
  isGuidanceEnabled: boolean;
  preferences: GuidancePreferences;
  isBackwardNavigating: boolean;
  lastAutoScrollTimestamp: number;
  lastManualScrollTimestamp: number;
  colorSelectionTimestamp: number | null;
  colorSelectionCount: number;
  shouldShowButtonPulse: boolean;
  shouldShowHint: boolean;
  hasSeenOnboarding: boolean;
}

export interface MobileGuidanceActions {
  handleFabricTypeSelected: (fabricType: string) => void;
  handleColorSelected: (color: string) => void;
  handleStepComplete: (stepNumber: number) => void;
  handleBackwardNavigation: () => void;
  handleContinueClick: () => void;
  handleUserManualScroll: () => void;
  updateGuidancePreferences: (updates: Partial<GuidancePreferences>) => Promise<void>;
  resetGuidance: () => void;
}

export function useMobileGuidance(isMobile: boolean, currentStep: number) {
  const [state, setState] = useState<MobileGuidanceState>({
    isGuidanceEnabled: true,
    preferences: {
      guidanceEnabled: true,
      autoScrollSpeed: 'normal',
      hasSeenOnboarding: false,
    },
    isBackwardNavigating: false,
    lastAutoScrollTimestamp: 0,
    lastManualScrollTimestamp: 0,
    colorSelectionTimestamp: null,
    colorSelectionCount: 0,
    shouldShowButtonPulse: false,
    shouldShowHint: false,
    hasSeenOnboarding: false,
  });

  const colorBrowsingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const autoScrollDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const backwardNavigationTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const initPreferences = async () => {
      const prefs = await loadPreferences();
      setState(prev => ({
        ...prev,
        preferences: prefs,
        isGuidanceEnabled: prefs.guidanceEnabled,
        hasSeenOnboarding: prefs.hasSeenOnboarding,
      }));
    };

    initPreferences();
  }, []);

  useEffect(() => {
    if (!isMobile) {
      setState(prev => ({ ...prev, isGuidanceEnabled: false }));
    }
  }, [isMobile]);

  const shouldAutoScroll = useCallback((): boolean => {
    if (!isMobile || !state.isGuidanceEnabled || !state.preferences.guidanceEnabled) {
      return false;
    }

    if (state.isBackwardNavigating) {
      return false;
    }

    const now = Date.now();
    if (now - state.lastManualScrollTimestamp < BACKWARD_SCROLL_THRESHOLD) {
      return false;
    }

    if (now - state.lastAutoScrollTimestamp < AUTO_SCROLL_DEBOUNCE) {
      return false;
    }

    return true;
  }, [isMobile, state.isGuidanceEnabled, state.preferences.guidanceEnabled, state.isBackwardNavigating, state.lastManualScrollTimestamp, state.lastAutoScrollTimestamp]);

  const smoothScrollToElement = useCallback((
    elementId: string,
    offset: number = 80
  ) => {
    if (!shouldAutoScroll()) return;

    const element = document.getElementById(elementId);
    if (!element) return;

    const isMobileView = window.innerWidth < 1024;
    const headerOffset = isMobileView ? 120 : 140;
    const totalOffset = headerOffset + offset;

    const elementPosition = element.getBoundingClientRect().top;
    const offsetPosition = elementPosition + window.pageYOffset - totalOffset;

    const scrollDuration = SCROLL_SPEEDS[state.preferences.autoScrollSpeed];

    window.scrollTo({
      top: offsetPosition,
      behavior: 'smooth',
    });

    setState(prev => ({
      ...prev,
      lastAutoScrollTimestamp: Date.now(),
    }));

    const announceElement = document.getElementById('guidance-announcer');
    if (announceElement) {
      announceElement.textContent = `Scrolled to ${elementId}`;
    }
  }, [shouldAutoScroll, state.preferences.autoScrollSpeed]);

  const handleFabricTypeSelected = useCallback((fabricType: string) => {
    if (!shouldAutoScroll()) return;

    if (autoScrollDebounceRef.current) {
      clearTimeout(autoScrollDebounceRef.current);
    }

    autoScrollDebounceRef.current = setTimeout(() => {
      const colorSectionId = 'color-selection-section';
      smoothScrollToElement(colorSectionId, 40);
    }, 800);
  }, [shouldAutoScroll, smoothScrollToElement]);

  const handleColorSelected = useCallback((color: string) => {
    const now = Date.now();

    if (colorBrowsingTimerRef.current) {
      clearTimeout(colorBrowsingTimerRef.current);
    }

    setState(prev => {
      const isWithinBrowsingWindow = prev.colorSelectionTimestamp
        ? now - prev.colorSelectionTimestamp < COLOR_BROWSING_WINDOW
        : false;

      const newCount = isWithinBrowsingWindow ? prev.colorSelectionCount + 1 : 1;

      return {
        ...prev,
        colorSelectionTimestamp: now,
        colorSelectionCount: newCount,
        shouldShowButtonPulse: false,
        shouldShowHint: false,
      };
    });

    colorBrowsingTimerRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        shouldShowButtonPulse: true,
        shouldShowHint: true,
      }));
    }, COLOR_PAUSE_DETECTION);
  }, []);

  const handleStepComplete = useCallback((stepNumber: number) => {
    setState(prev => ({
      ...prev,
      shouldShowButtonPulse: true,
      shouldShowHint: true,
    }));

    const announceElement = document.getElementById('guidance-announcer');
    if (announceElement) {
      announceElement.textContent = `Step ${stepNumber} complete. Continue button is now active.`;
    }
  }, []);

  const handleBackwardNavigation = useCallback(() => {
    setState(prev => ({
      ...prev,
      isBackwardNavigating: true,
      shouldShowButtonPulse: false,
      shouldShowHint: false,
    }));

    if (backwardNavigationTimerRef.current) {
      clearTimeout(backwardNavigationTimerRef.current);
    }

    backwardNavigationTimerRef.current = setTimeout(() => {
      setState(prev => ({
        ...prev,
        isBackwardNavigating: false,
      }));
    }, BACKWARD_SCROLL_THRESHOLD);

    const announceElement = document.getElementById('guidance-announcer');
    if (announceElement) {
      announceElement.textContent = 'Guidance paused while editing previous step';
    }
  }, []);

  const handleContinueClick = useCallback(() => {
    setState(prev => ({
      ...prev,
      shouldShowButtonPulse: false,
      shouldShowHint: false,
      colorSelectionTimestamp: null,
      colorSelectionCount: 0,
    }));
  }, []);

  const handleUserManualScroll = useCallback(() => {
    setState(prev => ({
      ...prev,
      lastManualScrollTimestamp: Date.now(),
    }));
  }, []);

  const updateGuidancePreferencesHandler = useCallback(async (updates: Partial<GuidancePreferences>) => {
    await updatePreferences(updates);
    const updatedPrefs = await loadPreferences();
    setState(prev => ({
      ...prev,
      preferences: updatedPrefs,
      isGuidanceEnabled: updatedPrefs.guidanceEnabled,
      hasSeenOnboarding: updatedPrefs.hasSeenOnboarding,
    }));
  }, []);

  const resetGuidance = useCallback(() => {
    setState(prev => ({
      ...prev,
      isBackwardNavigating: false,
      shouldShowButtonPulse: false,
      shouldShowHint: false,
      colorSelectionTimestamp: null,
      colorSelectionCount: 0,
    }));
  }, []);

  useEffect(() => {
    if (!isMobile) return;

    const handleScroll = () => {
      const now = Date.now();
      if (now - state.lastAutoScrollTimestamp > 1000) {
        handleUserManualScroll();
      }
    };

    window.addEventListener('scroll', handleScroll, { passive: true });

    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [isMobile, state.lastAutoScrollTimestamp, handleUserManualScroll]);

  useEffect(() => {
    return () => {
      if (colorBrowsingTimerRef.current) {
        clearTimeout(colorBrowsingTimerRef.current);
      }
      if (autoScrollDebounceRef.current) {
        clearTimeout(autoScrollDebounceRef.current);
      }
      if (backwardNavigationTimerRef.current) {
        clearTimeout(backwardNavigationTimerRef.current);
      }
    };
  }, []);

  return {
    state,
    actions: {
      handleFabricTypeSelected,
      handleColorSelected,
      handleStepComplete,
      handleBackwardNavigation,
      handleContinueClick,
      handleUserManualScroll,
      updateGuidancePreferences: updateGuidancePreferencesHandler,
      resetGuidance,
    },
  };
}

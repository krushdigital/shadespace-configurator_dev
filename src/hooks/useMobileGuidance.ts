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
  const isInitializedRef = useRef(false);

  console.log('🎯 useMobileGuidance hook called with:', { isMobile, currentStep });

  useEffect(() => {
    console.log('📱 Mobile state changed:', { isMobile });
    if (!isMobile) {
      setState(prev => ({ ...prev, isGuidanceEnabled: false }));
      console.log('❌ Guidance disabled because not mobile');
    } else {
      setState(prev => ({ ...prev, isGuidanceEnabled: prev.preferences.guidanceEnabled }));
      console.log('✅ Mobile detected, guidance enabled based on preferences');
    }
  }, [isMobile]);

  useEffect(() => {
    const initPreferences = async () => {
      console.log('🔄 Loading guidance preferences...');
      const prefs = await loadPreferences();
      console.log('📦 Preferences loaded:', prefs);
      setState(prev => ({
        ...prev,
        preferences: prefs,
        isGuidanceEnabled: isMobile && prefs.guidanceEnabled,
        hasSeenOnboarding: prefs.hasSeenOnboarding,
      }));
      isInitializedRef.current = true;
      console.log('✅ Guidance initialized:', {
        isMobile,
        guidanceEnabled: prefs.guidanceEnabled,
        isGuidanceEnabled: isMobile && prefs.guidanceEnabled
      });
    };

    initPreferences();
  }, [isMobile]);

  const shouldAutoScroll = useCallback((): boolean => {
    console.log('🔍 shouldAutoScroll called with:', {
      isMobile,
      isGuidanceEnabled: state.isGuidanceEnabled,
      preferencesGuidanceEnabled: state.preferences.guidanceEnabled,
      isBackwardNavigating: state.isBackwardNavigating,
      timeSinceManualScroll: Date.now() - state.lastManualScrollTimestamp,
      timeSinceAutoScroll: Date.now() - state.lastAutoScrollTimestamp,
      isInitialized: isInitializedRef.current
    });

    if (!isMobile) {
      console.log('❌ Auto-scroll blocked: not mobile');
      return false;
    }

    if (!state.isGuidanceEnabled) {
      console.log('❌ Auto-scroll blocked: guidance not enabled in state');
      return false;
    }

    if (!state.preferences.guidanceEnabled) {
      console.log('❌ Auto-scroll blocked: guidance disabled in preferences');
      return false;
    }

    if (state.isBackwardNavigating) {
      console.log('❌ Auto-scroll blocked: backward navigating');
      return false;
    }

    const now = Date.now();
    if (now - state.lastManualScrollTimestamp < BACKWARD_SCROLL_THRESHOLD) {
      console.log('❌ Auto-scroll blocked: recent manual scroll');
      return false;
    }

    if (now - state.lastAutoScrollTimestamp < AUTO_SCROLL_DEBOUNCE) {
      console.log('❌ Auto-scroll blocked: debounce period');
      return false;
    }

    console.log('✅ Auto-scroll allowed');
    return true;
  }, [isMobile, state.isGuidanceEnabled, state.preferences.guidanceEnabled, state.isBackwardNavigating, state.lastManualScrollTimestamp, state.lastAutoScrollTimestamp]);

  const smoothScrollToElement = useCallback((
    elementId: string,
    offset: number = 80
  ) => {
    console.log('📜 smoothScrollToElement called for:', elementId);

    if (!shouldAutoScroll()) {
      console.log('❌ Scroll cancelled by shouldAutoScroll');
      return;
    }

    const element = document.getElementById(elementId);
    if (!element) {
      console.log('❌ Element not found:', elementId);
      return;
    }

    console.log('✅ Element found, scrolling to:', elementId);

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

    console.log('✅ Scroll executed to:', elementId);

    const announceElement = document.getElementById('guidance-announcer');
    if (announceElement) {
      announceElement.textContent = `Scrolled to ${elementId}`;
    }
  }, [shouldAutoScroll, state.preferences.autoScrollSpeed]);

  const handleFabricTypeSelected = useCallback((fabricType: string) => {
    console.log('🎨 handleFabricTypeSelected called for:', fabricType);

    if (!shouldAutoScroll()) {
      console.log('❌ Fabric selection scroll blocked by shouldAutoScroll');
      return;
    }

    if (autoScrollDebounceRef.current) {
      clearTimeout(autoScrollDebounceRef.current);
    }

    console.log('⏱️ Setting up 800ms timer to scroll to color section');
    autoScrollDebounceRef.current = setTimeout(() => {
      console.log('⏱️ Timer fired, attempting scroll to color section');
      const colorSectionId = 'color-selection-section';
      smoothScrollToElement(colorSectionId, 40);
    }, 800);
  }, [shouldAutoScroll, smoothScrollToElement]);

  const handleColorSelected = useCallback((color: string) => {
    console.log('🎨 handleColorSelected called for:', color);
    const now = Date.now();

    if (colorBrowsingTimerRef.current) {
      clearTimeout(colorBrowsingTimerRef.current);
      console.log('⏱️ Cleared previous color browsing timer');
    }

    setState(prev => {
      const isWithinBrowsingWindow = prev.colorSelectionTimestamp
        ? now - prev.colorSelectionTimestamp < COLOR_BROWSING_WINDOW
        : false;

      const newCount = isWithinBrowsingWindow ? prev.colorSelectionCount + 1 : 1;

      console.log('🔍 Color browsing state:', {
        isWithinBrowsingWindow,
        newCount,
        timeSinceLastSelection: prev.colorSelectionTimestamp ? now - prev.colorSelectionTimestamp : 'N/A'
      });

      return {
        ...prev,
        colorSelectionTimestamp: now,
        colorSelectionCount: newCount,
        shouldShowButtonPulse: false,
        shouldShowHint: false,
      };
    });

    console.log('⏱️ Setting up 2500ms timer for button pulse');
    colorBrowsingTimerRef.current = setTimeout(() => {
      console.log('✅ Color pause detected, showing button pulse and hint');
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

import { useState, useEffect, useRef, useCallback } from 'react';

interface MobileGuidanceOptions {
  isMobile: boolean;
  currentStep: number;
  isStepComplete: boolean;
  onAutoScroll?: () => void;
}

interface MobileGuidanceState {
  shouldShowPulse: boolean;
  shouldAutoScroll: boolean;
  userHasScrolledBack: boolean;
  selectionCount: number;
  lastSelectionTime: number;
}

export function useMobileGuidance({
  isMobile,
  currentStep,
  isStepComplete,
  onAutoScroll
}: MobileGuidanceOptions) {
  const [guidanceEnabled, setGuidanceEnabled] = useState(() => {
    const stored = localStorage.getItem('mobileGuidanceEnabled');
    return stored === null ? true : stored === 'true';
  });

  const [shouldShowPulse, setShouldShowPulse] = useState(false);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(false);
  const [userHasScrolledBack, setUserHasScrolledBack] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);

  const lastSelectionTimeRef = useRef<number>(0);
  const autoScrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pulseTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const completionTimeRef = useRef<number>(0);

  // Reset state when step changes
  useEffect(() => {
    setShouldShowPulse(false);
    setShouldAutoScroll(false);
    setUserHasScrolledBack(false);
    setSelectionCount(0);
    lastSelectionTimeRef.current = 0;
    completionTimeRef.current = 0;

    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = null;
    }
    if (pulseTimeoutRef.current) {
      clearTimeout(pulseTimeoutRef.current);
      pulseTimeoutRef.current = null;
    }
  }, [currentStep]);

  // Track when step becomes complete
  useEffect(() => {
    if (!isMobile || !guidanceEnabled || !isStepComplete) {
      return;
    }

    // Record completion time if not already set
    if (completionTimeRef.current === 0) {
      completionTimeRef.current = Date.now();
    }

    // Show pulse immediately when step is complete
    setShouldShowPulse(true);

    // For color/fabric selections (step 0), wait longer before auto-scroll
    // to allow user to explore other options
    const isColorStep = currentStep === 0;
    const autoScrollDelay = isColorStep ? 2500 : 1500;

    // Clear any existing timeout
    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
    }

    // Set up auto-scroll after delay
    autoScrollTimeoutRef.current = setTimeout(() => {
      if (!userHasScrolledBack) {
        setShouldAutoScroll(true);
        if (onAutoScroll) {
          onAutoScroll();
        }
      }
    }, autoScrollDelay);

    return () => {
      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
      }
    };
  }, [isMobile, guidanceEnabled, isStepComplete, currentStep, userHasScrolledBack, onAutoScroll]);

  // Track user selections to detect rapid changes
  const recordSelection = useCallback(() => {
    const now = Date.now();
    const timeSinceLastSelection = now - lastSelectionTimeRef.current;

    // If less than 3 seconds since last selection, increment counter
    if (timeSinceLastSelection < 3000) {
      setSelectionCount(prev => prev + 1);
    } else {
      setSelectionCount(1);
    }

    lastSelectionTimeRef.current = now;

    // If user is making rapid selections, delay auto-scroll
    if (selectionCount > 1 && autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = null;
      setShouldAutoScroll(false);
    }
  }, [selectionCount]);

  // Detect when user manually scrolls back
  const handleManualNavigation = useCallback(() => {
    setUserHasScrolledBack(true);
    setShouldAutoScroll(false);

    if (autoScrollTimeoutRef.current) {
      clearTimeout(autoScrollTimeoutRef.current);
      autoScrollTimeoutRef.current = null;
    }
  }, []);

  // Stop pulse animation when user interacts with button
  const handleButtonInteraction = useCallback(() => {
    setShouldShowPulse(false);

    if (pulseTimeoutRef.current) {
      clearTimeout(pulseTimeoutRef.current);
    }
  }, []);

  // Toggle guidance on/off
  const toggleGuidance = useCallback((enabled: boolean) => {
    setGuidanceEnabled(enabled);
    localStorage.setItem('mobileGuidanceEnabled', String(enabled));

    if (!enabled) {
      setShouldShowPulse(false);
      setShouldAutoScroll(false);

      if (autoScrollTimeoutRef.current) {
        clearTimeout(autoScrollTimeoutRef.current);
        autoScrollTimeoutRef.current = null;
      }
    }
  }, []);

  // Reset guidance state (useful when user wants to re-enable after disabling)
  const resetGuidance = useCallback(() => {
    setUserHasScrolledBack(false);
    setSelectionCount(0);
    lastSelectionTimeRef.current = 0;
    completionTimeRef.current = 0;
  }, []);

  return {
    guidanceEnabled,
    shouldShowPulse,
    shouldAutoScroll,
    recordSelection,
    handleManualNavigation,
    handleButtonInteraction,
    toggleGuidance,
    resetGuidance
  };
}

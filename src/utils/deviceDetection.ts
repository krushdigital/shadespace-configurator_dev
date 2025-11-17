/**
 * Enhanced device detection utility
 *
 * This module provides robust device detection that fixes issues where desktop browsers
 * (especially Safari on Mac) incorrectly trigger mobile mode due to viewport width alone.
 *
 * Key improvements:
 * - Multi-factor detection: user agent, touch capability, pointer type, and viewport width
 * - Special handling for macOS and Windows to always prefer desktop mode
 * - Hysteresis buffer to prevent flickering at breakpoint boundaries
 * - Debouncing for resize events
 * - Zoom level detection to avoid false positives
 * - Confidence scoring for better decision making
 */

interface DeviceInfo {
  isMobile: boolean;
  isTablet: boolean;
  isDesktop: boolean;
  isTouchDevice: boolean;
  browserName: string;
  osName: string;
  viewportWidth: number;
  confidence: number;
}

const MOBILE_BREAKPOINT = 1024;
const HYSTERESIS_BUFFER = 40;

function getUserAgentInfo(): { browserName: string; osName: string; isMobileUA: boolean } {
  const ua = navigator.userAgent.toLowerCase();

  let browserName = 'unknown';
  if (ua.includes('safari') && !ua.includes('chrome')) browserName = 'safari';
  else if (ua.includes('chrome')) browserName = 'chrome';
  else if (ua.includes('firefox')) browserName = 'firefox';
  else if (ua.includes('edge')) browserName = 'edge';

  let osName = 'unknown';
  if (ua.includes('windows')) osName = 'windows';
  else if (ua.includes('mac')) osName = 'macos';
  else if (ua.includes('linux')) osName = 'linux';
  else if (ua.includes('android')) osName = 'android';
  else if (ua.includes('iphone') || ua.includes('ipad') || ua.includes('ipod')) osName = 'ios';

  const isMobileUA = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(ua);

  return { browserName, osName, isMobileUA };
}

function checkTouchSupport(): boolean {
  if (typeof window === 'undefined') return false;

  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    (navigator as any).msMaxTouchPoints > 0
  );
}

function checkPointerType(): 'touch' | 'mouse' | 'mixed' | 'unknown' {
  if (typeof window === 'undefined') return 'unknown';

  if (window.matchMedia('(pointer: coarse)').matches) {
    return 'touch';
  } else if (window.matchMedia('(pointer: fine)').matches) {
    return 'mouse';
  } else if (window.matchMedia('(any-pointer: coarse)').matches &&
             window.matchMedia('(any-pointer: fine)').matches) {
    return 'mixed';
  }

  return 'unknown';
}

function getActualViewportWidth(): number {
  if (typeof window === 'undefined') return 1920;

  const visualViewport = window.visualViewport;
  if (visualViewport) {
    return visualViewport.width;
  }

  return window.innerWidth || document.documentElement.clientWidth;
}

function detectZoomLevel(): number {
  if (typeof window === 'undefined') return 1;

  const visualViewport = window.visualViewport;
  if (visualViewport) {
    return visualViewport.scale || 1;
  }

  return 1;
}

export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      isMobile: false,
      isTablet: false,
      isDesktop: true,
      isTouchDevice: false,
      browserName: 'unknown',
      osName: 'unknown',
      viewportWidth: 1920,
      confidence: 1.0,
    };
  }

  const { browserName, osName, isMobileUA } = getUserAgentInfo();
  const isTouchDevice = checkTouchSupport();
  const pointerType = checkPointerType();
  const viewportWidth = getActualViewportWidth();
  const zoomLevel = detectZoomLevel();

  let isMobile = false;
  let isTablet = false;
  let isDesktop = false;
  let confidence = 0;

  if (osName === 'macos' && pointerType === 'mouse') {
    isDesktop = true;
    isMobile = false;
    isTablet = false;
    confidence = 1.0;
  }
  else if (osName === 'windows' || osName === 'linux') {
    isDesktop = true;
    isMobile = false;
    isTablet = false;
    confidence = 1.0;
  }
  else if (osName === 'android' || osName === 'ios') {
    if (viewportWidth >= 768 && isMobileUA) {
      isTablet = true;
      isMobile = viewportWidth < MOBILE_BREAKPOINT;
      isDesktop = false;
      confidence = 0.9;
    } else if (viewportWidth < 768) {
      isMobile = true;
      isTablet = false;
      isDesktop = false;
      confidence = 1.0;
    } else {
      isTablet = true;
      isMobile = false;
      isDesktop = false;
      confidence = 0.8;
    }
  }
  else if (isTouchDevice && pointerType === 'touch') {
    if (viewportWidth >= 768 && viewportWidth < MOBILE_BREAKPOINT) {
      isTablet = true;
      isMobile = true;
      isDesktop = false;
      confidence = 0.85;
    } else if (viewportWidth < 768) {
      isMobile = true;
      isTablet = false;
      isDesktop = false;
      confidence = 0.9;
    } else {
      isDesktop = true;
      isMobile = false;
      isTablet = false;
      confidence = 0.7;
    }
  }
  else if (pointerType === 'mouse') {
    isDesktop = true;
    isMobile = false;
    isTablet = false;
    confidence = 0.95;
  }
  else {
    if (viewportWidth < MOBILE_BREAKPOINT) {
      isMobile = true;
      isTablet = false;
      isDesktop = false;
      confidence = 0.7;
    } else {
      isDesktop = true;
      isMobile = false;
      isTablet = false;
      confidence = 0.7;
    }
  }

  if (zoomLevel > 1.5 && !isMobileUA && (osName === 'macos' || osName === 'windows' || osName === 'linux')) {
    isDesktop = true;
    isMobile = false;
    isTablet = false;
    confidence = Math.min(confidence + 0.1, 1.0);
  }

  return {
    isMobile,
    isTablet,
    isDesktop,
    isTouchDevice,
    browserName,
    osName,
    viewportWidth,
    confidence,
  };
}

let lastDeviceState: DeviceInfo | null = null;
let lastTransitionTime = 0;
const TRANSITION_COOLDOWN = 500;

export function detectDeviceWithHysteresis(forceUpdate: boolean = false): DeviceInfo {
  const currentDevice = detectDevice();
  const now = Date.now();

  if (!lastDeviceState || forceUpdate) {
    lastDeviceState = currentDevice;
    lastTransitionTime = now;
    return currentDevice;
  }

  const timeSinceLastTransition = now - lastTransitionTime;

  if (timeSinceLastTransition < TRANSITION_COOLDOWN) {
    return lastDeviceState;
  }

  const wasDesktop = lastDeviceState.isDesktop;
  const isNowMobile = currentDevice.isMobile;
  const isNowDesktop = currentDevice.isDesktop;

  if (wasDesktop && isNowMobile) {
    const widthDiff = Math.abs(currentDevice.viewportWidth - MOBILE_BREAKPOINT);

    if (widthDiff < HYSTERESIS_BUFFER && currentDevice.confidence < 0.9) {
      return lastDeviceState;
    }
  }

  if (lastDeviceState.isMobile !== currentDevice.isMobile) {
    lastTransitionTime = now;
  }

  lastDeviceState = currentDevice;
  return currentDevice;
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }

    timeout = setTimeout(later, wait);
  };
}

export function logDeviceInfo() {
  const device = detectDevice();
  console.group('📱 Device Detection Info');
  console.log('Device Type:', device.isMobile ? 'Mobile' : device.isTablet ? 'Tablet' : 'Desktop');
  console.log('Browser:', device.browserName);
  console.log('OS:', device.osName);
  console.log('Viewport Width:', device.viewportWidth);
  console.log('Touch Device:', device.isTouchDevice);
  console.log('Confidence:', (device.confidence * 100).toFixed(0) + '%');
  console.groupEnd();
}

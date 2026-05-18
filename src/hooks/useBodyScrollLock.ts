import { useLayoutEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;

function getScrollbarWidth(): number {
  return window.innerWidth - document.documentElement.clientWidth;
}

function applyLock() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;

  savedScrollY = window.scrollY || window.pageYOffset || 0;
  const scrollbarWidth = getScrollbarWidth();

  if (scrollbarWidth > 0) {
    html.style.paddingRight = `${scrollbarWidth}px`;
  }
  html.style.overflow = 'hidden';
}

function releaseLock() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;

  html.style.overflow = '';
  html.style.paddingRight = '';

  window.scrollTo(0, savedScrollY);
}

export function useBodyScrollLock(isOpen: boolean) {
  useLayoutEffect(() => {
    if (!isOpen) return;
    lockCount += 1;
    if (lockCount === 1) {
      applyLock();
    }
    return () => {
      lockCount = Math.max(0, lockCount - 1);
      if (lockCount === 0) {
        releaseLock();
      }
    };
  }, [isOpen]);
}

export function forceReleaseLock() {
  lockCount = 0;
  releaseLock();
}

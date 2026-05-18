import { useLayoutEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;

function applyLock() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const body = document.body;

  savedScrollY = window.scrollY || window.pageYOffset || 0;
  const scrollbarWidth = window.innerWidth - html.clientWidth;

  body.style.setProperty('--scroll-lock-top', `-${savedScrollY}px`);
  body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
  html.classList.add('scroll-locked');
  body.classList.add('scroll-locked');
}

function releaseLock() {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const body = document.body;

  html.classList.remove('scroll-locked');
  body.classList.remove('scroll-locked');
  body.style.removeProperty('--scroll-lock-top');
  body.style.removeProperty('--scrollbar-width');

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

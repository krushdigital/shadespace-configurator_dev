import { useEffect } from 'react';

let lockCount = 0;
let savedScrollY = 0;
let savedStyles: {
  bodyOverflow: string;
  bodyPosition: string;
  bodyTop: string;
  bodyLeft: string;
  bodyRight: string;
  bodyWidth: string;
  bodyPaddingRight: string;
  bodyTouchAction: string;
  htmlOverflow: string;
} | null = null;

function applyLock() {
  if (typeof document === 'undefined') return;
  const body = document.body;
  const html = document.documentElement;

  savedScrollY = window.scrollY || window.pageYOffset || 0;
  const scrollbarWidth = window.innerWidth - html.clientWidth;

  savedStyles = {
    bodyOverflow: body.style.overflow,
    bodyPosition: body.style.position,
    bodyTop: body.style.top,
    bodyLeft: body.style.left,
    bodyRight: body.style.right,
    bodyWidth: body.style.width,
    bodyPaddingRight: body.style.paddingRight,
    bodyTouchAction: body.style.touchAction,
    htmlOverflow: html.style.overflow,
  };

  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  body.style.position = 'fixed';
  body.style.top = `-${savedScrollY}px`;
  body.style.left = '0';
  body.style.right = '0';
  body.style.width = '100%';
  if (scrollbarWidth > 0) {
    body.style.paddingRight = `${scrollbarWidth}px`;
  }
}

function releaseLock() {
  if (typeof document === 'undefined' || !savedStyles) return;
  const body = document.body;
  const html = document.documentElement;

  body.style.overflow = savedStyles.bodyOverflow;
  body.style.position = savedStyles.bodyPosition;
  body.style.top = savedStyles.bodyTop;
  body.style.left = savedStyles.bodyLeft;
  body.style.right = savedStyles.bodyRight;
  body.style.width = savedStyles.bodyWidth;
  body.style.paddingRight = savedStyles.bodyPaddingRight;
  body.style.touchAction = savedStyles.bodyTouchAction;
  html.style.overflow = savedStyles.htmlOverflow;

  savedStyles = null;
  window.scrollTo(0, savedScrollY);
}

export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
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

import { useEffect } from 'react';

let lockCount = 0;
let originalOverflow = '';

export function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return;

    if (lockCount === 0) {
      originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    lockCount++;

    return () => {
      lockCount--;
      if (lockCount === 0) {
        document.body.style.overflow = originalOverflow;
      }
    };
  }, [isOpen]);
}

export function forceReleaseLock() {
  lockCount = 0;
  document.body.style.overflow = originalOverflow;
}

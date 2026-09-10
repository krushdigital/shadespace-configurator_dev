import { useEffect, useRef, type RefObject } from 'react';

/**
 * Stops wheel events from propagating to window where Lenis (Shopify theme
 * smooth-scroll library) intercepts them with passive:false. This restores
 * native scroll inside portaled modals that render outside #SHADE_SPACE.
 */
export function useLenisPrevent<T extends HTMLElement>(
  active: boolean
): RefObject<T | null> {
  const ref = useRef<T | null>(null);

  useEffect(() => {
    if (!active) return;
    const el = ref.current;
    if (!el) return;

    const stop = (e: Event) => e.stopPropagation();
    el.addEventListener('wheel', stop, { passive: true });
    el.addEventListener('touchmove', stop, { passive: true });
    return () => {
      el.removeEventListener('wheel', stop);
      el.removeEventListener('touchmove', stop);
    };
  }, [active]);

  return ref;
}

/**
 * Temporarily disabled to isolate scroll issues on Shopify.
 * The hook is a no-op; modals still block interaction via their backdrop.
 */
export function useBodyScrollLock(_isOpen: boolean) {
  // no-op
}

export function forceReleaseLock() {
  // no-op
}

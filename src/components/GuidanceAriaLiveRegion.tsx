import React from 'react';

export function GuidanceAriaLiveRegion() {
  return (
    <div
      id="guidance-announcer"
      className="sr-only"
      role="status"
      aria-live="polite"
      aria-atomic="true"
    />
  );
}

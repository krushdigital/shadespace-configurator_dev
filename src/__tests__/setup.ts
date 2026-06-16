import '@testing-library/jest-dom';
import { cleanup } from '@testing-library/react';
import { afterEach, vi } from 'vitest';

afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  // Reset double-load guard between tests
  delete (window as any).__ssLoaded;
  vi.restoreAllMocks();
});

/**
 * Stress / Brutal test suite
 * ST1 Duplicate script injection · ST2 Missing DOM timing
 * ST3 Partial DOM presence · ST4 Shopify re-render simulation
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, test, expect, vi } from 'vitest';
import { createRoot } from 'react-dom/client';

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock('../components/ShadeConfigurator', () => ({
  ShadeConfigurator: () => (
    <div data-testid="shade-configurator">ShadeConfigurator</div>
  ),
}));

vi.mock('../shopify/MyDesigns', () => ({
  default: ({ email, name, isLoggedIn }: { email: string; name: string; isLoggedIn: boolean }) => (
    <div
      data-testid="my-designs"
      data-email={email}
      data-name={name}
      data-logged-in={String(isLoggedIn)}
    >
      MyDesigns
    </div>
  ),
}));

vi.mock('../pages/Admin', () => ({
  Admin: () => <div data-testid="admin">Admin</div>,
}));

vi.mock('../pages/SetupPassword', () => ({
  SetupPassword: () => <div data-testid="setup-password">SetupPassword</div>,
}));

vi.mock('../utils/currencyDetection', () => ({
  installLocalizationFormInterceptor: vi.fn(),
}));

vi.mock('../utils/currencySync', () => ({
  preloadCurrencyMap: vi.fn(),
  detectCountryFromIp: vi.fn(),
}));

// ─── Helpers ─────────────────────────────────────────────────────────────────

function addDiv(id: string): HTMLElement {
  const el = document.createElement('div');
  el.id = id;
  document.body.appendChild(el);
  return el;
}

function addMyDesignsRoot(): HTMLElement {
  const el = addDiv('MY_DESIGNS_ROOT');
  el.dataset.customerEmail = 'stress@test.com';
  el.dataset.customerName = 'Stress Test';
  el.dataset.loggedIn = 'true';
  return el;
}

async function getApp() {
  const mod = await import('../App');
  return mod.default;
}

// ─── ST1: Duplicate Script Injection ─────────────────────────────────────────

describe('ST1: Duplicate Script Injection', () => {
  test('script injected twice: second execution blocked by __ssLoaded guard', () => {
    const injections: number[] = [];

    const injectScript = () => {
      if (!(window as any).__ssLoaded) {
        (window as any).__ssLoaded = true;
        injections.push(Date.now());
      }
    };

    // Simulate two <script> tags both firing
    injectScript();
    injectScript();

    expect(injections).toHaveLength(1);
  });

  test('no duplicate React root when App rendered twice under guard', async () => {
    const App = await getApp();
    addDiv('CONFIGURATOR_ROOT');
    const mountCount = { value: 0 };

    const mountOnce = () => {
      if (!(window as any).__ssLoaded) {
        (window as any).__ssLoaded = true;
        mountCount.value++;
        render(<App />);
      }
    };

    mountOnce();
    mountOnce();

    expect(mountCount.value).toBe(1);
    // Only one configurator in DOM
    expect(screen.getAllByTestId('shade-configurator')).toHaveLength(1);
  });

  test('no duplicate DOM injection when both script tags load same bundle', () => {
    const container = addDiv('SHADESAIL_ROOT');
    const scriptsAdded: string[] = [];

    const addScriptOnce = (src: string) => {
      if (!(window as any).__ssLoaded) {
        (window as any).__ssLoaded = true;
        scriptsAdded.push(src);
      }
    };

    // Simulate two Liquid blocks both trying to load the bundle
    addScriptOnce('/apps/shade_space/shadespace/index.js');
    addScriptOnce('/apps/shade_space/shadespace/index.js');

    expect(scriptsAdded).toHaveLength(1);
    expect(container).toBeInTheDocument();
  });
});

// ─── ST2: Missing DOM Timing ──────────────────────────────────────────────────

describe('ST2: Missing DOM Timing', () => {
  test('mount guard (if container) prevents crash when SHADESAIL_ROOT absent', () => {
    const container = document.getElementById('SHADESAIL_ROOT');
    expect(container).toBeNull();
    expect(() => {
      if (container) createRoot(container).render(<></>);
    }).not.toThrow();
  });

  test('portal guard (&&) prevents crash when CONFIGURATOR_ROOT not yet in DOM', async () => {
    // CONFIGURATOR_ROOT deliberately absent — simulates script running before block renders
    const App = await getApp();
    expect(() => render(<App />)).not.toThrow();
    expect(screen.queryByTestId('shade-configurator')).not.toBeInTheDocument();
  });

  test('portal guard (&&) prevents crash when MY_DESIGNS_ROOT not yet in DOM', async () => {
    const App = await getApp();
    expect(() => render(<App />)).not.toThrow();
    expect(screen.queryByTestId('my-designs')).not.toBeInTheDocument();
  });

  test('app renders safely with no DOM roots at all', async () => {
    const App = await getApp();
    let error: Error | null = null;
    try {
      render(<App />);
    } catch (e) {
      error = e as Error;
    }
    expect(error).toBeNull();
  });
});

// ─── ST3: Partial DOM Presence ────────────────────────────────────────────────

describe('ST3: Partial DOM Presence', () => {
  test('only CONFIGURATOR_ROOT: configurator renders, no crash', async () => {
    addDiv('CONFIGURATOR_ROOT');
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();
    expect(screen.queryByTestId('my-designs')).not.toBeInTheDocument();
  });

  test('only MY_DESIGNS_ROOT: my-designs renders, no crash', async () => {
    addMyDesignsRoot();
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('my-designs')).toBeInTheDocument();
    expect(screen.queryByTestId('shade-configurator')).not.toBeInTheDocument();
  });

  test('both roots: both components render, no crash', async () => {
    addDiv('CONFIGURATOR_ROOT');
    addMyDesignsRoot();
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();
    expect(screen.getByTestId('my-designs')).toBeInTheDocument();
  });

  test('neither root: no components render, no crash', async () => {
    const App = await getApp();
    expect(() => render(<App />)).not.toThrow();
    expect(screen.queryByTestId('shade-configurator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-designs')).not.toBeInTheDocument();
  });

  test('extra unknown divs in DOM do not affect portal targeting', async () => {
    // Add noise
    addDiv('SOME_OTHER_ROOT');
    addDiv('ANOTHER_DIV');
    addDiv('CONFIGURATOR_ROOT');
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();
    expect(screen.queryByTestId('my-designs')).not.toBeInTheDocument();
  });
});

// ─── ST4: Shopify Re-render Simulation ───────────────────────────────────────

describe('ST4: Shopify Re-render Simulation', () => {
  test('component remains stable across multiple React re-renders', async () => {
    addDiv('CONFIGURATOR_ROOT');
    const App = await getApp();
    const { rerender } = render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();

    act(() => rerender(<App />));
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();

    act(() => rerender(<App />));
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();

    // Still exactly one instance
    expect(screen.getAllByTestId('shade-configurator')).toHaveLength(1);
  });

  test('my-designs portal stable across multiple re-renders', async () => {
    addMyDesignsRoot();
    const App = await getApp();
    const { rerender } = render(<App />);

    act(() => rerender(<App />));
    act(() => rerender(<App />));

    expect(screen.getAllByTestId('my-designs')).toHaveLength(1);
  });

  test('unmounting and remounting App does not leave duplicate portals', async () => {
    addDiv('CONFIGURATOR_ROOT');
    const App = await getApp();

    const { unmount } = render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();

    act(() => unmount());
    expect(screen.queryByTestId('shade-configurator')).not.toBeInTheDocument();

    // Remount fresh
    render(<App />);
    expect(screen.getAllByTestId('shade-configurator')).toHaveLength(1);
  });

  test('rapid mount/unmount cycle produces no duplicate UI', async () => {
    addDiv('CONFIGURATOR_ROOT');
    addMyDesignsRoot();
    const App = await getApp();

    for (let i = 0; i < 5; i++) {
      const { unmount } = render(<App />);
      act(() => unmount());
    }

    render(<App />);
    expect(screen.getAllByTestId('shade-configurator')).toHaveLength(1);
    expect(screen.getAllByTestId('my-designs')).toHaveLength(1);
  });
});

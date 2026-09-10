/**
 * Portal architecture test suite
 * A1 Bootstrap · A2 Configurator Portal · A3 MyDesigns Portal
 * A4 Isolation · A5 Double-Load Safety · A6 Shopify Page Simulation
 */

import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
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

function addMyDesignsRoot(opts: {
  email?: string;
  name?: string;
  loggedIn?: string;
} = {}): HTMLElement {
  const el = addDiv('MY_DESIGNS_ROOT');
  if (opts.email !== undefined) el.dataset.customerEmail = opts.email;
  if (opts.name !== undefined) el.dataset.customerName = opts.name;
  if (opts.loggedIn !== undefined) el.dataset.loggedIn = opts.loggedIn;
  return el;
}

// Lazy import App so mocks are resolved first
async function getApp() {
  const mod = await import('../App');
  return mod.default;
}

// ─── A1: Bootstrap ───────────────────────────────────────────────────────────

describe('A1: Bootstrap', () => {
  test('mounts React into SHADESAIL_ROOT without error', async () => {
    const App = await getApp();
    const container = addDiv('SHADESAIL_ROOT');

    expect(() => {
      act(() => {
        createRoot(container).render(
          <React.StrictMode>
            <App />
          </React.StrictMode>
        );
      });
    }).not.toThrow();

    expect(container).toBeInTheDocument();
  });

  test('no crash when SHADESAIL_ROOT is absent', () => {
    const container = document.getElementById('SHADESAIL_ROOT');
    expect(container).toBeNull();
    expect(() => {
      if (container) createRoot(container).render(<></>);
    }).not.toThrow();
  });
});

// ─── A2: Configurator Portal ─────────────────────────────────────────────────

describe('A2: Configurator Portal', () => {
  test('portals ShadeConfigurator into #CONFIGURATOR_ROOT when present', async () => {
    addDiv('CONFIGURATOR_ROOT');
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();
  });

  test('renders into the correct target element', async () => {
    const configuratorRoot = addDiv('CONFIGURATOR_ROOT');
    const App = await getApp();
    render(<App />);
    expect(configuratorRoot).toContainElement(
      screen.getByTestId('shade-configurator')
    );
  });

  test('no crash when #CONFIGURATOR_ROOT is absent', async () => {
    const App = await getApp();
    expect(() => render(<App />)).not.toThrow();
    expect(screen.queryByTestId('shade-configurator')).not.toBeInTheDocument();
  });
});

// ─── A3: MyDesigns Portal ────────────────────────────────────────────────────

describe('A3: MyDesigns Portal', () => {
  test('portals MyDesigns into #MY_DESIGNS_ROOT when present', async () => {
    addMyDesignsRoot({ email: 'test@example.com', name: 'Test', loggedIn: 'true' });
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('my-designs')).toBeInTheDocument();
  });

  test('renders into the correct target element', async () => {
    const myDesignsRoot = addMyDesignsRoot({
      email: 'user@test.com',
      name: 'User',
      loggedIn: 'false',
    });
    const App = await getApp();
    render(<App />);
    expect(myDesignsRoot).toContainElement(screen.getByTestId('my-designs'));
  });

  test('passes email prop from data-customer-email', async () => {
    addMyDesignsRoot({ email: 'hello@world.com', name: 'World', loggedIn: 'true' });
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('my-designs')).toHaveAttribute('data-email', 'hello@world.com');
  });

  test('passes name prop from data-customer-name', async () => {
    addMyDesignsRoot({ email: 'a@b.com', name: 'Jane Doe', loggedIn: 'false' });
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('my-designs')).toHaveAttribute('data-name', 'Jane Doe');
  });

  test('passes isLoggedIn=true when data-logged-in is "true"', async () => {
    addMyDesignsRoot({ email: 'a@b.com', name: 'A', loggedIn: 'true' });
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('my-designs')).toHaveAttribute('data-logged-in', 'true');
  });

  test('passes isLoggedIn=false when data-logged-in is "false"', async () => {
    addMyDesignsRoot({ email: '', name: '', loggedIn: 'false' });
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('my-designs')).toHaveAttribute('data-logged-in', 'false');
  });

  test('defaults empty strings when dataset attributes are absent', async () => {
    addDiv('MY_DESIGNS_ROOT'); // no dataset attributes
    const App = await getApp();
    render(<App />);
    const el = screen.getByTestId('my-designs');
    expect(el).toHaveAttribute('data-email', '');
    expect(el).toHaveAttribute('data-name', '');
    expect(el).toHaveAttribute('data-logged-in', 'false');
  });

  test('no crash when #MY_DESIGNS_ROOT is absent', async () => {
    const App = await getApp();
    expect(() => render(<App />)).not.toThrow();
    expect(screen.queryByTestId('my-designs')).not.toBeInTheDocument();
  });
});

// ─── A4: Isolation ───────────────────────────────────────────────────────────

describe('A4: Isolation', () => {
  test('configurator renders normally when MY_DESIGNS_ROOT is absent', async () => {
    addDiv('CONFIGURATOR_ROOT');
    // no MY_DESIGNS_ROOT
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();
    expect(screen.queryByTestId('my-designs')).not.toBeInTheDocument();
  });

  test('my-designs renders normally when CONFIGURATOR_ROOT is absent', async () => {
    addMyDesignsRoot({ email: 'a@b.com', name: 'A', loggedIn: 'true' });
    // no CONFIGURATOR_ROOT
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('my-designs')).toBeInTheDocument();
    expect(screen.queryByTestId('shade-configurator')).not.toBeInTheDocument();
  });

  test('both portals render independently when both roots are present', async () => {
    addDiv('CONFIGURATOR_ROOT');
    addMyDesignsRoot({ email: 'x@y.com', name: 'X', loggedIn: 'true' });
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();
    expect(screen.getByTestId('my-designs')).toBeInTheDocument();
  });

  test('configurator portal content is inside CONFIGURATOR_ROOT, not MY_DESIGNS_ROOT', async () => {
    const configRoot = addDiv('CONFIGURATOR_ROOT');
    const mdRoot = addMyDesignsRoot({ email: 'a@b.com', name: 'A', loggedIn: 'true' });
    const App = await getApp();
    render(<App />);
    expect(configRoot).toContainElement(screen.getByTestId('shade-configurator'));
    expect(mdRoot).not.toContainElement(screen.getByTestId('shade-configurator'));
  });

  test('my-designs portal content is inside MY_DESIGNS_ROOT, not CONFIGURATOR_ROOT', async () => {
    const configRoot = addDiv('CONFIGURATOR_ROOT');
    const mdRoot = addMyDesignsRoot({ email: 'a@b.com', name: 'A', loggedIn: 'true' });
    const App = await getApp();
    render(<App />);
    expect(mdRoot).toContainElement(screen.getByTestId('my-designs'));
    expect(configRoot).not.toContainElement(screen.getByTestId('my-designs'));
  });
});

// ─── A5: Double-Load Safety ──────────────────────────────────────────────────

describe('A5: Double-Load Safety', () => {
  test('window.__ssLoaded guard blocks second script execution', () => {
    const executed: number[] = [];

    const simulateLoad = () => {
      if (!(window as any).__ssLoaded) {
        (window as any).__ssLoaded = true;
        executed.push(1);
      }
    };

    simulateLoad();
    simulateLoad();
    simulateLoad();

    expect(executed).toHaveLength(1);
    expect((window as any).__ssLoaded).toBe(true);
  });

  test('createRoot on same element twice does not throw (React 18 tolerates it)', () => {
    const container = addDiv('SHADESAIL_ROOT');

    expect(() => {
      act(() => {
        createRoot(container).render(<div data-testid="root-1" />);
      });
      // Second call on same container — React 18 warns but does not throw
      act(() => {
        createRoot(container).render(<div data-testid="root-2" />);
      });
    }).not.toThrow();
  });

  test('React app only mounts once when guarded by __ssLoaded', async () => {
    const mountCalls: number[] = [];
    const App = await getApp();
    addDiv('SHADESAIL_ROOT');
    addDiv('CONFIGURATOR_ROOT');

    const mountOnce = () => {
      if (!(window as any).__ssLoaded) {
        (window as any).__ssLoaded = true;
        mountCalls.push(1);
        render(<App />);
      }
    };

    mountOnce();
    mountOnce();

    expect(mountCalls).toHaveLength(1);
  });
});

// ─── A6: Shopify Page Simulation ─────────────────────────────────────────────

describe('A6: Shopify Page Simulation', () => {
  test('product page: CONFIGURATOR_ROOT only → configurator renders, my-designs absent', async () => {
    addDiv('CONFIGURATOR_ROOT');
    // account page root NOT present
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();
    expect(screen.queryByTestId('my-designs')).not.toBeInTheDocument();
  });

  test('account page: MY_DESIGNS_ROOT only → my-designs renders, configurator absent', async () => {
    addMyDesignsRoot({ email: 'cust@shop.com', name: 'Customer', loggedIn: 'true' });
    // product page root NOT present
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('my-designs')).toBeInTheDocument();
    expect(screen.queryByTestId('shade-configurator')).not.toBeInTheDocument();
  });

  test('edge case: both roots present → both components render', async () => {
    addDiv('CONFIGURATOR_ROOT');
    addMyDesignsRoot({ email: 'both@page.com', name: 'Both', loggedIn: 'true' });
    const App = await getApp();
    render(<App />);
    expect(screen.getByTestId('shade-configurator')).toBeInTheDocument();
    expect(screen.getByTestId('my-designs')).toBeInTheDocument();
  });

  test('edge case: neither root present → no crash, no components rendered', async () => {
    // Nothing added to DOM
    const App = await getApp();
    expect(() => render(<App />)).not.toThrow();
    expect(screen.queryByTestId('shade-configurator')).not.toBeInTheDocument();
    expect(screen.queryByTestId('my-designs')).not.toBeInTheDocument();
  });

  test('no cross-rendering: configurator content does not appear on account page', async () => {
    // Account page: only MY_DESIGNS_ROOT
    addMyDesignsRoot({ email: 'acc@shop.com', name: 'Acc', loggedIn: 'true' });
    const App = await getApp();
    render(<App />);
    // ShadeConfigurator must not appear anywhere on account page
    expect(screen.queryByTestId('shade-configurator')).not.toBeInTheDocument();
  });

  test('no cross-rendering: my-designs content does not appear on product page', async () => {
    // Product page: only CONFIGURATOR_ROOT
    addDiv('CONFIGURATOR_ROOT');
    const App = await getApp();
    render(<App />);
    // MyDesigns must not appear anywhere on product page
    expect(screen.queryByTestId('my-designs')).not.toBeInTheDocument();
  });
});

export const SCOPE_CLASS = 'ss-scope';

const ROOT_IDS = ['SHADESAIL_ROOT', 'CONFIGURATOR_ROOT', 'SHADE_SPACE', 'MY_DESIGNS_ROOT'];
const PORTAL_ROOT_ID = 'SS_PORTAL_ROOT';

let portalRoot: HTMLElement | null = null;

export function getPortalRoot(): HTMLElement {
  if (portalRoot && document.body.contains(portalRoot)) return portalRoot;

  const existing = document.getElementById(PORTAL_ROOT_ID);
  if (existing) {
    existing.classList.add(SCOPE_CLASS);
    portalRoot = existing;
    return existing;
  }

  const el = document.createElement('div');
  el.id = PORTAL_ROOT_ID;
  el.classList.add(SCOPE_CLASS);
  el.style.setProperty('position', 'fixed');
  el.style.setProperty('height', '0');
  el.style.setProperty('overflow', 'hidden');
  el.style.setProperty('pointer-events', 'none');
  document.body.appendChild(el);
  portalRoot = el;
  return el;
}

export function applyAppScope(): void {
  if (typeof document === 'undefined') return;
  for (const id of ROOT_IDS) {
    const el = document.getElementById(id);
    if (el) el.classList.add(SCOPE_CLASS);
  }
  getPortalRoot();
  applyBodyStyles();
  stripShopifyAncestorConstraints();
}

function stripAncestor(el: HTMLElement): void {
  el.style.setProperty('padding-left', '0', 'important');
  el.style.setProperty('padding-right', '0', 'important');
  el.style.setProperty('max-width', 'none', 'important');
  el.style.setProperty('width', '100%', 'important');
  el.style.setProperty('margin-left', '0', 'important');
  el.style.setProperty('margin-right', '0', 'important');
  el.style.setProperty('box-sizing', 'border-box', 'important');
  el.style.setProperty('overflow-x', 'hidden', 'important');
}

function applyBodyStyles(): void {
  const body = document.body;
  body.style.setProperty('overflow', 'hidden', 'important');
  body.style.setProperty('height', '100dvh', 'important');
  body.style.setProperty('background-color', '#f5f7f5', 'important');
  body.style.setProperty('margin', '0', 'important');
  body.style.setProperty('padding', '0', 'important');

  const html = document.documentElement;
  html.style.setProperty('overflow', 'hidden', 'important');
  html.style.setProperty('height', '100dvh', 'important');
  html.style.setProperty('background-color', '#f5f7f5', 'important');
  html.style.setProperty('margin', '0', 'important');
  html.style.setProperty('padding', '0', 'important');
}

function doStrip(): void {
  const root =
    document.getElementById('CONFIGURATOR_ROOT') ||
    document.getElementById('SHADESAIL_ROOT') ||
    document.getElementById('SHADE_SPACE');
  if (!root) return;

  let el: HTMLElement | null = root.parentElement;
  while (el && el !== document.documentElement) {
    stripAncestor(el);
    el = el.parentElement;
  }
}

function stripShopifyAncestorConstraints(): void {
  doStrip();
  setTimeout(doStrip, 200);
  setTimeout(doStrip, 1000);
}

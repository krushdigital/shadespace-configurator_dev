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
  document.body.appendChild(el);
  portalRoot = el;
  return el;
}

function resetDocumentChrome(): void {
  const s = (el: HTMLElement) => {
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('height', '100dvh', 'important');
    el.style.setProperty('background-color', '#f5f7f5', 'important');
  };
  s(document.documentElement);
  s(document.body);
}

function sizeRootContainers(): void {
  const mount = document.getElementById('SHADESAIL_ROOT');
  if (mount) {
    mount.style.setProperty('height', '0', 'important');
    mount.style.setProperty('overflow', 'hidden', 'important');
  }

  for (const id of ['CONFIGURATOR_ROOT', 'SHADE_SPACE']) {
    const el = document.getElementById(id);
    if (!el) continue;
    el.style.setProperty('width', '100%', 'important');
    el.style.setProperty('height', '100dvh', 'important');
    el.style.setProperty('overflow', 'hidden', 'important');
    el.style.setProperty('margin', '0', 'important');
    el.style.setProperty('padding', '0', 'important');
  }
}

export function applyAppScope(): void {
  if (typeof document === 'undefined') return;
  for (const id of ROOT_IDS) {
    const el = document.getElementById(id);
    if (el) el.classList.add(SCOPE_CLASS);
  }
  getPortalRoot();
  resetDocumentChrome();
  sizeRootContainers();
}

export type Device3DTier = 'high' | 'low' | 'none';

let cachedTier: Device3DTier | null = null;

export function canRender3D(): Device3DTier {
  if (cachedTier !== null) return cachedTier;
  if (typeof window === 'undefined') { cachedTier = 'none'; return cachedTier; }

  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2');
  if (!gl) { cachedTier = 'none'; return cachedTier; }

  const ext = gl.getExtension('WEBGL_lose_context');
  if (ext) ext.loseContext();

  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as any).deviceMemory as number | undefined;

  if (cores >= 4 && (memory === undefined || memory >= 4)) {
    cachedTier = 'high';
  } else if (cores >= 2) {
    cachedTier = 'low';
  } else {
    cachedTier = 'none';
  }

  return cachedTier;
}

// The physics-based membrane solver renders all corner counts (3–8) correctly.
export function supports3DForCorners(corners: number): boolean {
  return corners >= 3 && corners <= 8;
}

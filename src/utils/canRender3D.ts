export type Device3DTier = 'high' | 'low' | 'none';

export function canRender3D(): Device3DTier {
  if (typeof window === 'undefined') return 'none';

  // WebGL2 is required
  const testCanvas = document.createElement('canvas');
  const gl = testCanvas.getContext('webgl2');
  if (!gl) return 'none';

  const cores = navigator.hardwareConcurrency || 2;
  const memory = (navigator as any).deviceMemory as number | undefined;

  // High tier: 4+ cores, 4+ GB RAM (covers modern phones and tablets)
  if (cores >= 4 && (memory === undefined || memory >= 4)) {
    return 'high';
  }

  // Low tier: WebGL2 exists but weaker hardware
  if (cores >= 2) {
    return 'low';
  }

  return 'none';
}
